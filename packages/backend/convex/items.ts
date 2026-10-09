import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  mutation,
  query,
} from "./_generated/server";
import { deleteItem } from "./items/deletion";
import { checkItem } from "./items/rules";
import { requireSetUpUser } from "./utils/auth";
import { gradingScale, itemType, material, strike } from "./utils/validators";

/** Every field a person sets on an Item, as the Item form sends them. */
const itemFields = {
  type: itemType,
  title: v.string(),
  country: v.optional(v.string()),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  series: v.optional(v.string()),
  category: v.optional(v.string()),
  material: v.optional(material),
  materialNote: v.optional(v.string()),
  mintMark: v.optional(v.string()),
  ruler: v.optional(v.string()),
  mintage: v.optional(v.number()),
  diameter: v.optional(v.number()),
  thickness: v.optional(v.number()),
  numistaNumber: v.optional(v.number()),
  grade: v.optional(v.string()),
  gradingScale: v.optional(gradingScale),
  gradeNote: v.optional(v.string()),
  strike: v.optional(strike),
  quantity: v.optional(v.number()),
  purchasePrice: v.optional(v.number()),
  marketValue: v.optional(v.number()),
  purchaseDate: v.optional(v.string()),
  source: v.optional(v.string()),
  notes: v.optional(v.string()),
};
const fieldNames = Object.keys(itemFields) as Array<keyof typeof itemFields>;

export const itemNotFound = "ITEM_NOT_FOUND";

/** The latest allowed purchase date: tomorrow, so "today" anywhere on Earth is accepted. */
const latestPurchaseDate = () =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** One of the signed-in person's Items; anyone else's is reported as not found. */
export async function requireOwnItem(
  ctx: QueryCtx | MutationCtx,
  itemId: Id<"items">,
) {
  const owner = await requireSetUpUser(ctx);
  const item = await ctx.db.get(itemId);
  if (!item || item.ownerId !== owner._id) throw new ConvexError(itemNotFound);
  return item;
}

/** Adds an Item to the signed-in person's Collection. */
export const add = mutation({
  args: itemFields,
  returns: v.id("items"),
  handler: async (ctx, fields) => {
    const owner = await requireSetUpUser(ctx);
    return await ctx.db.insert("items", {
      ownerId: owner._id,
      ...checkItem(fields, latestPurchaseDate()),
    });
  },
});

/** Saves the whole Item form: a field left empty is cleared. */
export const update = mutation({
  args: { itemId: v.id("items"), ...itemFields },
  returns: v.null(),
  handler: async (ctx, { itemId, ...fields }) => {
    await requireOwnItem(ctx, itemId);
    const cleared = Object.fromEntries(
      fieldNames.map((name) => [name, undefined]),
    );
    await ctx.db.patch(itemId, {
      ...cleared,
      ...checkItem(fields, latestPurchaseDate()),
    });
    return null;
  },
});

/**
 * A new Item with everything the person set on an existing one, to record a
 * similar piece quickly. Only form fields are copied, so photos stay behind.
 */
export const duplicate = mutation({
  args: { itemId: v.id("items") },
  returns: v.id("items"),
  handler: async (ctx, { itemId }) => {
    const item = await requireOwnItem(ctx, itemId);
    const copy = Object.fromEntries(
      fieldNames.flatMap((name) =>
        item[name] === undefined ? [] : [[name, item[name]]],
      ),
    ) as Pick<Doc<"items">, "type" | "title" | "quantity">;
    return await ctx.db.insert("items", { ownerId: item.ownerId, ...copy });
  },
});

/** Deletes one of the signed-in person's Items, and its photos, for good. */
export const remove = mutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    await deleteItem(ctx, await requireOwnItem(ctx, itemId));
    return null;
  },
});

/**
 * The signed-in person's Items, newest first, a page at a time. Each comes
 * with its thumbnail: the front photo, else the back photo, else null.
 */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const owner = await requireSetUpUser(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
      .order("desc")
      .paginate(paginationOpts);
    const withThumbnail = async (item: Doc<"items">) => {
      const photo = item.frontPhoto ?? item.backPhoto;
      return {
        ...item,
        thumbnailUrl: photo ? await ctx.storage.getUrl(photo) : null,
      };
    };
    return { ...items, page: await Promise.all(items.page.map(withThumbnail)) };
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
