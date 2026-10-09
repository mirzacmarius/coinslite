import type { HomeCurrency } from "@coinslite/i18n";
import { type MarketRates, type Metal, metals } from "../spotPrices/rates";
import type { ItemType } from "./grades";
import { type MetalContent, metalValue } from "./preciousMetal";

/**
 * Totals over a list of Items (spec 7, 9) and the Collection charts built from
 * them. Pure: the server sums each page of a Collection with
 * `collectionTotals`, the app adds the pages up with `combineTotals`, and any
 * other list of Items (a filtered view, an export) is summed the same way.
 */

/**
 * How many Items the Collection totals read per page: few enough to stay far
 * inside a query's read limits even with long notes on every Item, and a Free
 * plan Collection (at most 50 Items) in one page.
 */
export const TOTALS_PAGE_SIZE = 500;

const itemTypes = ["coin", "banknote", "stamp"] as const satisfies ItemType[];

/** What totals read from an Item. */
export type TotalsItem = MetalContent & {
  /** When the Item was added. */
  _creationTime: number;
  type: ItemType;
  /** Per piece, in minor units of the Home currency. */
  purchasePrice?: number;
  /** Per piece, in minor units of the Home currency. */
  marketValue?: number;
};

/** Amounts in minor units of the Home currency. */
export type Amounts = { purchasePrice: number; marketValue: number };

export type MonthAmounts = Amounts & {
  /** "YYYY-MM", in the person's time zone. */
  month: string;
};

export type MetalTotal = {
  /** Grams of the pure metal: weight × purity × Quantity, added up. */
  fineWeight: number;
  /**
   * The Items' Metal values added up, each rounded as the Item shows it, in
   * minor units. Null before the first Spot prices.
   */
  value: number | null;
};

export type CollectionTotals = {
  /** The Home currency every amount is in. */
  currency: HomeCurrency;
  /** How many Items, each counted once whatever its Quantity. */
  items: number;
  /** How many pieces of each Item type: their Quantities added up. */
  pieces: Record<ItemType, number>;
  /** Purchase price × Quantity, added up; Items without one add nothing. */
  purchasePrice: number;
  /** Market value × Quantity, added up; Items without one add nothing. */
  marketValue: number;
  /** The Items' Gain/loss added up (itemGainLoss), and how many Items have one. */
  gainLoss: { amount: number; items: number };
  /** Purchase price and Market value (× Quantity) of each Item type. */
  byType: Record<ItemType, Amounts>;
  /** Each precious metal the Items hold. */
  metals: Record<Metal, MetalTotal>;
  /**
   * Purchase price and Market value (× Quantity) of the Items added in each
   * month, oldest first, only months with Items. See valueByDateAdded.
   */
  addedByMonth: MonthAmounts[];
};

/** What the totals need besides the Items. */
export type TotalsContext = {
  currency: HomeCurrency;
  /** The latest Spot prices, or null before the first refresh. */
  rates: MarketRates | null;
  /**
   * The person's time zone as minutes ahead of UTC (Oslo in winter: 60), so an
   * Item added just after midnight on the 1st counts in the new month.
   */
  utcOffsetMinutes?: number;
};

/**
 * An Item's Gain/loss: (Market value − Purchase price) × Quantity. Undefined
 * unless it has both: a missing Market value isn't a loss, nor a missing
 * Purchase price (a gift, an inheritance) a gain.
 */
export function itemGainLoss({
  purchasePrice,
  marketValue,
  quantity,
}: TotalsItem): number | undefined {
  if (purchasePrice === undefined || marketValue === undefined)
    return undefined;
  return (marketValue - purchasePrice) * quantity;
}

/** All the pieces, whatever their Item type. */
export const totalPieces = ({ pieces }: CollectionTotals) =>
  pieces.coin + pieces.banknote + pieces.stamp;

const noAmounts = (): Amounts => ({ purchasePrice: 0, marketValue: 0 });

/** Totals over no Items. */
export const emptyTotals = ({
  currency,
  rates,
}: TotalsContext): CollectionTotals => ({
  currency,
  items: 0,
  pieces: { coin: 0, banknote: 0, stamp: 0 },
  purchasePrice: 0,
  marketValue: 0,
  gainLoss: { amount: 0, items: 0 },
  byType: { coin: noAmounts(), banknote: noAmounts(), stamp: noAmounts() },
  metals: {
    gold: { fineWeight: 0, value: rates && 0 },
    silver: { fineWeight: 0, value: rates && 0 },
  },
  addedByMonth: [],
});

/** The month a moment falls in, "YYYY-MM", `utcOffsetMinutes` ahead of UTC. */
const monthOf = (moment: number, utcOffsetMinutes: number) =>
  new Date(moment + utcOffsetMinutes * 60_000).toISOString().slice(0, 7);

