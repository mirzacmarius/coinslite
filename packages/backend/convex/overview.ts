import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { itemResolver } from "./items/resolve";
import { withThumbnail } from "./items/thumbnail";
import { requireSetUpUser } from "./utils/auth";
import { itemType } from "./utils/validators";

/**
 * The Overview (spec 9). Its totals come from `collectionTotals.page` and its
 * plan usage from `plans.usage`; this module adds what only the Overview shows.
 */

/** How many of the most recently added Items the Overview shows. */
export const LATEST_ITEMS_SHOWN = 3;

const latestItem = v.object({
  _id: v.id("items"),
  type: itemType,
  title: v.string(),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  /** The small copy of the front photo, else of the back photo, else null (items/thumbnail.ts). */
  thumbnailUrl: v.union(v.string(), v.null()),
});

/**
 * What the Overview shows of one Item. The only place this module reads an
 * Item's descriptive facts, so that an Item created from a Catalog entry can
 * show the entry's facts where it has no overrides (ADR 0001) by resolving
 * them here.
 */
async function latestItemOf(ctx: QueryCtx, stored: Doc<"items">) {
  const item = await itemResolver(ctx).resolve(stored);
  const { thumbnailUrl } = await withThumbnail(ctx, item);
  return {
    _id: item._id,
    type: item.type,
    title: item.title,
    year: item.year,
    denomination: item.denomination,
    thumbnailUrl,
  };
}

/** The signed-in person's most recently added Items they still own, newest first. */
export const latestItems = query({
  args: {},
  returns: v.array(latestItem),
  handler: async (ctx) => {
    const owner = await requireSetUpUser(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId_and_soldOn", (q) =>
        q.eq("ownerId", owner._id).eq("soldOn", undefined),
      )
      .order("desc")
      .take(LATEST_ITEMS_SHOWN);
    return Promise.all(items.map((item) => latestItemOf(ctx, item)));
  },
});
