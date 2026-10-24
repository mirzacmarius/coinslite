import { type HomeCurrency, homeCurrencies } from "@coinslite/i18n";
import { ConvexError } from "convex/values";
import { parseCsv } from "../catalog/csvText";
import { isPastOrToday, itemErrors, itemLimits } from "../items/rules";

/**
 * A purchase in another currency (spec §4): the amount paid is converted
 * into the Home currency at the European Central Bank's euro reference rates
 * of the purchase day, and kept with the Item as paid. Pure, so the app shows
 * the conversion the server stores.
 */

/** The first day the European Central Bank published euro reference rates. */
export const firstRateDay = "1999-01-04";

/** The Home currencies the ECB quotes against the euro. */
export const quotedCurrencies = homeCurrencies.filter(
  (currency): currency is Exclude<HomeCurrency, "EUR"> => currency !== "EUR",
);
export type QuotedCurrency = (typeof quotedCurrencies)[number];

/**
 * How many units of each Home currency one euro bought on a day. A currency
 * the ECB didn't quote then (the Romanian leu before July 2005) is missing.
 */
export type PerEuro = Partial<Record<QuotedCurrency, number>>;

/** The rates of one day as stored: the day they were published for, and the rates. */
export type DayRates = { rateDay: string; perEuro: PerEuro };

export const exchangeRateErrors = {
  /** A day the ECB has no rates for: before 1999, or after the latest purchase date. */
  invalidDay: "EXCHANGE_RATE_INVALID_DAY",
  /** No rate for one of the currencies on that day. */
  noRate: "EXCHANGE_RATE_MISSING",
  /** The ECB couldn't be reached, and nothing is stored for the day. */
  unavailable: "EXCHANGE_RATE_UNAVAILABLE",
  /** The day's rates are newer than those the form showed the conversion at. */
  rateChanged: "EXCHANGE_RATE_CHANGED",
} as const;

/** How many euros' worth one unit of `currency` is the inverse of; null when the day has no rate for it. */
const perEuroOf = (perEuro: PerEuro, currency: HomeCurrency) =>
  currency === "EUR" ? 1 : (perEuro[currency] ?? null);

/**
 * `amount` in minor units of `from`, in whole minor units of `to` at a day's
 * rates; null when the day has no rate for either. Every Home currency has
 * 100 minor units, so the rate is the same for major and minor units.
 */
export function convertAt(
  perEuro: PerEuro,
  amount: number,
  from: HomeCurrency,
  to: HomeCurrency,
) {
  if (from === to) return amount;
  const fromRate = perEuroOf(perEuro, from);
  const toRate = perEuroOf(perEuro, to);
  if (fromRate === null || toRate === null) return null;
  return Math.round((amount * toRate) / fromRate);
}

/** Whether rates can be asked for on `day`: from the ECB's first, up to the latest purchase date. */
export const isRateDay = (day: string, latest: string) =>
  isPastOrToday(day, latest) && day >= firstRateDay;

