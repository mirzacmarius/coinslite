import type { HomeCurrency, Locale } from "@coinslite/i18n";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { attentionKinds } from "../items/attention";
import { catalogEntryByKey, itemResolver } from "../items/resolve";
import { tagKey, tagLimits } from "../items/tags";
import { withThumbnail } from "../items/thumbnail";
import { pageTotals } from "../items/totals";
import { gradingScale, itemType, material } from "../utils/validators";
import { type CollectionView, collectionSorts } from "./view";
import {
  type ViewContext,
  itemsInView,
  ownCountryOf,
  textKey,
} from "./viewRules";

/**
 * Browsing a Collection: reading it for a view (view.ts), then which Items
 * the view shows, in which order, a page at a time (viewRules.ts). The
 * Collection page and the Collection exports both go through here, so the
 * exports cover exactly what the page shows.
 */

/** A Collection view as a function argument; see view.ts. */
export const collectionView = v.object({
  search: v.optional(v.string()),
  type: v.optional(itemType),
  bullionOnly: v.optional(v.boolean()),
  origin: v.optional(v.union(v.literal("own"), v.literal("foreign"))),
  country: v.optional(v.string()),
  denomination: v.optional(v.string()),
  grade: v.optional(v.object({ gradingScale, grade: v.string() })),
  album: v.optional(v.string()),
  notInAlbum: v.optional(v.string()),
  entry: v.optional(v.string()),
  storage: v.optional(v.string()),
  tag: v.optional(v.string()),
  yearFrom: v.optional(v.number()),
  yearTo: v.optional(v.number()),
  material: v.optional(material),
  without: v.optional(
    v.union(...attentionKinds.map((kind) => v.literal(kind))),
  ),
  status: v.optional(v.literal("sold")),
  sort: v.optional(v.union(...collectionSorts.map((sort) => v.literal(sort)))),
});

type Item = Doc<"items">;

/**
 * How often reading a Collection checks what's left of the query's read
 * allowance, and how much it leaves for the rest of the query (the person,
 * thumbnails), in documents, bytes and lookups. An Item is at most a few
 * kilobytes, and the slim entry of the Catalog entry it may be linked to a
 * few hundred bytes; each Item linked to an entry not seen yet is one
 * lookup more, or two while the entry has no slim entry and is read whole,
 * so between two checks at most twice `readCheckEvery` lookups are made.
 */
const readCheckEvery = 50;
const documentsKept = 500;
const bytesKept = 2 * 1024 * 1024;
const lookupsKept = 2 * readCheckEvery + 100;

/** Whether the query still has more than it keeps back for the rest of it. */
export async function roomLeft(ctx: QueryCtx) {
  const { documentsRead, bytesRead, databaseQueries } =
    await ctx.meta.getTransactionMetrics();
  return (
    documentsRead.remaining >= documentsKept &&
    bytesRead.remaining >= bytesKept &&
    databaseQueries.remaining >= lookupsKept
  );
}

/**
 * Every Item in a person's Collection, as added, with its facts resolved
 * (items/resolve.ts) from the slim entries of the Catalog entries they link
 * to, never the entries' notes. A view needs them all to search, filter,
 * sort, count and number its pages, so this reads the owner's whole index
 * range once rather than page by page. A Free plan Collection is at most 50
 * Items; a Premium one of many thousands still fits in what one query may
 * read (32,000 documents, 16 MiB, 4,096 lookups), each slim entry read
 * once. Beyond that it stops before the limit and reports the Collection as
 * incomplete, rather than failing; exports refuse such a Collection.
 */
async function readCollection(ctx: QueryCtx, ownerId: Id<"users">) {
  const items: Item[] = [];
  const resolver = itemResolver(ctx);
  for await (const item of ctx.db
    .query("items")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))) {
    items.push(await resolver.resolve(item));
    if (items.length % readCheckEvery === 0 && !(await roomLeft(ctx)))
      return { items, complete: false };
  }
  return { items, complete: true };
}

/**
 * Which of a person's Items have more photos besides their sides, for the
 * view of Items without any photo: one range of their more photos rather
 * than a lookup per Item, read within what's left of the query's allowance
 * as `readCollection` reads Items.
 */
async function readMorePhotoItems(ctx: QueryCtx, ownerId: Id<"users">) {
  const itemIds = new Set<Id<"items">>();
  let read = 0;
  for await (const photo of ctx.db
    .query("itemPhotos")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))) {
    itemIds.add(photo.itemId);
    read += 1;
    if (read % readCheckEvery === 0 && !(await roomLeft(ctx)))
      return { itemIds, complete: false };
  }
  return { itemIds, complete: true };
}

/** The most places `readStoragePlaces` lists. */
export const storagePlaceLimit = 50;

