import type { Locale } from "./locale";

export const homeCurrencies = [
  "NOK",
  "SEK",
  "DKK",
  "EUR",
  "RON",
  "GBP",
  "USD",
  "CHF",
] as const;
export type HomeCurrency = (typeof homeCurrencies)[number];

export function isHomeCurrency(value: unknown): value is HomeCurrency {
  return (
    typeof value === "string" &&
    (homeCurrencies as readonly string[]).includes(value)
  );
}

/** Every Home currency divides into 100 minor units (øre, cents, bani, pence, rappen). */
const MINOR_UNITS_PER_MAJOR = 100;

/**
 * Money shows the currency's symbol (spec §4). Intl's plain "symbol" keeps the
 * ISO code wherever a symbol could be confused with another currency's
 * ("NOK 1,234.56" in English), so the narrow symbol is used. That turns NOK,
 * SEK and DKK all into "kr", which is fine: a person sees one Home currency
 * only, and every export that leaves the app states its ISO code in words.
 */
const currencyDisplay = "narrowSymbol";

/**
 * The narrow symbol for the leu is "L" outside Romanian and English; "lei" is
 * what Romanians write, and "L" alone could be any of several currencies.
 */
const symbolOverrides: Partial<Record<HomeCurrency, string>> = { RON: "lei" };

export type MoneyFormatOptions = {
  /** Shows a "+" on gains and a minus on losses, as Gain/loss does. */
  signed?: boolean;
  /** Abbreviates large amounts to one decimal, e.g. for chart axes: "kr 150K". */
  compact?: boolean;
};

/** Formats an amount stored in whole minor units, e.g. 123456 NOK øre → "1 234,56 kr". */
export function formatMoney(
  amountMinor: number,
  currency: HomeCurrency,
  locale: Locale,
  { signed = false, compact = false }: MoneyFormatOptions = {},
): string {
  if (!Number.isInteger(amountMinor)) {
    throw new RangeError(
      `Money amounts are whole minor units, got ${amountMinor}`,
    );
  }
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay,
    ...(signed && { signDisplay: "exceptZero" }),
    // Both digit bounds: older ICU versions otherwise keep the currency's two
    // decimals, capped at one ("kr 150.0K" instead of "kr 150K").
    ...(compact && {
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }),
  }).formatToParts(amountMinor / MINOR_UNITS_PER_MAJOR);
  const symbol = symbolOverrides[currency];
  return parts
    .map((part) =>
      symbol !== undefined && part.type === "currency" ? symbol : part.value,
    )
    .join("");
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a calendar date ("YYYY-MM-DD", e.g. a purchase date) or a moment in
 * time. Calendar dates are read in UTC so they never shift by a day; moments are
 * shown in `timeZone`, which should be the viewer's (default: the runtime's own).
 */
export function formatDate(
  value: string | number | Date,
  locale: Locale,
  { timeZone }: { timeZone?: string } = {},
): string {
  if (typeof value === "string") {
    if (!CALENDAR_DATE.test(value)) {
      throw new RangeError(
        `Expected a calendar date "YYYY-MM-DD", got "${value}"`,
      );
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(value));
}

/** Formats a moment with its time of day, in `timeZone` (default: the runtime's own). */
export function formatDateTime(
  value: number | Date,
  locale: Locale,
  { timeZone }: { timeZone?: string } = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

/** Shows an ISO 3166 alpha-2 country code as its name in the given language. */
export function formatCountry(code: string, locale: Locale): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  return (
    new Intl.DisplayNames([locale], { type: "region", fallback: "code" }).of(
      code.toUpperCase(),
    ) ?? code
  );
}

/** The formatters bound to one language (and the viewer's time zone, if known). */
export function formattersFor(
  locale: Locale,
  { timeZone }: { timeZone?: string } = {},
) {
  return {
    money: (
      amountMinor: number,
      currency: HomeCurrency,
      options?: MoneyFormatOptions,
    ) => formatMoney(amountMinor, currency, locale, options),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    date: (value: string | number | Date) =>
      formatDate(value, locale, { timeZone }),
    dateTime: (value: number | Date) =>
      formatDateTime(value, locale, { timeZone }),
    country: (code: string) => formatCountry(code, locale),
  };
}
