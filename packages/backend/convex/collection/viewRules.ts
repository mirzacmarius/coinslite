import { type HomeCurrency, type Locale, formatCountry } from "@coinslite/i18n";
import type { Doc, Id } from "../_generated/dataModel";
import { hasSidePhoto, lacks } from "../items/attention";
import { compareDenominations } from "../items/denominations";
import { type GradingScale, gradeRank, gradingScaleIds } from "../items/grades";
import {
  graderNames,
  referenceName,
  stampCatalogueNames,
} from "../items/references";
import { itemGainLoss } from "../items/totals";
import {
  type CollectionSort,
  type CollectionView,
  defaultSort,
  searchLimit,
  withoutAlbum,
  withoutStorage,
} from "./view";

/**
 * Which Items a Collection view (view.ts) shows, in which order, and how
 * many Items each filter option would show, from Items whose facts are
 * already resolved (items/resolve.ts). Pure: browse.ts reads the Collection
 * and hands it here.
 */

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
    value: present((item) => item.marketValue, descending),
    // Items without both prices have no Gain/loss, so they come last.
    gain: present((item) => itemGainLoss(item), descending),
    denomination: (a, b) =>
      compareDenominations(a.denomination, b.denomination),
    grade: present(
      (item) =>
        item.gradingScale && item.grade !== undefined
          ? gradeRank(item.gradingScale, item.grade)
          : undefined,
      descending,
    ),
    title: byTitle,
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
 * Whether an Item has every searched word in its title, its denomination,
 * its country's name or what its label says (grader and certificate number,
 * stamp catalogue and number, serial number), or a word is its country's
 * code ("us"), so "PCGS 12345678" finds the coin as its page writes it.
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
    const text = [
      item.title,
      item.denomination,
      item.grader &&
        referenceName(graderNames, item.grader, item.graderName, ""),
      item.certificateNumber,
      item.stampCatalogue &&
        referenceName(
          stampCatalogueNames,
          item.stampCatalogue,
          item.stampCatalogueName,
          "",
        ),
      item.stampCatalogueNumber,
      item.serialNumber,
    ]
      .filter((field) => field !== undefined)
      .map(folded);
    if (item.country) text.push(nameOf(item.country));
    const code = item.country?.toLowerCase();
    return words.every(
      (word) => word === code || text.some((field) => field.includes(word)),
    );
  };
}

/**
 * Texts that differ only in capitals, accents or spacing are one: a
 * denomination, a place Items are kept in.
 */
export const textKey = (text: string) =>
  folded(text).trim().replace(/\s+/g, " ");

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
  "storage",
  "entry",
  "without",
  "status",
] as const;
type Dimension = (typeof dimensions)[number];

/** Each dimension's filter: true when the Item passes, or when it isn't set. */
function filtersFor(
  view: CollectionView,
  { ownCountry, entryId, withMorePhotos }: ViewContext,
): Record<Dimension, Matcher> {
  const all = () => true;
  const country = view.country?.toUpperCase();
  const denomination =
    view.denomination === undefined ? undefined : textKey(view.denomination);
  const grade = view.grade;
  const storage =
    view.storage === undefined || view.storage === withoutStorage
      ? view.storage
      : textKey(view.storage);
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
        textKey(item.denomination) === denomination),
    grade: (item) =>
      grade === undefined ||
      (item.gradingScale === grade.gradingScale && item.grade === grade.grade),
    album: (item) =>
      (view.album === undefined ||
        (view.album === withoutAlbum
          ? item.albumId === undefined
          : item.albumId === view.album)) &&
      (view.notInAlbum === undefined || item.albumId !== view.notInAlbum),
    storage: (item) =>
      storage === undefined ||
      (storage === withoutStorage
        ? item.storage === undefined
        : item.storage !== undefined && textKey(item.storage) === storage),
    // A key that names no Catalog entry matches nothing.
    entry: (item) =>
      view.entry === undefined ||
      (entryId !== null && item.catalogEntryId === entryId),
    // As the Overview counts them (items/attention.ts).
    without: (item) =>
      view.without === undefined ||
      lacks(view.without, {
        ...item,
        hasPhoto:
          hasSidePhoto(item) || (withMorePhotos?.has(item._id) ?? false),
      }),
    status: (item) => (item.soldOn !== undefined) === (view.status === "sold"),
  };
}

type Matcher = (item: Item) => boolean;

/** Where a Grading scale's Grades go among the filter's options. */
const scaleOrder = new Map(
  gradingScaleIds.map((scale, index) => [scale, index]),
);

/** What a view's filters and search compare Items against, besides the view. */
export type ViewContext = {
  /** The person's own country, for origin (`ownCountryOf`). */
  ownCountry: string | null;
  /** The view's Catalog entry; null without one or for a key that names none. */
  entryId: Id<"catalogNodes"> | null;
  /** The language country names are searched in. */
  locale: Locale;
  /**
   * The Items with more photos besides their sides, read only for a view
   * of the Items without any photo.
   */
  withMorePhotos?: ReadonlySet<Id<"items">>;
};

/** The Items a view shows, in its order. */
export function itemsInView(
  items: Item[],
  view: CollectionView,
  context: ViewContext,
): Item[] {
  const { locale } = context;
  const searched = searchFor(view.search, locale);
  const filters = filtersFor(view, context);
  return items
    .filter(
      (item) =>
        searched(item) &&
        dimensions.every((dimension) => filters[dimension](item)),
    )
    .sort(orderFor(view.sort ?? defaultSort, locale));
}

/**
 * How many Items each filter option would show: those the search and every
 * other filter let through, so picking an option shows exactly its count.
 */
export function countFilterOptions(
  items: Item[],
  view: CollectionView,
  context: ViewContext,
) {
  const { ownCountry, entryId, locale } = context;
  const searched = searchFor(view.search, locale);
  const filters = filtersFor(view, context);
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
  const storages = new Map<string, { storage: string; count: number }>();
  let withoutStorages = 0;
  let ofEntry = 0;
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
      const key = textKey(item.denomination);
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
    if (counts("storage")) {
      if (item.storage === undefined) withoutStorages += 1;
      else {
        const key = textKey(item.storage);
        const option = storages.get(key);
        if (option) option.count += 1;
        else storages.set(key, { storage: item.storage, count: 1 });
      }
    }
    if (counts("entry") && entryId !== null && item.catalogEntryId === entryId)
      ofEntry += 1;
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
    /** Each place Items are kept in, as first written, most used first. */
    storages: [...storages.values()].sort(
      (a, b) => byCount(a, b) || a.storage.localeCompare(b.storage),
    ),
    withoutStorage: withoutStorages,
    /** Items made from the view's Catalog entry, when it has one. */
    entry: ofEntry,
    statuses,
  };
}
