import type { HomeCurrency } from "@coinslite/i18n";
import { type Metal, type SpotPrices, metals } from "../spotPrices/rates";
import type { ItemType } from "./grades";
import { type MetalContent, roundedMetalValue } from "./preciousMetal";

/**
 * Totals over a list of Items (spec 7, 9) and the Collection charts built from
 * them. Pure: the server sums each page of a Collection with `pageTotals`,
 * the app adds the pages up with `combineTotals` and works out the Metal
 * values at the current Spot prices with `withMetalValues`; any other list of
 * Items (a filtered view, an export) is summed in one go with
 * `collectionTotals`.
 */

/**
 * The most Items one page of the Collection totals reads. Each is a document
 * of a few kilobytes and at most one lookup of its Catalog entry, so a page
 * keeps to a quarter of the lookups and a sixteenth of the documents one
 * query may read (4,096 and 32,000); the bytes its Items take are capped
 * apart (collectionTotals.ts). A Collection of 2,000 Items is two or three
 * pages, a Free plan one (at most 50 Items) one.
 */
export const TOTALS_PAGE_SIZE = 1_000;

const itemTypes = ["coin", "banknote", "stamp"] as const satisfies ItemType[];

/** What totals read from an Item. */
export type TotalsItem = MetalContent & {
  /** When the Item was recorded in CoinsLite. */
  _creationTime: number;
  type: ItemType;
  /** "YYYY-MM-DD"; it counts as acquired then when that is earlier (acquiredAt). */
  purchaseDate?: string;
  /** Per piece, in minor units of the Home currency. */
  purchasePrice?: number;
  /** Per piece, in minor units of the Home currency. */
  marketValue?: number;
  /** Per piece, in minor units of the Home currency; sold Items only. */
  salePrice?: number;
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
  /** Sale price × Quantity, added up; only sold Items have one. */
  salePrice: number;
  /** The realised Gain/loss added up (itemRealised), and how many Items have one. */
  realised: { amount: number; items: number };
  /** Purchase price and Market value (× Quantity) of each Item type. */
  byType: Record<ItemType, Amounts>;
  /** Each precious metal the Items hold. */
  metals: Record<Metal, MetalTotal>;
  /**
   * Purchase price and Market value (× Quantity) of the Items acquired in
   * each month (acquiredAt), oldest first, only months with Items. See
   * valueByDateAdded.
   */
  addedByMonth: MonthAmounts[];
};

/**
 * Items with the same fine weight per piece and the same Quantity, so the
 * same Metal value each.
 */
export type FineWeightGroup = {
  /** Grams of the pure metal in one piece: weight × purity. */
  finePerPiece: number;
  /** Each of these Items' Quantity. */
  quantity: number;
  /** How many Items. */
  items: number;
};

/**
 * The totals before any Spot price: everything CollectionTotals holds but the
 * metals, and instead each metal's fine weights, Item by Item in groups. The
 * server sums each page of a Collection this way, so a Spot price refresh
 * re-runs none of them; the app adds the pages up (combineTotals) and works
 * out the Metal values once, at the current Spot prices (withMetalValues).
 */
export type PageTotals = Omit<CollectionTotals, "metals"> & {
  /** By fine weight per piece, then Quantity, both ascending. */
  fineWeights: Record<Metal, FineWeightGroup[]>;
};

