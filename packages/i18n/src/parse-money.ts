import type { Locale } from "./locale";

const MINOR_UNITS_PER_MAJOR = 100;

/** The language's decimal mark and digit grouping, e.g. "," and "." in German. */
function separators(locale: Locale) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find(({ type }) => type === "decimal")?.value ?? ".",
    group: parts.find(({ type }) => type === "group")?.value ?? ",",
  };
}

/**
 * Reads an amount the way people type it in their language ("1 234,56" in
 * Norwegian, "1.234,56" in German) as whole minor units, or null if it isn't
 * one. A "." or "," followed by one or two digits at the end is the decimal mark
 * in any language; with three digits it's the language's digit grouping.
 */
export function parseMoney(text: string, locale: Locale): number | null {
  const { decimal, group } = separators(locale);
  const compact = text.replace(/[\s  ]/g, "");
  if (!/^\d[\d.,]*$/.test(compact)) return null;

  const lastMark = Math.max(compact.lastIndexOf("."), compact.lastIndexOf(","));
  const tail = lastMark === -1 ? "" : compact.slice(lastMark + 1);
  const markIsDecimal =
    lastMark !== -1 &&
    (compact[lastMark] === decimal ||
      tail.length !== 3 ||
      compact[lastMark] !== group);
  if (markIsDecimal && !/^\d{1,2}$/.test(tail)) return null;

  const whole = markIsDecimal ? compact.slice(0, lastMark) : compact;
  const fraction = markIsDecimal ? tail : "";
  // The whole part is plain digits, or digits grouped in threes by the language's mark.
  const grouped =
    group === "." || group === ","
      ? new RegExp(`^\\d{1,3}(\\${group}\\d{3})+$`).test(whole)
      : false;
  if (!/^\d+$/.test(whole) && !grouped) return null;

  const minor =
    Number(whole.replace(/[.,]/g, "")) * MINOR_UNITS_PER_MAJOR +
    Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}
