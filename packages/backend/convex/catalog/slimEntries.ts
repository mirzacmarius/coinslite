import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
} from "../_generated/server";
import {
  type SlimEntry,
  sameSlimEntry,
  slimEntryOf,
} from "../items/catalogFacts";
import type { CatalogKind } from "./fields";

/**
 * Slim entries (ADR 0008): each Catalog entry's key, title and the facts
 * Items take from it, kept beside the entry so resolving every Item in a
 * Collection (items/resolve.ts) never reads an entry's notes. A read model
 * of the entry, never edited on its own: every write to the tree
 * (catalog/tree.ts) gathers how its entries' slim entries change and stores
 * them at the end. An entry without one (before the backfill) is read
 * whole instead.
 */

/** A Catalog node as written, with what its slim entry is made from. */
type Written = SlimEntry & { kind: CatalogKind };

/** A Catalog entry's slim entry, and the entry it belongs to. */
export type FoundSlimEntry = { entryId: Id<"catalogNodes">; slim: SlimEntry };

const storedById = (ctx: QueryCtx, entryId: Id<"catalogNodes">) =>
  ctx.db
    .query("catalogSlimEntries")
    .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
    .unique();

/**
 * The slim entry of the Catalog entry with this id; null for any other
 * node, or none. One stored before slim entries existed is read whole.
 */
export async function slimEntryById(
  ctx: QueryCtx,
  entryId: Id<"catalogNodes">,
): Promise<FoundSlimEntry | null> {
  const stored = await storedById(ctx, entryId);
  if (stored) return { entryId, slim: stored };
  const node = await ctx.db.get("catalogNodes", entryId);
  const slim = node && slimEntryOf(node);
  return slim && { entryId, slim };
}

/**
 * Makes a node's stored slim entry `slim`: adds, replaces or removes it,
 * and leaves it alone when it already says the same, so a Collection
 * reading it isn't run again for an entry's notes or image.
 */
async function writeSlimEntry(
  ctx: MutationCtx,
  entryId: Id<"catalogNodes">,
  slim: SlimEntry | null,
) {
  const stored = await storedById(ctx, entryId);
  if (!slim) {
    if (stored) await ctx.db.delete("catalogSlimEntries", stored._id);
  } else if (!stored) {
    await ctx.db.insert("catalogSlimEntries", { entryId, ...slim });
  } else if (!sameSlimEntry(stored, slim)) {
    await ctx.db.replace("catalogSlimEntries", stored._id, {
      entryId,
      ...slim,
    });
  }
}

/**
 * What a write leaves of its transaction for the rest of it: lookups,
 * documents and bytes. Slim entries it has no room left for are stored by a
 * mutation of their own straight after (`refresh`).
 */
const queriesKept = 100;
const writesKept = 100;
const bytesKept = 1024 * 1024;

async function roomLeft(ctx: MutationCtx) {
  const { databaseQueries, documentsWritten, bytesWritten } =
    await ctx.meta.getTransactionMetrics();
  return (
    databaseQueries.remaining > queriesKept &&
    documentsWritten.remaining > writesKept &&
    bytesWritten.remaining > bytesKept
  );
}

/**
 * Gathers how a write to the tree changes its nodes' slim entries, then
 * stores them once. A new entry's is added without a lookup; the others
 * are looked up while the transaction has room, and any left are stored
 * straight after it. Nodes whose slim entry stays the same cost nothing.
 *
 * Until then a changed entry's Items show its old facts, and a new entry
 * is read whole. A removed entry's slim entry is never read meanwhile: it
 * is only read by id, for Items linked to the entry, and an entry leaves
 * the Catalog or stops being one only once no Item links to it.
 */
export function slimEntryChanges() {
  const changes = new Map<
    Id<"catalogNodes">,
    { slim: SlimEntry | null; inserted: boolean }
  >();
  return {
    /** A node was inserted (`before` null), replaced, or deleted (`after` null). */
    note(
      id: Id<"catalogNodes">,
      before: Written | null,
      after: Written | null,
    ) {
      const was = before && slimEntryOf(before);
      const slim = after && slimEntryOf(after);
      if (was === slim || (was && slim && sameSlimEntry(was, slim))) return;
      changes.set(id, { slim, inserted: before === null });
    },
    async store(ctx: MutationCtx) {
      const later: Id<"catalogNodes">[] = [];
      for (const [entryId, { slim, inserted }] of changes) {
        if (!(await roomLeft(ctx))) later.push(entryId);
        else if (inserted && slim)
          await ctx.db.insert("catalogSlimEntries", { entryId, ...slim });
        else await writeSlimEntry(ctx, entryId, slim);
      }
      if (later.length > 0)
        await ctx.scheduler.runAfter(0, internal.catalog.slimEntries.refresh, {
          entryIds: later,
        });
    },
  };
}

/**
 * Stores the slim entries of nodes a write to the tree had no room left
 * for, as the nodes are now, a batch per transaction.
 */
export const refresh = internalMutation({
  args: { entryIds: v.array(v.id("catalogNodes")) },
  returns: v.null(),
  handler: async (ctx, { entryIds }) => {
    let done = 0;
    for (const entryId of entryIds) {
      if (!(await roomLeft(ctx))) break;
      const node = await ctx.db.get("catalogNodes", entryId);
      await writeSlimEntry(ctx, entryId, node && slimEntryOf(node));
      done++;
    }
    if (done < entryIds.length)
      await ctx.scheduler.runAfter(0, internal.catalog.slimEntries.refresh, {
        entryIds: entryIds.slice(done),
      });
    return null;
  },
});

/** Entries one backfill transaction goes through at most. */
const backfillBatch = 500;
/** What a backfill transaction leaves of its read allowance: one more entry, however long its notes. */
const backfillBytesKept = 2 * 1024 * 1024;

/**
 * The one-off backfill for Catalog entries from before slim entries
 * existed: works through every entry in path order, a batch per
 * transaction, each scheduling the next, and stores its slim entry where
 * it's missing or says something else. Running it again changes nothing.
 * Run once per deployment: `npx convex run catalog/slimEntries:backfill`
 * (add `--prod` for production).
 */
export const backfill = internalMutation({
  args: { after: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { after }) => {
    let last: string | undefined;
    let more = false;
    let done = 0;
    for await (const entry of ctx.db
      .query("catalogNodes")
      .withIndex("by_kind_and_path", (q) =>
        after === undefined
          ? q.eq("kind", "entry")
          : q.eq("kind", "entry").gt("path", after),
      )) {
      const { bytesRead } = await ctx.meta.getTransactionMetrics();
      if (
        done === backfillBatch ||
        bytesRead.remaining < backfillBytesKept ||
        !(await roomLeft(ctx))
      ) {
        more = true;
        break;
      }
      await writeSlimEntry(ctx, entry._id, slimEntryOf(entry));
      last = entry.path;
      done++;
    }
    if (more && last !== undefined)
      await ctx.scheduler.runAfter(0, internal.catalog.slimEntries.backfill, {
        after: last,
      });
    return null;
  },
});
