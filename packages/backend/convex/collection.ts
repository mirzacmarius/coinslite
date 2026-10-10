import { defaultLocale } from "@coinslite/i18n";
import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  browseCollection,
  collectionView,
  findItems,
} from "./collection/browse";
import { bulkLimits } from "./items/bulkRules";
import schema from "./schema";
import { requireSetUpUser } from "./utils/auth";
import { gradingScale, homeCurrency, language } from "./utils/validators";

/**
 * One page of the signed-in person's Collection as a view shows it: searched,
 * filtered and sorted.
 */
export const browse = query({
  args: {
    view: collectionView,
    /** From 1. */
    page: v.number(),
    pageSize: v.union(v.literal(15), v.literal(25), v.literal(50)),
    /** The language country names are searched in; the person's own by default. */
    locale: v.optional(language),
  },
  returns: v.object({
    items: v.array(
      schema
        .doc("items")
        .extend({ thumbnailUrl: v.union(v.string(), v.null()) }),
    ),
    /** How many Items match the view, over all pages. */
    total: v.number(),
    /** The page shown: the one asked for, or the nearest that exists. */
    page: v.number(),
    pageCount: v.number(),
    /** How many Items the whole Collection holds. */
    collectionSize: v.number(),
    /** False when the Collection was too large to read whole (see browse.ts). */
    complete: v.boolean(),
    /** The currency Purchase prices and Market values are in. */
    currency: homeCurrency,
    /** The country origin compares against; null when the person has none. */
    ownCountry: v.union(v.string(), v.null()),
    /** How many Items each filter option would show. */
    options: v.object({
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
    }),
  }),
  handler: async (ctx, { locale, ...args }) => {
    const owner = await requireSetUpUser(ctx);
    const found = await browseCollection(ctx, owner, {
      ...args,
      locale: locale ?? owner.language ?? defaultLocale,
    });
    return { ...found, currency: owner.homeCurrency };
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
