import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { setProgress, setsOfEntries } from "./catalog/sets";
import { catalogVisibleTo } from "./featureFlags";
import { hasSidePhoto, needsAttention } from "./items/attention";
import { itemResolver } from "./items/resolve";
import { withThumbnail } from "./items/thumbnail";
import { OVERVIEW_PAGE_SIZE } from "./overview/pages";
import { requireSetUpUser } from "./utils/auth";
import { homeCurrency, itemType } from "./utils/validators";

/**
 * The Overview (spec 9). Its totals and value chart come from
 * collectionTotals.ts and its plan usage from `plans.usage`; this module
 * adds what only the Overview shows.
 */

/** How many of the most recently added Items the Overview shows. */
export const LATEST_ITEMS_SHOWN = 3;

const latestItem = v.object({
  _id: v.id("items"),
  type: itemType,
  title: v.string(),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  /** The small copy of the front photo, else of the back photo, else of the first more photo, else null (items/thumbnail.ts). */
  thumbnailUrl: v.union(v.string(), v.null()),
  /** Of one piece, in `currency`. */
  marketValue: v.optional(v.number()),
  quantity: v.number(),
  currency: homeCurrency,
});

/**
 * What the Overview shows of one Item. The only place this module reads an
 * Item's descriptive facts, so that an Item created from a Catalog entry can
 * show the entry's facts where it has no overrides (ADR 0001) by resolving
 * them here.
 */
async function latestItemOf(
  ctx: QueryCtx,
  stored: Doc<"items">,
  currency: typeof homeCurrency.type,
) {
  const item = await itemResolver(ctx).resolve(stored);
  const { thumbnailUrl } = await withThumbnail(ctx, item);
  return {
    _id: item._id,
    type: item.type,
    title: item.title,
    year: item.year,
    denomination: item.denomination,
    thumbnailUrl,
    marketValue: item.marketValue,
    quantity: item.quantity,
    currency,
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
    return Promise.all(
      items.map((item) => latestItemOf(ctx, item, owner.homeCurrency)),
    );
  },
});

/** Whether an Item has any photo; its more photos are looked at only without a side photo. */
async function hasPhoto(ctx: QueryCtx, item: Doc<"items">) {
  if (hasSidePhoto(item)) return true;
  const more = await ctx.db
    .query("itemPhotos")
    .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
    .first();
  return more !== null;
}

/**
 * What the Overview reads from one page of the signed-in person's owned
 * Items, as the only entry in `page`: how many lack a Market value, a photo
 * or a Grade (items/attention.ts), and the Sets of the Catalog entries they
 * hold (catalog/setProgress.ts; none while the Catalog is hidden from them).
 * Like the totals, the app reads page after page (`OVERVIEW_PAGE_SIZE`
 * Items each) and adds them up with `combineOverviewPages`
 * (overview/pages.ts), so a Collection of any size stays inside the read
 * limits.
 */
export const page = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      needsAttention: v.object({
        marketValue: v.number(),
        photo: v.number(),
        grade: v.number(),
      }),
      setProgress,
    }),
  ),
  handler: async (ctx, { paginationOpts }) => {
    const owner = await requireSetUpUser(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId_and_soldOn", (q) =>
        q.eq("ownerId", owner._id).eq("soldOn", undefined),
      )
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, OVERVIEW_PAGE_SIZE),
      });
    const attention = needsAttention(
      await Promise.all(
        items.page.map(async (item) => ({
          ...item,
          hasPhoto: await hasPhoto(ctx, item),
        })),
      ),
    );
    const entryIds = (await catalogVisibleTo(ctx, owner))
      ? new Set(items.page.flatMap((item) => item.catalogEntryId ?? []))
      : new Set<never>();
    const entries = await Promise.all(
      [...entryIds].map((id) => ctx.db.get("catalogNodes", id)),
    );
    // An entry gone from the Catalog is in no Set.
    const progress = await setsOfEntries(
      ctx,
      entries.filter(
        (entry): entry is Doc<"catalogNodes"> => entry?.kind === "entry",
      ),
    );
    return {
      ...items,
      page: [{ needsAttention: attention, setProgress: progress }],
    };
  },
});
