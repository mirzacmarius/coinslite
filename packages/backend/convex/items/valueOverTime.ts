import type { HomeCurrency } from "@coinslite/i18n";
import type { MarketRates } from "../spotPrices/rates";
import { metalValue } from "./preciousMetal";
import { type TotalsItem, acquiredAt, monthOf, nextMonth } from "./totals";

export { monthOf };

/**
 * "Value over time" (spec 7): what the Collection was worth at the end of
 * each month. Pure: the server works out each page of a Collection with
 * `valueOverTime`, the app adds the pages up with `combineValueOverTime`.
 */

/**
 * The most Items one page of "Value over time" reads. Each takes two lookups,
 * its history and its Catalog entry, and its history is at most a point a
 * month (items/valueHistory.ts): a page keeps to a quarter of the lookups
 * one query may make (4,096), and inside half the documents (32,000) even if
 * every Item's Market value changed every month for over two years. The
 * bytes its Items take are capped apart (collectionTotals.ts). A Collection
 * of 2,000 Items is four or five pages.
 */
export const VALUE_OVER_TIME_PAGE_SIZE = 500;

/** An Item's Market value from a moment on (marketValueHistory in schema.ts). */
export type ValuePoint = {
  at: number;
  /** Per piece, in minor units of the Home currency; absent once cleared. */
  marketValue?: number;
  quantity: number;
};

/** What the series reads from an Item. */
export type SeriesItem = TotalsItem & {
  /** When its pieces were first recorded, for an Item split off by a sale. */
  addedAt?: number;
  /** "YYYY-MM-DD"; an Item leaves the series from the month it was sold. */
  soldOn?: string;
  /** Its Market value history, oldest first. */
  history: ValuePoint[];
};

export type MonthValue = {
  /** "YYYY-MM", in the person's time zone. */
  month: string;
  /** Purchase price × Quantity of what was owned at the month's end. */
  purchasePrice: number;
  /**
   * The latest Market value as of the month's end × Quantity; before an
   * Item's first, its Purchase price if it has a purchase date.
   */
  marketValue: number;
  /** Gold and silver at the month's Spot price; null without Spot prices. */
  metalValue: number | null;
};

/** Every month from `first` to `last`, both included. */
export function monthsBetween(first: string, last: string) {
  const months: string[] = [];
  for (let month = first; month <= last; month = nextMonth(month))
    months.push(month);
  return months;
}

/** The first moment of the month after `month`, `utcOffsetMinutes` ahead of UTC. */
export const monthEnd = (month: string, utcOffsetMinutes: number) =>
  Date.parse(`${nextMonth(month)}-01T00:00:00Z`) - utcOffsetMinutes * 60_000;

