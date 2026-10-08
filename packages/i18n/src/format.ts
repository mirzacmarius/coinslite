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

/** Every Home currency divides into 100 minor units (øre, cents, bani, pence, rappen). */
const MINOR_UNITS_PER_MAJOR = 100;

/** Formats an amount stored in whole minor units, e.g. 123456 NOK øre → "1 234,56 kr". */
export function formatMoney(
  amountMinor: number,
  currency: HomeCurrency,
  locale: Locale,
): string {
  if (!Number.isInteger(amountMinor)) {
    throw new RangeError(
      `Money amounts are whole minor units, got ${amountMinor}`,
    );
  }
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amountMinor / MINOR_UNITS_PER_MAJOR,
  );
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
    money: (amountMinor: number, currency: HomeCurrency) =>
      formatMoney(amountMinor, currency, locale),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    date: (value: string | number | Date) =>
      formatDate(value, locale, { timeZone }),
    country: (code: string) => formatCountry(code, locale),
  };
}
