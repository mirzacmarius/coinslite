import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkItem } from "./items/rules";
import { requireSetUpUser } from "./utils/auth";
import { itemType } from "./utils/validators";

/** Adds an Item to the signed-in person's Collection. */
export const add = mutation({
  args: {
    type: itemType,
    title: v.string(),
    country: v.optional(v.string()),
    year: v.optional(v.number()),
    denomination: v.optional(v.string()),
    quantity: v.optional(v.number()),
    purchasePrice: v.optional(v.number()),
    marketValue: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("items"),
  handler: async (ctx, { type, ...fields }) => {
    const owner = await requireSetUpUser(ctx);
    // A day of slack, so a purchase made "today" anywhere on Earth is accepted.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return await ctx.db.insert("items", {
      ownerId: owner._id,
      type,
      ...checkItem(fields, tomorrow),
    });
  },
});

/** The signed-in person's Items, newest first, a page at a time. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const owner = await requireSetUpUser(ctx);
    return await ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
      .order("desc")
      .paginate(paginationOpts);
  },
});

/** One of the signed-in person's Items, with the currency its amounts are in; null if it isn't theirs. */
export const get = query({
  args: { itemId: v.string() },
  handler: async (ctx, { itemId }) => {
    const owner = await requireSetUpUser(ctx);
    const id = ctx.db.normalizeId("items", itemId);
    const item = id ? await ctx.db.get(id) : null;
    if (!item || item.ownerId !== owner._id) return null;
    return { ...item, currency: owner.homeCurrency };
  },
});
