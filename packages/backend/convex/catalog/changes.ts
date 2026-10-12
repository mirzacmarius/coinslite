import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
} from "../_generated/server";
import { wantsOfEntry } from "../wants";
import { nodeByKey } from "./browse";
import { changeBlocks, planDeletionBatch } from "./changeRules";
import { denominationCountChanges } from "./denominationCounts";
import { type CatalogItemType, catalogLimits } from "./fields";
import {
  countLinkedItems,
  detachLinkedItems,
  linkedItemsOf,
  retypeLinkedItems,
} from "./linkedItems";
import { slimEntryChanges } from "./slimEntries";

/**
 * Catalog changes that reach any number of Items, run a batch per
 * transaction as Album and account deletion are: deleting a node with
 * everything below it, and giving an entry's linked Items its new Item
 * type. The first batch runs in the write that starts the change, so a
 * small one is done at once; a larger one records itself in
 * `catalogChanges` and goes on in the background, each batch scheduling the
 * next (changeRules.ts plans each one). While it runs, the editor shows it
 * and no Catalog save, import or delete may touch the node or anything
 * below it, or move a node above it (`changeBlocks`). Should a batch ever
 * stop for good, running `catalog/changes:continueChange` with the change's
 * id goes on: a deletion from where it stopped, an Item type change from
 * its first Item.
 */

export const changeLimits = {
  /** Items detached or retyped, wants cleared and nodes deleted per transaction. */
  batch: 500,
  /** Changes a CSV import checks its rows against; with more running, it waits. */
  checked: 5000,
} as const;

/** The nodes below the node at `path`, root first. */
const nodesBelow = (ctx: QueryCtx, path: string) =>
  ctx.db
    .query("catalogNodes")
    .withIndex("by_path", (q) =>
      q.gt("path", `${path}/`).lt("path", `${path}0`),
    );

const continueLater = (
  ctx: MutationCtx,
  changeId: Id<"catalogChanges">,
  after?: number,
) =>
  ctx.scheduler.runAfter(0, internal.catalog.changes.continueChange, {
    changeId,
    ...(after !== undefined && { after }),
  });

/**
 * Deleting nodes keeps what the tree holds about them in step, as every
 * Catalog write does (catalog/tree.ts): their uploaded images and slim
 * entries go, and the entry counts above them and the denomination counts
 * they're in drop. Gathered over a batch and stored once at its end.
 */
function nodeRemovals() {
  const denominationCounts = denominationCountChanges();
  const slimEntries = slimEntryChanges();
  /** Entries leaving from below each node, by key. */
  const entriesLeaving = new Map<string, number>();
  return {
    async remove(ctx: MutationCtx, node: Doc<"catalogNodes">) {
      denominationCounts.count(node, -1);
      slimEntries.note(node._id, node, null);
      if (node.imageFiles) {
        await ctx.storage.delete(node.imageFiles.full);
        await ctx.storage.delete(node.imageFiles.thumbnail);
      }
      await ctx.db.delete("catalogNodes", node._id);
      if (node.kind !== "entry") return;
      for (const key of node.path.split("/").slice(0, -1))
        entriesLeaving.set(key, (entriesLeaving.get(key) ?? 0) + 1);
    },
    async store(ctx: MutationCtx) {
      await denominationCounts.store(ctx);
      await slimEntries.store(ctx);
      for (const [key, entries] of entriesLeaving) {
        // Gone too when it was deleted in the same batch.
        const above = await nodeByKey(ctx, key);
        if (!above || above.kind === "entry") continue;
        await ctx.db.patch("catalogNodes", above._id, {
          entryCount: Math.max(0, (above.entryCount ?? 0) - entries),
        });
      }
    },
  };
}

/**
 * One batch of deleting the node `nodeId` and everything below it, the
 * deepest nodes first and the node itself last. Each entry's Items take
 * its facts as their own and its wants are cleared before it goes.
 * Whether it's all gone.
 */