/** The last day of `month`, "YYYY-MM-DD". */
export const lastDayOf = (month: string) =>
  new Date(Date.parse(`${nextMonth(month)}-01T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);

/** When an Item's pieces were first recorded in CoinsLite. */
const recordedAt = (item: Pick<SeriesItem, "addedAt" | "_creationTime">) =>
  item.addedAt ?? item._creationTime;

/**
 * When an Item enters the series: when it was acquired (acquiredAt), on its
 * purchase date or when its pieces were first recorded, whichever is
 * earlier.
 */
export const startOf = (
  item: Pick<SeriesItem, "addedAt" | "_creationTime" | "purchaseDate">,
  utcOffsetMinutes: number,
) => acquiredAt(recordedAt(item), item.purchaseDate, utcOffsetMinutes);

/**
 * The months a series over `items` covers: from the month the earliest of
 * them started (startOf) through `throughMonth`, the person's current month;
 * none when they all started later, or there are none.
 */
export function seriesMonths(
  items: Pick<SeriesItem, "addedAt" | "_creationTime" | "purchaseDate">[],
  throughMonth: string,
  utcOffsetMinutes: number,
) {
  let firstMonth: string | undefined;
  for (const item of items) {
    const month = monthOf(startOf(item, utcOffsetMinutes), utcOffsetMinutes);
    if (firstMonth === undefined || month < firstMonth) firstMonth = month;
  }
  return firstMonth === undefined
    ? []
    : monthsBetween(firstMonth, throughMonth);
}

/**
 * Where an Item stood at `end`: its Market value per piece and Quantity then,
 * from the latest history point before `end`. An Item without history (one
 * added before history was kept, until the backfill) counts as it is now; one
 * whose history starts later had no Market value yet.
 */
function standingAt(item: SeriesItem, end: number) {
  let latest: ValuePoint | undefined;
  for (const point of item.history) {
    if (point.at >= end) break;
    latest = point;
  }
  if (latest)
    return { marketValue: latest.marketValue ?? 0, quantity: latest.quantity };
  if (item.history.length === 0)
    return { marketValue: item.marketValue ?? 0, quantity: item.quantity };
  return { marketValue: 0, quantity: item.history[0]?.quantity ?? 0 };
}

/**
 * When an Item's first Market value was recorded; undefined if it never had
 * one. Without history, when its pieces were recorded, as the backfill dates
 * it.
 */
function firstValuedAt(item: SeriesItem) {
  if (item.history.length === 0)
    return item.marketValue === undefined ? undefined : recordedAt(item);
  return item.history.find((point) => point.marketValue !== undefined)?.at;
}

/**
 * The series over `items` for each of `months`: the Items owned at each
 * month's end (acquired by then, and not sold by its last day), their
 * Purchase price, latest Market value and Metal value at that month's Spot
 * price (`ratesFor`), each × the Quantity they had then. Until its first
 * recorded Market value, an Item with a purchase date counts at its Purchase
 * price, the only value known for that time; one that never had a Market
 * value counts none, as in the totals.
 */
export function valueOverTime(
  items: Iterable<SeriesItem>,
  {
    months,
    currency,
    utcOffsetMinutes,
    ratesFor,
  }: {
    months: string[];
    currency: HomeCurrency;
    utcOffsetMinutes: number;
    ratesFor: (month: string) => MarketRates | null;
  },
): MonthValue[] {
  const series = months.map((month) => ({
    month,
    end: monthEnd(month, utcOffsetMinutes),
    lastDay: lastDayOf(month),
    rates: ratesFor(month),
    purchasePrice: 0,
    marketValue: 0,
    metalValue: 0,
  }));
  for (const item of items) {
    const start = startOf(item, utcOffsetMinutes);
    const purchasePrice = item.purchasePrice ?? 0;
    // Months ending by its first recorded Market value count it at its
    // Purchase price; undefined when none do.
    const atPurchasePriceUntil =
      item.purchaseDate === undefined ? undefined : firstValuedAt(item);
    for (const point of series) {
      if (start >= point.end) continue;
      if (item.soldOn !== undefined && item.soldOn <= point.lastDay) continue;
      const standing = standingAt(item, point.end);
      const { quantity } = standing;
      const marketValue =
        atPurchasePriceUntil !== undefined && point.end <= atPurchasePriceUntil
          ? purchasePrice
          : standing.marketValue;
      point.purchasePrice += purchasePrice * quantity;
      point.marketValue += marketValue * quantity;
      if (point.rates)
        point.metalValue +=
          metalValue({ ...item, quantity }, point.rates, currency) ?? 0;
    }
  }
  return series.map(
    ({ month, purchasePrice, marketValue, metalValue, rates }) => ({
      month,
      purchasePrice,
      marketValue,
      metalValue: rates ? metalValue : null,
    }),
  );
}

/**
 * Two pages' series as one: months in either, oldest first, their amounts
 * added up. Every page runs to the current month, so the months between the
 * earliest and now are all there.
 */
export function combineValueOverTime(
  a: MonthValue[],
  b: MonthValue[],
): MonthValue[] {
  const byMonth = new Map<string, MonthValue>();
  for (const point of [...a, ...b]) {
    const sum = byMonth.get(point.month);
    byMonth.set(
      point.month,
      sum
        ? {
            month: point.month,
            purchasePrice: sum.purchasePrice + point.purchasePrice,
            marketValue: sum.marketValue + point.marketValue,
            metalValue:
              sum.metalValue === null || point.metalValue === null
                ? null
                : sum.metalValue + point.metalValue,
          }
        : point,
    );
  }
  return [...byMonth.values()].sort((x, y) => x.month.localeCompare(y.month));
}