/**
 * The places a person's Items are kept in (Kept in), most used first then A
 * to Z, for the Item form's suggestions. Places that differ only in
 * capitals, accents or spacing are one, written as first met. Read from as
 * much of the Collection as fits in what the query may read, checked as
 * `readCollection` checks; the Items' facts aren't needed, so nothing else
 * is read.
 */
export async function readStoragePlaces(ctx: QueryCtx, ownerId: Id<"users">) {
  const places = new Map<string, { place: string; count: number }>();
  let read = 0;
  for await (const item of ctx.db
    .query("items")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))) {
    if (item.storage !== undefined) {
      const key = textKey(item.storage);
      const found = places.get(key);
      if (found) found.count += 1;
      else places.set(key, { place: item.storage, count: 1 });
    }
    read += 1;
    if (read % readCheckEvery === 0 && !(await roomLeft(ctx))) break;
  }
  return [...places.values()]
    .sort((a, b) => b.count - a.count || a.place.localeCompare(b.place))
    .slice(0, storagePlaceLimit)
    .map(({ place }) => place);
}

/**
 * The tags on a person's Items, most used first then A to Z, for the Item
 * form and select mode to offer. Tags that differ only in capitals, accents
 * or spacing are one, written as first met. Read as `readStoragePlaces`
 * reads.
 */
export async function readTags(ctx: QueryCtx, ownerId: Id<"users">) {
  const tags = new Map<string, { tag: string; count: number }>();
  let read = 0;
  for await (const item of ctx.db
    .query("items")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))) {
    for (const tag of item.tags ?? []) {
      const key = tagKey(tag);
      const found = tags.get(key);
      if (found) found.count += 1;
      else tags.set(key, { tag, count: 1 });
    }
    read += 1;
    if (read % readCheckEvery === 0 && !(await roomLeft(ctx))) break;
  }
  return [...tags.values()]
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, tagLimits.offered)
    .map(({ tag }) => tag);
}

/** A person's Collection, read for a view. */
export type CollectionRead = {
  /** Every Item, as added, with its facts resolved. */
  items: Item[];
  /** False when the Collection was too large to read whole. */
  complete: boolean;
  /** What the view's filters and search compare the Items against. */
  context: ViewContext;
  /** The view's Catalog entry, to name its filter; null without one or for a key that names none. */
  entry: { key: string; title: string } | null;
};

/** Reads a person's whole Collection for a view, and what the view compares it against. */
export async function readForView(
  ctx: QueryCtx,
  owner: Doc<"users">,
  view: CollectionView,
  locale: Locale,
): Promise<CollectionRead> {
  const { items, complete } = await readCollection(ctx, owner._id);
  const entry =
    view.entry === undefined ? null : await catalogEntryByKey(ctx, view.entry);
  const morePhotos =
    view.without === "photo" ? await readMorePhotoItems(ctx, owner._id) : null;
  return {
    items,
    complete: complete && (morePhotos?.complete ?? true),
    context: {
      ownCountry: ownCountryOf(owner),
      entryId: entry?._id ?? null,
      locale,
      ...(morePhotos && { withMorePhotos: morePhotos.itemIds }),
    },
    entry: entry && { key: entry.key, title: entry.title },
  };
}

/**
 * The Items in a person's Collection that a view shows, in its order: for
 * selecting them all, moving through them from the Item page, and exports.
 */
export async function findItems(
  ctx: QueryCtx,
  owner: Doc<"users">,
  view: CollectionView,
  locale: Locale,
) {
  const { items, complete, context } = await readForView(
    ctx,
    owner,
    view,
    locale,
  );
  return {
    ownCountry: context.ownCountry,
    complete,
    items: itemsInView(items, view, context),
  };
}

/**
 * One page of the Items a view shows, numbered from 1, each with its list
 * thumbnail, how many there are in all, and their totals before any Spot
 * price (items/totals.ts pageTotals, in `currency`), which the app prices
 * as it does the whole Collection's. A page past either end shows the
 * nearest one.
 */
export async function browsePage(
  ctx: QueryCtx,
  { items: collection, complete, context, entry }: CollectionRead,
  {
    view,
    page,
    pageSize,
    currency,
  }: {
    view: CollectionView;
    page: number;
    pageSize: number;
    currency: HomeCurrency;
  },
) {
  const items = itemsInView(collection, view, context);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const shown = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (shown - 1) * pageSize;
  return {
    items: await Promise.all(
      items
        .slice(start, start + pageSize)
        .map((item) => withThumbnail(ctx, item)),
    ),
    total: items.length,
    page: shown,
    pageCount,
    collectionSize: collection.length,
    soldCount: collection.filter((item) => item.soldOn !== undefined).length,
    complete,
    entry,
    ownCountry: context.ownCountry,
    viewTotals: pageTotals(items, { currency }),
  };
}