async function deleteBatch(
  ctx: MutationCtx,
  nodeId: Id<"catalogNodes">,
  budget: number,
) {
  const root = await ctx.db.get("catalogNodes", nodeId);
  if (!root) return true;

  // What's left, in the order it goes, until the batch is full: each
  // entry's Items and wants are read up to one past what the batch can
  // still take, so the plan knows whether any are left.
  const read = new Map<
    Id<"catalogNodes">,
    { node: Doc<"catalogNodes">; items: Doc<"items">[]; wants: Doc<"wants">[] }
  >();
  let counted = 0;
  const readNode = async (node: Doc<"catalogNodes">) => {
    const room = () => Math.max(0, budget - counted) + 1;
    const isEntry = node.kind === "entry";
    const items = isEntry
      ? await linkedItemsOf(ctx, node._id).take(room())
      : [];
    counted += items.length;
    const wants = isEntry ? await wantsOfEntry(ctx, node._id).take(room()) : [];
    counted += wants.length + 1;
    read.set(node._id, { node, items, wants });
  };
  for await (const node of nodesBelow(ctx, root.path).order("desc")) {
    if (counted >= budget) break;
    await readNode(node);
  }
  const complete = counted < budget;
  if (complete) await readNode(root);

  const { steps, done } = planDeletionBatch(
    [...read.values()].map(({ node, items, wants }) => ({
      id: node._id,
      linkedItems: items.length,
      wants: wants.length,
    })),
    { complete, budget },
  );
  const removals = nodeRemovals();
  for (const step of steps) {
    const { node, items, wants } = read.get(step.id) as NonNullable<
      ReturnType<typeof read.get>
    >;
    await detachLinkedItems(ctx, node, items.slice(0, step.detach));
    for (const want of wants.slice(0, step.clearWants))
      await ctx.db.delete("wants", want._id);
    if (step.remove) await removals.remove(ctx, node);
  }
  await removals.store(ctx);
  return done;
}

/**
 * Deletes a node and everything below it: at once when it's small, else
 * the first batch now and the rest in the background. Items linked to
 * entries there keep those entries' facts as their own, so nobody's Item
 * loses a fact, and the wants of those entries go. Whether it's all gone.
 * The caller makes sure no change is running around the node
 * (`changeAround`).
 */
export async function startDeletion(
  ctx: MutationCtx,
  node: Doc<"catalogNodes">,
) {
  const done = await deleteBatch(ctx, node._id, changeLimits.batch);
  if (!done) {
    const changeId = await ctx.db.insert("catalogChanges", {
      nodeId: node._id,
      path: node.path,
      kind: "delete",
    });
    await continueLater(ctx, changeId);
  }
  return done;
}

/**
 * Gives the Items linked to an entry, now at `path`, the entry's new Item
 * type: as many as `budget` allows now, the rest in the background. Returns
 * how much of the budget it used.
 */
export async function startRetype(
  ctx: MutationCtx,
  entry: { id: Id<"catalogNodes">; path: string },
  itemType: CatalogItemType,
  budget: number,
) {
  const { done, after, used } =
    budget > 0
      ? await retypeLinkedItems(ctx, entry.id, itemType, { budget })
      : { done: false, after: undefined, used: 0 };
  if (!done) {
    const changeId = await ctx.db.insert("catalogChanges", {
      nodeId: entry.id,
      path: entry.path,
      kind: "retype",
      itemType,
    });
    await continueLater(ctx, changeId, after);
  }
  return used;
}

