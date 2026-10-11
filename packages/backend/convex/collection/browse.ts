import { type HomeCurrency, type Locale, formatCountry } from "@coinslite/i18n";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { compareDenominations } from "../items/denominations";
import { type GradingScale, gradeRank, gradingScaleIds } from "../items/grades";
import { itemResolver } from "../items/resolve";
import { withThumbnail } from "../items/thumbnail";
import { gradingScale, itemType } from "../utils/validators";
import {
  type CollectionSort,
  type CollectionView,
  collectionSorts,
  defaultSort,
  searchLimit,
  withoutAlbum,
} from "./view";

/**
 * Browsing a Collection: which Items a view (view.ts) shows, in which order,
 * a page at a time, and how many Items each filter option would show. The
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
  status: v.optional(v.literal("sold")),
  sort: v.optional(v.union(...collectionSorts.map((sort) => v.literal(sort)))),
});

type Item = Doc<"items">;

/** Earlier in the list first: negative when `a` goes before `b`. */
type Order = (a: Item, b: Item) => number;

/** Compares two optional values, with missing ones last whatever the direction. */
function present<T>(
  value: (item: Item) => T | undefined,
  compare: (a: T, b: T) => number,
): Order {
  return (a, b) => {
    const first = value(a);
    const second = value(b);
    if (first === undefined) return second === undefined ? 0 : 1;
    if (second === undefined) return -1;
    return compare(first, second);
  };
}

const ascending = (a: number, b: number) => a - b;
const descending = (a: number, b: number) => b - a;

