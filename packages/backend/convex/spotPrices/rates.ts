import { type HomeCurrency, homeCurrencies } from "@coinslite/i18n";

/** Grams in one troy ounce, the unit metal markets quote in. */
export const TROY_OUNCE_GRAMS = 31.1034768;

/** A Spot price as it's shown: per gram and per troy ounce, in whole minor units. */
export const spotPriceOf = (perGram: number) => ({
  perGram: Math.round(perGram),
  perOunce: Math.round(perGram * TROY_OUNCE_GRAMS),
});

/** The metals with a Spot price. */
export const metals = ["gold", "silver"] as const;
export type Metal = (typeof metals)[number];

/** Each metal's market code: a troy ounce of it, priced like a currency. */
export const metalCodes = { gold: "XAU", silver: "XAG" } as const;

/** Everything a snapshot prices: the Home currencies and the metals. */
export const rateCodes = [...homeCurrencies, "XAU", "XAG"] as const;
export type RateCode = (typeof rateCodes)[number];

/**
 * How much of each code one US dollar buys: units of a currency, or troy
 * ounces of a metal. Every rate is a positive number.
 */
export type PerDollar = Record<RateCode, number>;

/**
 * The Spot price of one gram of `metal`, in minor units of `currency`. Not
 * rounded, so a Metal value can multiply it and round once at the end.
 */
const perGram = (perDollar: PerDollar, metal: Metal, currency: HomeCurrency) =>
  ((perDollar[currency] / perDollar[metalCodes[metal]]) * 100) /
  TROY_OUNCE_GRAMS;

/**
 * Gold's and silver's Spot price per gram in minor units of `currency`, not
 * rounded: the same as MarketRates.spotPricePerGram, for the app to work
 * Metal values out from the stored table.
 */
export const spotPricesPerGram = (
  perDollar: PerDollar,
  currency: HomeCurrency,
): Record<Metal, number> => ({
  gold: perGram(perDollar, "gold", currency),
  silver: perGram(perDollar, "silver", currency),
});

/** Prices this much older than the latest refresh attempt are shown as out of date. */
export const STALE_AFTER_MS = 60 * 60 * 1000;

export type Snapshot = {
  /** When the provider quoted these prices. */
  quotedAt: number;
  /** When CoinsLite last stored good prices. */
  fetchedAt: number;
  /** The latest refresh attempt, whether or not it succeeded. */
  checkedAt: number;
  perDollar: PerDollar;
};

/**
 * Spot prices and exchange rates from one snapshot. Every Home currency has
 * 100 minor units, so a rate between currencies is the same for major and
 * minor units.
 */
export function marketRates(snapshot: Snapshot) {
  const { perDollar } = snapshot;
  /** How much one unit of `from` is worth in `to`. */
  const rate = (from: RateCode, to: RateCode) =>
    perDollar[to] / perDollar[from];
  return {
    quotedAt: snapshot.quotedAt,
    /** True when refreshes have been failing for a while (STALE_AFTER_MS). */
    stale: snapshot.checkedAt - snapshot.fetchedAt > STALE_AFTER_MS,
    /** How much one unit of `from` is worth in `to`, e.g. 11.5 for EUR → NOK. */
    rate: (from: HomeCurrency, to: HomeCurrency) => rate(from, to),
    /** Converts an amount in whole minor units of `from` into whole minor units of `to`. */
    convert: (amountMinor: number, from: HomeCurrency, to: HomeCurrency) =>
      Math.round(amountMinor * rate(from, to)),
    /**
     * The Spot price of one gram of `metal`, in minor units of `currency`. Not
     * rounded, so a Metal value can multiply it and round once at the end.
     */
    spotPricePerGram: (metal: Metal, currency: HomeCurrency) =>
      perGram(perDollar, metal, currency),
  };
}

export type MarketRates = ReturnType<typeof marketRates>;
