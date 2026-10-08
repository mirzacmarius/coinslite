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

/**
 * Formats a calendar date ("YYYY-MM-DD") or a timestamp. Calendar dates are read
 * in UTC so they never shift by a day; pass the viewer's time zone for timestamps.
 */
export function formatDate(
  value: string | number | Date,
  locale: Locale,
  { timeZone = "UTC" }: { timeZone?: string } = {},
): string {
  const date =
    typeof value === "string"
      ? new Date(`${value}T00:00:00Z`)
      : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone,
  }).format(date);
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