/** The first order that tells two Items apart decides. */
const inTurn =
  (...orders: Order[]): Order =>
  (a, b) => {
    for (const order of orders) {
      const result = order(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };

/**
 * Each sort, then by year, title and when the Item was added, so Items that
 * tie keep the same place from one page to the next.
 */
function orderFor(sort: CollectionSort, locale: Locale): Order {
  const titles = new Intl.Collator(locale, { sensitivity: "base" });
  const byYear = present((item) => item.year, ascending);
  const byTitle: Order = (a, b) => titles.compare(a.title, b.title);
  const added: Order = (a, b) => a._creationTime - b._creationTime;
  const primary: Record<CollectionSort, Order> = {
    year: byYear,
    newest: (a, b) => -added(a, b),
    oldest: added,
    price: present((item) => item.purchasePrice, descending),
    denomination: (a, b) =>
      compareDenominations(a.denomination, b.denomination),
    grade: present(
      (item) =>
        item.gradingScale && item.grade !== undefined
          ? gradeRank(item.gradingScale, item.grade)
          : undefined,
      descending,
    ),
  };
  return inTurn(primary[sort], byYear, byTitle, added);
}

/** Lower case without accents, so "ore" finds "Öre". */
const folded = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** A country's name in `locale`; its code where names aren't available. */
export function countryName(code: string, locale: Locale) {
  try {
    return formatCountry(code, locale);
  } catch {
    return code;
  }
}

/**
 * Whether an Item has every searched word in its title, its denomination or
 * its country's name, or a word is its country's code ("us").
 */
function searchFor(search: string | undefined, locale: Locale) {
  const words = folded(search?.slice(0, searchLimit) ?? "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return () => true;
  const names = new Map<string, string>();
  const nameOf = (code: string) => {
    let name = names.get(code);
    if (name === undefined) {
      name = folded(countryName(code, locale));
      names.set(code, name);
    }
    return name;
  };
  return (item: Item) => {
    const text = [item.title, item.denomination ?? ""].map(folded);
    if (item.country) text.push(nameOf(item.country));
    const code = item.country?.toLowerCase();
    return words.every(
      (word) => word === code || text.some((field) => field.includes(word)),
    );
  };
}

/** Denominations that differ only in capitals, accents or spacing are one. */
const denominationKey = (denomination: string) =>
  folded(denomination).trim().replace(/\s+/g, " ");

/** The country each Home currency belongs to; the euro has many. */
const currencyCountries: Record<HomeCurrency, string | null> = {
  NOK: "NO",
  SEK: "SE",
  DKK: "DK",
  EUR: null,
  RON: "RO",
  GBP: "GB",
  USD: "US",
  CHF: "CH",
};

/**
 * The person's own country, for telling their Items from foreign ones: the
 * country in their address, else their Home currency's. Null for a euro
 * Home currency without an address.
 */
export function ownCountryOf(user: Doc<"users">): string | null {
  return (
    user.country ??
    (user.homeCurrency ? currencyCountries[user.homeCurrency] : null)
  );
}

/** The ways a view narrows the Collection, besides search. */
const dimensions = [
  "type",
  "origin",
  "country",
  "denomination",
  "grade",
  "album",
  "status",
] as const;
type Dimension = (typeof dimensions)[number];

/** Each dimension's filter: true when the Item passes, or when it isn't set. */
function filtersFor(
  view: CollectionView,
  ownCountry: string | null,
): Record<Dimension, Matcher> {
  const all = () => true;
  const country = view.country?.toUpperCase();
  const denomination =
    view.denomination === undefined
      ? undefined
      : denominationKey(view.denomination);
  const grade = view.grade;
  return {
    type: (item) =>
      (view.type === undefined || item.type === view.type) &&
      (!view.bullionOnly || (item.type === "coin" && item.bullion === true)),
    // Without an own country there's nothing to tell apart.
    origin:
      view.origin === undefined || ownCountry === null
        ? all
        : (item) =>
            item.country !== undefined &&
            (item.country === ownCountry) === (view.origin === "own"),
    country: (item) => country === undefined || item.country === country,
    denomination: (item) =>
      denomination === undefined ||
      (item.denomination !== undefined &&
        denominationKey(item.denomination) === denomination),
    grade: (item) =>
      grade === undefined ||
      (item.gradingScale === grade.gradingScale && item.grade === grade.grade),
    album: (item) =>
      (view.album === undefined ||
        (view.album === withoutAlbum
          ? item.albumId === undefined
          : item.albumId === view.album)) &&
      (view.notInAlbum === undefined || item.albumId !== view.notInAlbum),
    status: (item) => (item.soldOn !== undefined) === (view.status === "sold"),
  };
}

type Matcher = (item: Item) => boolean;

/** Where a Grading scale's Grades go among the filter's options. */
const scaleOrder = new Map(
  gradingScaleIds.map((scale, index) => [scale, index]),
);

/**
 * How many Items each filter option would show: those the search and every
 * other filter let through, so picking an option shows exactly its count.
 */
function countOptions(
  items: Item[],
  searched: Matcher,
  filters: Record<Dimension, Matcher>,
  ownCountry: string | null,
) {
  const types = { coin: 0, banknote: 0, stamp: 0, bullion: 0 };
  const origins = { own: 0, foreign: 0 };
  const countries = new Map<string, number>();
  const denominations = new Map<
    string,
    { denomination: string; count: number }
  >();
  const grades = new Map<
    string,
    { gradingScale: GradingScale; grade: string; count: number }
  >();
  const albums = new Map<Id<"albums">, number>();
  let withoutAlbums = 0;
  const statuses = { owned: 0, sold: 0 };
  const add = <K>(counts: Map<K, number>, key: K) =>
    counts.set(key, (counts.get(key) ?? 0) + 1);

  for (const item of items) {
    if (!searched(item)) continue;
    const failed = dimensions.filter((dimension) => !filters[dimension](item));
    // An Item counts for a dimension when only that dimension's filter, if
    // any, keeps it out.
    if (failed.length > 1) continue;
    const counts = (dimension: Dimension) =>
      failed.length === 0 || failed[0] === dimension;

    if (counts("type")) {
      types[item.type] += 1;
      if (item.type === "coin" && item.bullion) types.bullion += 1;
    }
    if (counts("origin") && ownCountry !== null && item.country)
      origins[item.country === ownCountry ? "own" : "foreign"] += 1;
    if (counts("country") && item.country) add(countries, item.country);
    if (counts("denomination") && item.denomination) {
      const key = denominationKey(item.denomination);
      const option = denominations.get(key);
      if (option) option.count += 1;
      else
        denominations.set(key, {
          denomination: item.denomination,
          count: 1,
        });
    }
    if (counts("grade") && item.gradingScale && item.grade !== undefined) {
      const key = `${item.gradingScale}:${item.grade}`;
      const option = grades.get(key);
      if (option) option.count += 1;
      else
        grades.set(key, {
          gradingScale: item.gradingScale,
          grade: item.grade,
          count: 1,
        });
    }
    if (counts("album")) {
      if (item.albumId === undefined) withoutAlbums += 1;
      else add(albums, item.albumId);
    }
    if (counts("status"))
      statuses[item.soldOn === undefined ? "owned" : "sold"] += 1;
  }

  const byCount = (a: { count: number }, b: { count: number }) =>
    b.count - a.count;
  return {
    types,
    origins,
    countries: [...countries]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => byCount(a, b) || a.country.localeCompare(b.country)),
    denominations: [...denominations.values()].sort((a, b) =>
      compareDenominations(a.denomination, b.denomination),
    ),
    grades: [...grades.values()].sort(
      (a, b) =>
        (scaleOrder.get(a.gradingScale) ?? 0) -
          (scaleOrder.get(b.gradingScale) ?? 0) ||
        gradeRank(b.gradingScale, b.grade) - gradeRank(a.gradingScale, a.grade),
    ),
    albums: [...albums]
      .map(([albumId, count]) => ({ albumId, count }))
      .sort(byCount),
    withoutAlbum: withoutAlbums,
    statuses,
  };
}

/**
 * How often reading a Collection checks what's left of the query's read
 * allowance, and how much it leaves for the rest of the query (the person,
 * thumbnails), in documents, bytes and lookups. An Item is at most a few
 * kilobytes, and so is the Catalog entry it may be linked to; each Item
 * linked to an entry not seen yet is one lookup more, so between two checks
 * at most `readCheckEvery` lookups are made.
 */
const readCheckEvery = 100;
const documentsKept = 500;
const bytesKept = 2 * 1024 * 1024;
const lookupsKept = readCheckEvery + 100;

/**
 * Every Item in a person's Collection, as added, with its facts resolved
 * (items/resolve.ts). A view needs them all to search, filter, sort, count
 * and number its pages, so this reads the owner's whole index range once
 * rather than page by page. A Free plan Collection is at most 50 Items; a
 * Premium one of many thousands still fits in what one query may read
 * (32,000 documents, 16 MiB, 4,096 lookups), each Catalog entry read once.
 * Beyond that it stops before the limit and reports the Collection as
 * incomplete, rather than failing; exports refuse such a Collection.
 */
async function readCollection(ctx: QueryCtx, ownerId: Id<"users">) {
  const items: Item[] = [];
  const resolver = itemResolver(ctx);
  for await (const item of ctx.db
    .query("items")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))) {
    items.push(await resolver.resolve(item));
    if (items.length % readCheckEvery === 0) {
      const { documentsRead, bytesRead, databaseQueries } =
        await ctx.meta.getTransactionMetrics();
      if (
        documentsRead.remaining < documentsKept ||
        bytesRead.remaining < bytesKept ||
        databaseQueries.remaining < lookupsKept
      )
        return { items, complete: false };
    }
  }
  return { items, complete: true };
}

