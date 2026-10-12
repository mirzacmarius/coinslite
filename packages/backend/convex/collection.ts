import { type Locale, defaultLocale } from "@coinslite/i18n";
import { v } from "convex/values";
import { type QueryCtx, query } from "./_generated/server";
import {
  browsePage,
  collectionView,
  findItems,
  readForView,
} from "./collection/browse";
import type { CollectionView } from "./collection/view";
import { countFilterOptions } from "./collection/viewRules";
import { bulkLimits } from "./items/bulkRules";
import schema from "./schema";
import { requireSetUpUser } from "./utils/auth";
import { gradingScale, homeCurrency, language } from "./utils/validators";

const pageArgs = {
  view: collectionView,
  /** From 1. */
  page: v.number(),
  pageSize: v.union(v.literal(15), v.literal(25), v.literal(50)),
  /** The language country names are searched in; the person's own by default. */
  locale: v.optional(language),
};

const pageFields = {
  items: v.array(
    schema.doc("items").extend({ thumbnailUrl: v.union(v.string(), v.null()) }),
  ),
  /** How many Items match the view, over all pages. */
  total: v.number(),
  /** The page shown: the one asked for, or the nearest that exists. */
  page: v.number(),
  pageCount: v.number(),
  /** How many Items the whole Collection holds. */
  collectionSize: v.number(),
  /** How many of them are sold, for telling an empty default view from one whose Items are all sold. */
  soldCount: v.number(),
  /** False when the Collection was too large to read whole (see browse.ts). */
  complete: v.boolean(),
  /** The currency Purchase prices and Market values are in. */
  currency: homeCurrency,
  /** The view's Catalog entry, to name its filter; null without one or for a key that names none. */
  entry: v.union(v.null(), v.object({ key: v.string(), title: v.string() })),
  /** The country origin compares against; null when the person has none. */
  ownCountry: v.union(v.string(), v.null()),
};

/** How many Items each filter option would show (viewRules.ts filterCounts). */
const filterCountsResult = v.object({
  types: v.object({
    coin: v.number(),
    banknote: v.number(),
    stamp: v.number(),
    bullion: v.number(),
  }),
  origins: v.object({ own: v.number(), foreign: v.number() }),
  countries: v.array(v.object({ country: v.string(), count: v.number() })),
  denominations: v.array(
    v.object({ denomination: v.string(), count: v.number() }),
  ),
  grades: v.array(
    v.object({ gradingScale, grade: v.string(), count: v.number() }),
  ),
  albums: v.array(v.object({ albumId: v.id("albums"), count: v.number() })),
  withoutAlbum: v.number(),
  entry: v.number(),
  statuses: v.object({ owned: v.number(), sold: v.number() }),
});

/**
 * The signed-in person's Collection read for a view, with country names in
 * `locale` or else their own language.
 */
async function readOwnCollection(
  ctx: QueryCtx,
  view: CollectionView,
  locale: Locale | undefined,
) {
  const owner = await requireSetUpUser(ctx);
  const read = await readForView(
    ctx,
    owner,
    view,
    locale ?? owner.language ?? defaultLocale,
  );
  return { owner, read };
}

/**
 * One page of the signed-in person's Collection as a view shows it: searched,
 * filtered and sorted. The filter options' counts are `filterCounts`, read
 * only while the filters are open.
 */
export const page = query({
  args: pageArgs,
  returns: v.object(pageFields),
  handler: async (ctx, { view, page, pageSize, locale }) => {
    const { owner, read } = await readOwnCollection(ctx, view, locale);
    const found = await browsePage(ctx, read, { view, page, pageSize });
    return { ...found, currency: owner.homeCurrency };
  },
});

/** How many Items each of a view's filter options would show, while the filters are open. */
export const filterCounts = query({
  args: { view: collectionView, locale: v.optional(language) },
  returns: filterCountsResult,
  handler: async (ctx, { view, locale }) => {
    const { read } = await readOwnCollection(ctx, view, locale);
    return countFilterOptions(read.items, view, read.context);
  },
});

/**
 * `page` and `filterCounts` in one, as the Collection page read them before
 * they were split. Kept only for tabs opened before then: remove once those
 * have reloaded.
 */
export const browse = query({
  args: pageArgs,
  returns: v.object({ ...pageFields, options: filterCountsResult }),
  handler: async (ctx, { view, page, pageSize, locale }) => {
    const { owner, read } = await readOwnCollection(ctx, view, locale);
    const found = await browsePage(ctx, read, { view, page, pageSize });
    return {
      ...found,
      currency: owner.homeCurrency,
      options: countFilterOptions(read.items, view, read.context),
    };
  },
});

/**
 * The Items a view shows, in its order, for selecting all of them at once:
 * the first `bulkLimits.items`, each with its Album, and how many the view
 * holds in all.
 */
export const selectable = query({
  args: { view: collectionView, locale: v.optional(language) },
  returns: v.object({
    items: v.array(
      v.object({
        _id: v.id("items"),
        albumId: v.union(v.id("albums"), v.null()),
      }),
    ),
    total: v.number(),
  }),
  handler: async (ctx, { view, locale }) => {
    const owner = await requireSetUpUser(ctx);
    const { items } = await findItems(
      ctx,
      owner,
      view,
      locale ?? owner.language ?? defaultLocale,
    );
    return {
      items: items
        .slice(0, bulkLimits.items)
        .map((item) => ({ _id: item._id, albumId: item.albumId ?? null })),
      total: items.length,
    };
  },
});

const neighbour = v.union(
  v.null(),
  v.object({ _id: v.id("items"), title: v.string() }),
);

/**
 * The Items either side of one in a view, in the view's order across its
 * pages, for moving through it from the Item page: null on either end. Also
 * where the Item stands in the view (from 0) and how many the view shows,
 * so deleting it can go back to its page. Null when the view doesn't show
 * the Item. Reads what `page` reads, less the thumbnails.
 */
export const neighbours = query({
  args: {
    view: collectionView,
    itemId: v.string(),
    locale: v.optional(language),
  },
  returns: v.union(
    v.null(),
    v.object({
      previous: neighbour,
      next: neighbour,
      position: v.number(),
      total: v.number(),
    }),
  ),
  handler: async (ctx, { view, itemId, locale }) => {
    const owner = await requireSetUpUser(ctx);
    const { items } = await findItems(
      ctx,
      owner,
      view,
      locale ?? owner.language ?? defaultLocale,
    );
    const at = items.findIndex((item) => item._id === itemId);
    if (at === -1) return null;
    const near = (item: (typeof items)[number] | undefined) =>
      item ? { _id: item._id, title: item.title } : null;
    return {
      previous: near(items[at - 1]),
      next: near(items[at + 1]),
      position: at,
      total: items.length,
    };
  },
});