/** Totals over `items`. */
export function collectionTotals(
  items: Iterable<TotalsItem>,
  context: TotalsContext,
): CollectionTotals {
  const { currency, rates, utcOffsetMinutes = 0 } = context;
  const totals = emptyTotals(context);
  const byMonth = new Map<string, MonthAmounts>();
  for (const item of items) {
    const { type, quantity } = item;
    const purchasePrice = (item.purchasePrice ?? 0) * quantity;
    const marketValue = (item.marketValue ?? 0) * quantity;
    totals.items += 1;
    totals.pieces[type] += quantity;
    totals.purchasePrice += purchasePrice;
    totals.marketValue += marketValue;
    totals.byType[type].purchasePrice += purchasePrice;
    totals.byType[type].marketValue += marketValue;

    const month = monthOf(item._creationTime, utcOffsetMinutes);
    const added = byMonth.get(month) ?? { month, ...noAmounts() };
    added.purchasePrice += purchasePrice;
    added.marketValue += marketValue;
    byMonth.set(month, added);

    const gainLoss = itemGainLoss(item);
    if (gainLoss !== undefined) {
      totals.gainLoss.amount += gainLoss;
      totals.gainLoss.items += 1;
    }

    const { metal, weight, purity } = item;
    if (metal !== undefined && weight !== undefined && purity !== undefined) {
      const sum = totals.metals[metal];
      sum.fineWeight += weight * purity * quantity;
      if (rates && sum.value !== null) {
        sum.value += metalValue(item, rates, currency) ?? 0;
      }
    }
  }
  totals.addedByMonth = combineMonths([...byMonth.values()], []);
  return totals;
}

/** The totals of two separate lists of Items as one, e.g. two pages of a Collection. */
export function combineTotals(
  a: CollectionTotals,
  b: CollectionTotals,
): CollectionTotals {
  return {
    currency: b.currency,
    items: a.items + b.items,
    pieces: {
      coin: a.pieces.coin + b.pieces.coin,
      banknote: a.pieces.banknote + b.pieces.banknote,
      stamp: a.pieces.stamp + b.pieces.stamp,
    },
    purchasePrice: a.purchasePrice + b.purchasePrice,
    marketValue: a.marketValue + b.marketValue,
    gainLoss: {
      amount: a.gainLoss.amount + b.gainLoss.amount,
      items: a.gainLoss.items + b.gainLoss.items,
    },
    byType: {
      coin: addAmounts(a.byType.coin, b.byType.coin),
      banknote: addAmounts(a.byType.banknote, b.byType.banknote),
      stamp: addAmounts(a.byType.stamp, b.byType.stamp),
    },
    metals: {
      gold: addMetal(a.metals.gold, b.metals.gold),
      silver: addMetal(a.metals.silver, b.metals.silver),
    },
    addedByMonth: combineMonths(a.addedByMonth, b.addedByMonth),
  };
}

const addAmounts = (a: Amounts, b: Amounts): Amounts => ({
  purchasePrice: a.purchasePrice + b.purchasePrice,
  marketValue: a.marketValue + b.marketValue,
});

const addMetal = (a: MetalTotal, b: MetalTotal): MetalTotal => ({
  fineWeight: a.fineWeight + b.fineWeight,
  value: a.value === null || b.value === null ? null : a.value + b.value,
});

/** Two lists of months' amounts as one, oldest first, adding up months in both. */
function combineMonths(a: MonthAmounts[], b: MonthAmounts[]): MonthAmounts[] {
  const byMonth = new Map<string, MonthAmounts>();
  for (const { month, ...amounts } of [...a, ...b]) {
    byMonth.set(month, {
      month,
      ...addAmounts(byMonth.get(month) ?? noAmounts(), amounts),
    });
  }
  return [...byMonth.values()].sort((x, y) => x.month.localeCompare(y.month));
}

/** The month after "YYYY-MM". */
function nextMonth(month: string) {
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);
  return monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
}

/**
 * The "Value by date added" chart: for every month from the first Item added
 * to the last, including months without any, the Purchase price and Market
 * value of everything added by the end of that month.
 */
export function valueByDateAdded({
  addedByMonth,
}: CollectionTotals): MonthAmounts[] {
  const first = addedByMonth[0];
  const last = addedByMonth.at(-1);
  if (!first || !last) return [];
  const series: MonthAmounts[] = [];
  let sum = noAmounts();
  let next = 0;
  for (let month = first.month; ; month = nextMonth(month)) {
    const added = addedByMonth[next];
    if (added?.month === month) {
      sum = addAmounts(sum, added);
      next += 1;
    }
    series.push({ month, ...sum });
    if (month === last.month) return series;
  }
}

export type DistributionEntry =
  | ({ kind: ItemType } & Amounts)
  | { kind: Metal; metalValue: number };

/**
 * The "Value distribution" chart: the Purchase price and Market value of each
 * Item type the Collection holds, then the Metal value of gold and of silver
 * when it holds any and Spot prices are in.
 */
export function valueDistribution(
  totals: CollectionTotals,
): DistributionEntry[] {
  const entries: DistributionEntry[] = [];
  for (const kind of itemTypes) {
    if (totals.pieces[kind] > 0) entries.push({ kind, ...totals.byType[kind] });
  }
  for (const kind of metals) {
    const { fineWeight, value } = totals.metals[kind];
    if (fineWeight > 0 && value !== null) {
      entries.push({ kind, metalValue: value });
    }
  }
  return entries;
}
