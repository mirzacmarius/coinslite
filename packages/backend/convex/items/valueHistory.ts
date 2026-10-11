import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
} from "../_generated/server";

/**
 * The Market value history behind "Value over time" (items/valueOverTime.ts):
 * a point each time an Item's Market value or Quantity changes, so every past
 * month keeps the value and the pieces it had. Every write that changes them
 * records here.
 */

/** An Item's history, oldest first. */
export async function historyOf(ctx: QueryCtx, itemId: Id<"items">) {
  return await ctx.db
    .query("marketValueHistory")
    .withIndex("by_itemId_and_at", (q) => q.eq("itemId", itemId))
    .collect();
}

/** Notes an Item's Market value and Quantity as they are from now on. */
export async function recordValue(
  ctx: MutationCtx,
  itemId: Id<"items">,
  {
    ownerId,
    marketValue,
    quantity,
  }: Pick<Doc<"items">, "ownerId" | "marketValue" | "quantity">,
) {
  await ctx.db.insert("marketValueHistory", {
    ownerId,
    itemId,
    at: Date.now(),
    ...(marketValue !== undefined && { marketValue }),
    quantity,
  });
}

/** A new Item with a Market value starts its history. */
export async function recordNewItem(
  ctx: MutationCtx,
  itemId: Id<"items">,
  item: Pick<Doc<"items">, "ownerId" | "marketValue" | "quantity">,
) {
  if (item.marketValue !== undefined) await recordValue(ctx, itemId, item);
}

/** An edit records a point only when it changes the Market value or the Quantity. */
export async function recordIfChanged(
  ctx: MutationCtx,
  before: Doc<"items">,
  after: Pick<Doc<"items">, "marketValue" | "quantity">,
) {
  if (
    before.marketValue === after.marketValue &&
    before.quantity === after.quantity
  )
    return;
  await recordValue(ctx, before._id, { ownerId: before.ownerId, ...after });
}

/**
 * Selling some of an Item's pieces splits them off into `soldId`: the sold
 * copy takes `pieces` of every past point and the original keeps the rest,
 * so the months before the sale still add up to every piece. An original
 * without history (from before it was kept) gets its first points now,
 * dated when its pieces were added.
 */
export async function splitHistory(
  ctx: MutationCtx,
  original: Doc<"items">,
  soldId: Id<"items">,
  pieces: number,
) {
  const history = await historyOf(ctx, original._id);
  if (history.length === 0) {
    if (original.marketValue === undefined) return;
    const at = original.addedAt ?? original._creationTime;
    const point = {
      ownerId: original.ownerId,
      at,
      marketValue: original.marketValue,
    };
    await ctx.db.insert("marketValueHistory", {
      ...point,
      itemId: original._id,
      quantity: original.quantity - pieces,
    });
    await ctx.db.insert("marketValueHistory", {
      ...point,
      itemId: soldId,
      quantity: pieces,
    });
    return;
  }
  for (const { _id, _creationTime, itemId, quantity, ...point } of history) {
    const split = Math.min(pieces, quantity);
    await ctx.db.insert("marketValueHistory", {
      ...point,
      itemId: soldId,
      quantity: split,
    });
    await ctx.db.patch(_id, { quantity: quantity - split });
  }
}

/** Deletes an Item's history with it (items/deletion.ts). */
export async function deleteHistory(ctx: MutationCtx, itemId: Id<"items">) {
  for (const point of await historyOf(ctx, itemId))
    await ctx.db.delete(point._id);
}

/** Items one backfill batch reads. */
const backfillBatch = 200;

/**
 * The one-off backfill for Items from before history was kept: each with a
 * Market value and no history gets one point, dated when its pieces were
 * added, with its current Market value and Quantity. Works through every
 * Item a batch at a time, each batch scheduling the next; running it again
 * changes nothing. Run once per deployment:
 * `npx convex run items/valueHistory:backfill` (add `--prod` for production).
 */
export const backfill = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const items = await ctx.db
      .query("items")
      .paginate({ cursor: cursor ?? null, numItems: backfillBatch });
    for (const item of items.page) {
      if (item.marketValue === undefined) continue;
      const kept = await ctx.db
        .query("marketValueHistory")
        .withIndex("by_itemId_and_at", (q) => q.eq("itemId", item._id))
        .first();
      if (kept) continue;
      await ctx.db.insert("marketValueHistory", {
        ownerId: item.ownerId,
        itemId: item._id,
        at: item.addedAt ?? item._creationTime,
        marketValue: item.marketValue,
        quantity: item.quantity,
      });
    }
    if (!items.isDone)
      await ctx.scheduler.runAfter(0, internal.items.valueHistory.backfill, {
        cursor: items.continueCursor,
      });
    return null;
  },
});