/** What the totals need besides the Items. */
export type TotalsContext = {
  currency: HomeCurrency;
  /** The latest Spot prices in `currency`, or null before the first refresh. */
  spotPrices: SpotPrices | null;
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

/**
 * A sold Item's realised Gain/loss: (sale price − Purchase price) × Quantity.
 * Undefined unless it has both.
 */
export function itemRealised({
  purchasePrice,
  salePrice,
  quantity,
}: TotalsItem): number | undefined {
  if (purchasePrice === undefined || salePrice === undefined) return undefined;
  return (salePrice - purchasePrice) * quantity;
}

/** All the pieces, whatever their Item type. */
export const totalPieces = ({ pieces }: CollectionTotals) =>
  pieces.coin + pieces.banknote + pieces.stamp;

const noAmounts = (): Amounts => ({ purchasePrice: 0, marketValue: 0 });

/** Totals over no Items, before any Spot price. */
const emptyPageTotals = (currency: HomeCurrency): PageTotals => ({
  currency,
  items: 0,
  pieces: { coin: 0, banknote: 0, stamp: 0 },
  purchasePrice: 0,
  marketValue: 0,
  gainLoss: { amount: 0, items: 0 },
  salePrice: 0,
  realised: { amount: 0, items: 0 },
  byType: { coin: noAmounts(), banknote: noAmounts(), stamp: noAmounts() },
  fineWeights: { gold: [], silver: [] },
  addedByMonth: [],
});

/** The month a moment falls in, "YYYY-MM", `utcOffsetMinutes` ahead of UTC. */
export const monthOf = (moment: number, utcOffsetMinutes: number) =>
  new Date(moment + utcOffsetMinutes * 60_000).toISOString().slice(0, 7);

/**
 * The earliest purchase date the charts go by: a date mistyped centuries
 * back (the year 202) would otherwise stretch them over every month since.
 */
const EARLIEST_PURCHASE_DATE = "1900-01-01";

/**
 * When an Item was acquired: at the start of its purchase date ("YYYY-MM-DD",
 * in the person's time zone, `utcOffsetMinutes` ahead of UTC; 1900 at the
 * earliest) when that is earlier than `recordedAt`, when it was recorded in
 * CoinsLite; otherwise then.
 */
export function acquiredAt(
  recordedAt: number,
  purchaseDate: string | undefined,
  utcOffsetMinutes: number,
) {
  if (purchaseDate === undefined) return recordedAt;
  const day =
    purchaseDate < EARLIEST_PURCHASE_DATE
      ? EARLIEST_PURCHASE_DATE
      : purchaseDate;
  const bought = Date.parse(`${day}T00:00:00Z`) - utcOffsetMinutes * 60_000;
  return Math.min(bought, recordedAt);
}

/** Totals over `items`, at `context.spotPrices`. */
export const collectionTotals = (
  items: Iterable<TotalsItem>,
  context: TotalsContext,
): CollectionTotals =>
  withMetalValues(pageTotals(items, context), context.spotPrices);

/** Totals over `items` before any Spot price, as a page of a Collection sums them. */
export function pageTotals(
  items: Iterable<TotalsItem>,
  { currency, utcOffsetMinutes = 0 }: Omit<TotalsContext, "spotPrices">,
): PageTotals {
  const totals = emptyPageTotals(currency);
  const byMonth = new Map<string, MonthAmounts>();
  const fineWeights: Record<Metal, FineWeightGroup[]> = {
    gold: [],
    silver: [],
  };
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

    const month = monthOf(
      acquiredAt(item._creationTime, item.purchaseDate, utcOffsetMinutes),
      utcOffsetMinutes,
    );
    const added = byMonth.get(month) ?? { month, ...noAmounts() };
    added.purchasePrice += purchasePrice;
    added.marketValue += marketValue;
    byMonth.set(month, added);

    totals.salePrice += (item.salePrice ?? 0) * quantity;
    const realised = itemRealised(item);
    if (realised !== undefined) {
      totals.realised.amount += realised;
      totals.realised.items += 1;
    }

    const gainLoss = itemGainLoss(item);
    if (gainLoss !== undefined) {
      totals.gainLoss.amount += gainLoss;
      totals.gainLoss.items += 1;
    }

    const { metal, weight, purity } = item;
    if (metal !== undefined && weight !== undefined && purity !== undefined) {
      fineWeights[metal].push({
        finePerPiece: weight * purity,
        quantity,
        items: 1,
      });
    }
  }
  totals.fineWeights = {
    gold: groupFineWeights(fineWeights.gold),
    silver: groupFineWeights(fineWeights.silver),
  };
  totals.addedByMonth = combineMonths([...byMonth.values()], []);
  return totals;
}

/**
 * Groups as one list: those of the same fine weight per piece and Quantity
 * added together, by fine weight per piece, then Quantity.
 */
function groupFineWeights(groups: FineWeightGroup[]): FineWeightGroup[] {
  const byAmount = new Map<string, FineWeightGroup>();
  for (const group of groups) {
    const key = `${group.finePerPiece} ${group.quantity}`;
    const same = byAmount.get(key);
    byAmount.set(
      key,
      same ? { ...same, items: same.items + group.items } : group,
    );
  }
  return [...byAmount.values()].sort(
    (a, b) => a.finePerPiece - b.finePerPiece || a.quantity - b.quantity,
  );
}

/**
 * The totals as shown: each metal's fine weight, and its Metal value at
 * `spotPrices`, worked out Item by Item and rounded as each Item shows it,
 * then added up. Metal values are null without Spot prices.
 */
export function withMetalValues(
  { fineWeights, ...totals }: PageTotals,
  spotPrices: SpotPrices | null,
): CollectionTotals {
  const totalOf = (metal: Metal): MetalTotal => {
    let fineWeight = 0;
    let value = 0;
    for (const { finePerPiece, quantity, items } of fineWeights[metal]) {
      fineWeight += finePerPiece * quantity * items;
      if (spotPrices)
        value +=
          roundedMetalValue(finePerPiece, spotPrices[metal], quantity) * items;
    }
    return { fineWeight, value: spotPrices && value };
  };
  return {
    ...totals,
    metals: { gold: totalOf("gold"), silver: totalOf("silver") },
  };
}

/**
 * The totals of two separate lists of Items as one, e.g. two pages of a
 * Collection. However the Items are split into pages, they add up to the
 * same as one page.
 */
export function combineTotals(a: PageTotals, b: PageTotals): PageTotals {
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
    salePrice: a.salePrice + b.salePrice,
    realised: {
      amount: a.realised.amount + b.realised.amount,
      items: a.realised.items + b.realised.items,
    },
    byType: {
      coin: addAmounts(a.byType.coin, b.byType.coin),
      banknote: addAmounts(a.byType.banknote, b.byType.banknote),
      stamp: addAmounts(a.byType.stamp, b.byType.stamp),
    },
    fineWeights: {
      gold: groupFineWeights([...a.fineWeights.gold, ...b.fineWeights.gold]),
      silver: groupFineWeights([
        ...a.fineWeights.silver,
        ...b.fineWeights.silver,
      ]),
    },
    addedByMonth: combineMonths(a.addedByMonth, b.addedByMonth),
  };
}

const addAmounts = (a: Amounts, b: Amounts): Amounts => ({
  purchasePrice: a.purchasePrice + b.purchasePrice,
  marketValue: a.marketValue + b.marketValue,
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
export function nextMonth(month: string) {
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);
  return monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
}

/**
 * The "Value by date acquired" chart: for every month from the first Item
 * acquired to the last, including months without any, the Purchase price and
 * Market value of everything acquired by the end of that month.
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
