/**
 * Ordering denominations by face value. Pure, so the Catalog, the Collection
 * and the app sort them the same way. A denomination is free text ("10
 * kroner", "50 øre", "½ dollar"), so its face value is read from it: the
 * number, in major units, with minor units (øre, cent, penny…) counted as
 * hundredths whatever their history.
 */

/** Words for a hundredth of the main unit, in the languages the Catalog covers. */
const minorUnits = new Set([
  "øre",
  "öre",
  "ore",
  "cent",
  "cents",
  "centime",
  "centimes",
  "céntimo",
  "céntimos",
  "centimo",
  "centimos",
  "centavo",
  "centavos",
  "centesimo",
  "centesimi",
  "eurocent",
  "eurocents",
  "penny",
  "pence",
  "p",
  "pfennig",
  "pfennige",
  "rappen",
  "groschen",
  "ban",
  "bani",
  "kopek",
  "kopeks",
  "kopeck",
  "kopecks",
  "kopiyka",
  "kopiyok",
  "grosz",
  "grosze",
  "groszy",
  "haléř",
  "haléřů",
  "haler",
  "heller",
  "fillér",
  "filler",
  "stotinka",
  "stotinki",
  "lipa",
  "lipe",
  "santims",
  "santimi",
  "sen",
  "satang",
]);

/** Words that stand for an amount of the main unit, or scale the one beside them. */
const unitWords: Record<string, number> = {
  half: 0.5,
  quarter: 0.25,
  double: 2,
  dime: 0.1,
  nickel: 0.05,
  eagle: 10,
};

const fractionGlyphs: Record<string, number> = {
  "½": 1 / 2,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 1 / 8,
};

/** "2½", "1 1/2", "½" and "1/2": a whole number with a fraction, or a fraction alone. */
const fractionPattern = /(?:(\d+)\s*)?(?:([½¼¾⅓⅔⅛])|(\d+)\/(\d+))/u;
/** "1 000" and "1,000" (grouped thousands), then "2,5", "2.5" and "10". */
const numberPattern =
  /\d{1,3}(?:[   ]\d{3})+(?!\d)|\d{1,3}(?:,\d{3})+(?![\d.])|\d+(?:[.,]\d+)?/u;

/** The number in a denomination and the text around it, or undefined without one. */
function readAmount(text: string) {
  const fraction = fractionPattern.exec(text);
  if (fraction) {
    const [match, whole, glyph, numerator, denominator] = fraction;
    const part = glyph
      ? (fractionGlyphs[glyph] as number)
      : Number(numerator) / Number(denominator);
    return {
      amount: Number(whole ?? 0) + part,
      rest: text.replace(match, " "),
    };
  }
  const number = numberPattern.exec(text);
  if (!number) return undefined;
  const [match] = number;
  const grouped = /^\d{1,3}([   ,]\d{3})+$/u.test(match);
  const amount = grouped
    ? Number(match.replace(/[^\d]/gu, ""))
    : Number(match.replace(",", "."));
  return { amount, rest: text.replace(match, " ") };
}

/**
 * A denomination's face value in major units: "10 kroner" is 10, "50 øre"
 * 0.5, "½ krone" 0.5, "dollar" 1. Undefined when the text has neither a
 * number nor a word ("", "–").
 */
export function faceValue(denomination: string): number | undefined {
  const text = denomination.normalize("NFC").toLowerCase();
  const read = readAmount(text);
  const words = (read?.rest ?? text).match(/\p{L}+/gu) ?? [];
  if (!read && words.length === 0) return undefined;
  let value = read?.amount ?? 1;
  let minor = false;
  for (const word of words) {
    const scale = unitWords[word];
    if (scale !== undefined) value *= scale;
    else if (minorUnits.has(word)) minor = true;
  }
  return minor ? value / 100 : value;
}

/**
 * Smallest face value first; denominations whose value can't be read follow,
 * by name, and missing ones come last. Ties go by name, so the order is the
 * same everywhere.
 */
export function compareDenominations(
  a: string | undefined,
  b: string | undefined,
): number {
  if (a === undefined || b === undefined) {
    return a === b ? 0 : a === undefined ? 1 : -1;
  }
  const first = faceValue(a);
  const second = faceValue(b);
  if (first !== second) {
    if (first === undefined) return 1;
    if (second === undefined) return -1;
    return first - second;
  }
  return a.localeCompare(b, undefined, { numeric: true });
}
