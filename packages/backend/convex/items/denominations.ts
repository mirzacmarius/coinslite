/**
 * Ordering denominations by face value: "2 øre" before "½ krone" before
 * "10 kroner". Denominations are free text in many languages, so this reads
 * the first number (whole, decimal, fraction or grouped thousands) and counts
 * minor units (øre, cent, penny…) as hundredths. Pure, shared by the
 * Collection and the Catalog.
 */

/** Words for a hundredth of a currency's main unit, without accents. */
const minorUnits = new Set([
  "øre",
  "ore",
  "aurar",
  "eyrir",
  "cent",
  "cents",
  "centime",
  "centimes",
  "centimo",
  "centimos",
  "centavo",
  "centavos",
  "centesimo",
  "centesimi",
  "sent",
  "senti",
  "santims",
  "santimi",
  "centas",
  "centai",
  "penny",
  "pence",
  "penni",
  "pennia",
  "pfennig",
  "pfennige",
  "rappen",
  "ban",
  "bani",
  "kopek",
  "kopeks",
  "kopeck",
  "kopecks",
  "kopeyka",
  "kopeyki",
  "groschen",
  "grosz",
  "grosze",
  "groszy",
  "haler",
  "halere",
  "haleru",
  "heller",
  "filler",
  "para",
  "stotinka",
  "stotinki",
  "lipa",
  "lipe",
  "lepton",
  "lepta",
  "kurus",
  "qindarka",
  "qindarke",
  "kreuzer",
  "sen",
  "satang",
  // Short forms written after the number: 50p, 5c
  "p",
  "c",
]);

/** Words that are a share of the unit they go with: "half dollar", "dime". */
const shares: Record<string, number> = {
  half: 0.5,
  quarter: 0.25,
  dime: 0.1,
  halfpenny: 0.005,
  farthing: 0.0025,
};

const vulgarFractions: Record<string, number> = {
  "½": 1 / 2,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 1 / 5,
  "⅛": 1 / 8,
  "⅒": 1 / 10,
};

/**
 * The first number in a denomination, tried in this order where it starts:
 * "1 1/2", "1/2", "2½" or "½", "1 000" (grouped thousands), "2,5" or "2.5".
 */
const amountPattern =
  /(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+)?\s?([½¼¾⅓⅔⅕⅛⅒])|(\d{1,3}(?:[\s.,]\d{3})+)(?!\d)|(\d+(?:[.,]\d+)?)/u;

function amountOf(match: RegExpMatchArray) {
  const [, whole, numerator, denominator, top, bottom, before, vulgar] = match;
  const [grouped, decimal] = [match[8], match[9]];
  if (whole !== undefined)
    return Number(whole) + Number(numerator) / Number(denominator);
  if (top !== undefined) return Number(top) / Number(bottom);
  if (vulgar !== undefined)
    return Number(before ?? 0) + (vulgarFractions[vulgar] ?? 0);
  if (grouped !== undefined) return Number(grouped.replace(/[\s.,]/g, ""));
  return Number(decimal?.replace(",", "."));
}

/**
 * A denomination's value in its currency's main unit: "50 øre" is 0.5,
 * "2½ kroner" 2.5, "dollar" 1. Undefined when there's nothing to read.
 */
export function faceValue(denomination: string): number | undefined {
  const text = denomination
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const match = text.match(amountPattern);
  const words = new Set(text.split(/[^\p{L}]+/u).filter(Boolean));
  if (!match && words.size === 0) return undefined;
  let value = match ? amountOf(match) : 1;
  if (text.includes("¢")) words.add("c");
  for (const word of words) {
    if (minorUnits.has(word)) value /= 100;
    else value *= shares[word] ?? 1;
  }
  return value;
}

/**
 * Orders denominations by face value, smallest first; equal ones by their
 * text, and missing or unreadable ones last.
 */
export function compareDenominations(
  a: string | undefined,
  b: string | undefined,
): number {
  const first = a === undefined ? undefined : faceValue(a);
  const second = b === undefined ? undefined : faceValue(b);
  if (first === undefined || second === undefined) {
    if (first !== undefined) return -1;
    if (second !== undefined) return 1;
    return (a ?? "").localeCompare(b ?? "");
  }
  return first - second || (a ?? "").localeCompare(b ?? "");
}