/** Runs the next batch of a change in the background, and the one after it until it's done. */
export const continueChange = internalMutation({
  args: {
    changeId: v.id("catalogChanges"),
    /** For a "retype": the Item added last the batch before read, if any. */
    after: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { changeId, after }) => {
    const change = await ctx.db.get("catalogChanges", changeId);
    if (!change) return null;
    let done: boolean;
    let next: number | undefined;
    if (change.kind === "delete") {
      done = await deleteBatch(ctx, change.nodeId, changeLimits.batch);
    } else {
      const entry = await ctx.db.get("catalogNodes", change.nodeId);
      const retyped =
        entry?.kind === "entry" && change.itemType !== undefined
          ? await retypeLinkedItems(ctx, entry._id, change.itemType, {
              after,
              budget: changeLimits.batch,
            })
          : { done: true, after: undefined };
      done = retyped.done;
      next = retyped.after;
    }
    if (done) await ctx.db.delete("catalogChanges", changeId);
    else await continueLater(ctx, changeId, next);
    return null;
  },
});

/** The paths of the node at `path` and the nodes above it, root first. */
const pathsUpTo = (path: string) =>
  path.split("/").map((_, index, keys) => keys.slice(0, index + 1).join("/"));

/** The change running at the node at `path` itself, if any. */
export const changeAt = (ctx: QueryCtx, path: string) =>
  ctx.db
    .query("catalogChanges")
    .withIndex("by_path", (q) => q.eq("path", path))
    .first();

/** The change running at the node at `path` or above it, which the node is part of; null when none is. */
export async function changeOver(ctx: QueryCtx, path: string) {
  for (const each of pathsUpTo(path)) {
    const change = await changeAt(ctx, each);
    if (change) return change;
  }
  return null;
}

/** A change running at the node at `path`, above it or below it, which keeps it from being deleted; null when none is. */
export async function changeAround(ctx: QueryCtx, path: string) {
  return (
    (await changeOver(ctx, path)) ??
    (await ctx.db
      .query("catalogChanges")
      .withIndex("by_path", (q) =>
        q.gt("path", `${path}/`).lt("path", `${path}0`),
      )
      .first())
  );
}

/**
 * The changes running, for checking many writes against them at once
 * (`changeBlocks`); null when more run than `changeLimits.checked`, and
 * every write waits.
 */
export async function changesRunning(ctx: QueryCtx) {
  const changes = await ctx.db
    .query("catalogChanges")
    .take(changeLimits.checked + 1);
  return changes.length > changeLimits.checked ? null : changes;
}

/** Whether a running change keeps a write from happening (`changeBlocks`). */
export const blockedByChanges = (
  changes: ReadonlyArray<Doc<"catalogChanges">> | null,
  write: { from?: string; to?: string },
) =>
  changes === null ||
  changes.some((change) => changeBlocks(change.path, write));

/** What deleting a node would take with it. */
export type Deletion = {
  /** The nodes below it, counted up to `catalogLimits.deleteNodes`. */
  nodesBelow: number;
  /** More nodes are below it than were counted. */
  moreNodesBelow: boolean;
  /** Items linked to it or to the entries below it, counted up to `catalogLimits.linkedItems`. */
  linkedItems: number;
  /** More Items link there than were counted. */
  moreLinkedItems: boolean;
};

/** Works out what deleting a node would take with it, without changing anything. */
export async function planDeletion(
  ctx: QueryCtx,
  node: Doc<"catalogNodes">,
): Promise<Deletion> {
  const below = await nodesBelow(ctx, node.path).take(
    catalogLimits.deleteNodes + 1,
  );
  let linkedItems = 0;
  for (const each of [node, ...below.slice(0, catalogLimits.deleteNodes)]) {
    if (each.kind !== "entry") continue;
    linkedItems += await countLinkedItems(
      ctx,
      each._id,
      catalogLimits.linkedItems - linkedItems,
    );
    if (linkedItems > catalogLimits.linkedItems) break;
  }
  return {
    nodesBelow: Math.min(below.length, catalogLimits.deleteNodes),
    moreNodesBelow: below.length > catalogLimits.deleteNodes,
    linkedItems: Math.min(linkedItems, catalogLimits.linkedItems),
    moreLinkedItems: linkedItems > catalogLimits.linkedItems,
  };
}
