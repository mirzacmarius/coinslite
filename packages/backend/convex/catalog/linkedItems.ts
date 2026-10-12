import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { countItemRetyped } from "../collectionCounts";
import { detachedFields } from "../items/catalogFacts";
import type { ItemType } from "../items/grades";
import { planRetypeBatch } from "./changeRules";

/**
 * What Catalog changes do to the Items linked to an entry (ADR 0001). Their
 * descriptive facts are read from the entry, so most corrections reach them
 * by themselves; these are the changes that have to touch the Items:
 * a new Item type, and the entry leaving the Catalog. Both run a batch at a
 * time (catalog/changes.ts), however many Items link to the entry.
 */

/** Everyone's Items linked to an entry, in the order they were added. */
export const linkedItemsOf = (
  ctx: QueryCtx,
  entryId: Id<"catalogNodes">,
  after?: number,
) =>
  ctx.db
    .query("items")
    .withIndex("by_catalogEntryId", (q) =>
      after === undefined
        ? q.eq("catalogEntryId", entryId)
        : q.eq("catalogEntryId", entryId).gte("_creationTime", after),
    );

/** How many Items link to an entry, counting no further than `limit` + 1. */
export async function countLinkedItems(
  ctx: QueryCtx,
  entryId: Id<"catalogNodes">,
  limit: number,
) {
  return (await linkedItemsOf(ctx, entryId).take(limit + 1)).length;
}

/** Whether any Item links to an entry. */
export async function hasLinkedItems(
  ctx: QueryCtx,
  entryId: Id<"catalogNodes">,
) {
  return (await linkedItemsOf(ctx, entryId).first()) !== null;
}

/**
 * Gives an entry's new Item type to the next `budget` Items linked to it,
 * from the one added at `after` on, dropping what each held that the type
 * has no place for, and keeps each owner's Collection counts right.
 * Returns where the next batch goes on from, whether none are left, and
 * how much of the budget it used.
 */
export async function retypeLinkedItems(
  ctx: MutationCtx,
  entryId: Id<"catalogNodes">,
  type: ItemType,
  { after, budget }: { after?: number; budget: number },
) {
  const items = await linkedItemsOf(ctx, entryId, after).take(budget + 1);
  const plan = planRetypeBatch(items, { type, budget });
  const byId = new Map(items.map((item) => [item._id, item]));
  for (const { id, fields } of plan.retype) {
    const item = byId.get(id) as Doc<"items">;
    await ctx.db.patch("items", id, fields);
    await countItemRetyped(ctx, item.ownerId, item.type, type);
  }
  return {
    after: plan.after ?? after,
    done: plan.done,
    used: Math.min(items.length, budget),
  };
}

/**
 * Before an entry leaves the Catalog: each of these Items linked to it
 * takes the entry's facts as its own and stops linking to it
 * (`detachedFields`), so nobody's Item loses a fact.
 */
export async function detachLinkedItems(
  ctx: MutationCtx,
  entry: Doc<"catalogNodes">,
  items: ReadonlyArray<Doc<"items">>,
) {
  for (const { _id, _creationTime, ...item } of items) {
    await ctx.db.patch("items", _id, detachedFields(item, entry));
  }
}