/** The day `days` before a "YYYY-MM-DD" day. */
export function daysBefore(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * How far back the latest rates before a day are looked for: the ECB
 * publishes on working days, and closes at most four days running (Good
 * Friday to Easter Monday).
 */
export const lookBackDays = 7;

/**
 * Whether stored rates for `day` stay as they are: they're the day's own, or
 * were fetched once the day was over (UTC), after the ECB would have
 * published any. Until then they're the last working day's, and are asked
 * for again.
 */
export const ratesFinal = ({
  day,
  rateDay,
  fetchedAt,
}: {
  day: string;
  rateDay: string;
  fetchedAt: number;
}) => rateDay === day || new Date(fetchedAt).toISOString().slice(0, 10) > day;

/** How long rates that aren't final are kept before being asked for again. */
export const RATES_FRESH_MS = 60 * 60 * 1000;

/**
 * The latest rates up to `day` in the ECB's daily reference rates as CSV
 * (SDMX "csvdata": a heading row, then one row per currency and day, with
 * CURRENCY, TIME_PERIOD and OBS_VALUE columns among others). Rows for other
 * currencies, later days, or without a positive rate are passed over. Null
 * when no row gives a rate.
 */
export function ratesFromCsv(text: string, day: string): DayRates | null {
  const parsed = parseCsv(text);
  if (!("records" in parsed)) return null;
  const [heading, ...rows] = parsed.records;
  if (!heading) return null;
  const column = (name: string) =>
    heading.findIndex((cell) => cell.trim() === name);
  const currencyAt = column("CURRENCY");
  const dayAt = column("TIME_PERIOD");
  const valueAt = column("OBS_VALUE");
  if (currencyAt < 0 || dayAt < 0 || valueAt < 0) return null;
  const latest = new Map<QuotedCurrency, { day: string; rate: number }>();
  for (const row of rows) {
    const currency = row[currencyAt]?.trim() as QuotedCurrency;
    const period = row[dayAt]?.trim() ?? "";
    const rate = Number(row[valueAt]?.trim() || Number.NaN);
    if (!quotedCurrencies.includes(currency)) continue;
    if (!isPastOrToday(period, day)) continue;
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const kept = latest.get(currency);
    if (!kept || kept.day < period) latest.set(currency, { day: period, rate });
  }
  if (latest.size === 0) return null;
  const perEuro: PerEuro = {};
  let rateDay = "";
  for (const [currency, { day: period, rate }] of latest) {
    perEuro[currency] = rate;
    if (period > rateDay) rateDay = period;
  }
  return { rateDay, perEuro };
}

/** What was paid for an Item in a currency other than the Home currency, as stored. */
export type PurchasePaid = {
  /** Minor units of `currency`, per piece. */
  amount: number;
  currency: HomeCurrency;
  /**
   * The day whose ECB rates converted it; none once a Home currency change
   * has converted the Purchase price at its own rate.
   */
  rateDay?: string;
};

/**
 * A purchase in another currency as the Item form sends it: the amount per
 * piece in minor units of `currency`, and the day whose rates convert it
 * (the purchase date, or today without one). `rateDay` is the day of the
 * rates the form showed the conversion at: the save is refused should the
 * day's rates be newer by then.
 */
export type PaidInput = {
  amount: number;
  currency: HomeCurrency;
  day: string;
  rateDay?: string;
};

/**
 * Whether a purchase in another currency is one an Item may hold: a whole
 * amount up to the largest an Item takes, converted at the rates of a day
 * the ECB published any up to `today`, if at a day's. What an undo may
 * write back.
 */
export const paidStorable = (paid: PurchasePaid | undefined, today: string) =>
  paid === undefined ||
  (Number.isSafeInteger(paid.amount) &&
    paid.amount >= 0 &&
    paid.amount <= itemLimits.amount &&
    (paid.rateDay === undefined || isRateDay(paid.rateDay, today)));

/**
 * Whether the form's purchase in another currency is the one the Item holds
 * already. With the purchase date unchanged too, nothing is converted again:
 * the Purchase price stays as it was converted.
 */
export const samePaid = (
  input: Pick<PaidInput, "amount" | "currency">,
  stored: PurchasePaid | undefined,
) =>
  stored !== undefined &&
  stored.amount === input.amount &&
  stored.currency === input.currency;

/**
 * The Purchase price and the purchase as paid that a purchase in another
 * currency stores: `paid` converted into `home` at the day's `rates`. Paid in
 * the Home currency, it's the Purchase price itself. Throws when the amount
 * isn't one, the day has no rate for the currency, or its rates aren't
 * those the form showed.
 */
export function convertPaid(
  paid: PaidInput,
  home: HomeCurrency,
  rates: DayRates | null,
): { purchasePrice: number; purchasePaid: PurchasePaid | undefined } {
  const { amount, currency } = paid;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > itemLimits.amount)
    throw new ConvexError(itemErrors.invalidAmount);
  if (currency === home)
    return { purchasePrice: amount, purchasePaid: undefined };
  const purchasePrice =
    rates === null ? null : convertAt(rates.perEuro, amount, currency, home);
  if (rates === null || purchasePrice === null)
    throw new ConvexError(exchangeRateErrors.noRate);
  if (paid.rateDay !== undefined && paid.rateDay !== rates.rateDay)
    throw new ConvexError(exchangeRateErrors.rateChanged);
  return {
    purchasePrice,
    purchasePaid: { amount, currency, rateDay: rates.rateDay },
  };
}