/**
 * Finds the Items in a person's Collection that the view shows, in its
 * order, and how many Items each filter option would show.
 */
export async function findItems(
  ctx: QueryCtx,
  owner: Doc<"users">,
  view: CollectionView,
  locale: Locale,
) {
  const { items, complete } = await readCollection(ctx, owner._id);
  const searched = searchFor(view.search, locale);
  const ownCountry = ownCountryOf(owner);
  const filters = filtersFor(view, ownCountry);
  return {
    ownCountry,
    collectionSize: items.length,
    complete,
    items: items
      .filter(
        (item) =>
          searched(item) &&
          dimensions.every((dimension) => filters[dimension](item)),
      )
      .sort(orderFor(view.sort ?? defaultSort, locale)),
    options: countOptions(items, searched, filters, ownCountry),
  };
}

/**
 * One page of the Items a view shows, numbered from 1, each with its list
 * thumbnail, and how many there are in all. A page past either end shows
 * the nearest one.
 */
export async function browseCollection(
  ctx: QueryCtx,
  owner: Doc<"users">,
  {
    view,
    page,
    pageSize,
    locale,
  }: { view: CollectionView; page: number; pageSize: number; locale: Locale },
) {
  const { items, ...found } = await findItems(ctx, owner, view, locale);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const shown = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (shown - 1) * pageSize;
  return {
    ...found,
    items: await Promise.all(
      items
        .slice(start, start + pageSize)
        .map((item) => withThumbnail(ctx, item)),
    ),
    total: items.length,
    page: shown,
    pageCount,
  };
}
