import { isCountryCode } from "@coinslite/i18n";
import { searchWords } from "../catalog/searchWords";
import { type Material, itemLimits, materials } from "../items/rules";
import type { PhotoType } from "../photos/rules";

/**
 * The coin scanner (spec §16): what a scan suggests from the vision model's
 * reading of two photos and the Catalog. Pure, so the app shares the error
 * codes and limits and the rules are tested on their own.
 */

/** Error codes the scanner throws (ConvexError data). */
export const scannerErrors = {
  /** The scanner flag (and Premium, during the beta) doesn't let this person scan. */
  notAvailable: "SCANNER_NOT_AVAILABLE",
  /** More scans in a short time than anyone identifying their coins needs. */
  tooMany: "TOO_MANY_SCANS",
} as const;

export const scannerLimits = {
  /**
   * Bytes per photo sent to the vision model, which takes images of up to
   * 5 MB once base64-encoded. The app shrinks photos well below this first.
   */
  photoBytes: Math.floor((5 * 1024 * 1024 * 3) / 4),
  /** The longest side the app shrinks a scan photo to, in pixels. */
  photoPixels: 2000,
  /** Catalog entries the vision model chooses among, at most. */
  candidates: 8,
} as const;

/** A photo as the vision model takes it. */
export type ScanPhoto = { mediaType: PhotoType; base64: string };

/** What the vision model read from the photos of both sides. */
export type CoinReading = {
  /** False when the photos don't show a coin. */
  isCoin: boolean;
  /** A short name for the coin, in the person's language: "1 krone 1997". */
  title: string | null;
  /** The issuing country, ISO 3166-1 alpha-2. */
  country: string | null;
  year: number | null;
  /** Value and unit as the Catalog writes them: "1 krone", "2 euro". */
  denomination: string | null;
  series: string | null;
  material: string | null;
  mintMark: string | null;
  ruler: string | null;
  /** Millimetres. */
  diameter: number | null;
  /** The legends and other text on both sides. */
  inscriptions: string | null;
};

/** The JSON schema of a reading, for the vision model's structured output. */
export const readingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "isCoin",
    "title",
    "country",
    "year",
    "denomination",
    "series",
    "material",
    "mintMark",
    "ruler",
    "diameter",
    "inscriptions",
  ],
  properties: {
    isCoin: { type: "boolean" },
    title: nullable({ type: "string" }),
    country: nullable({ type: "string" }),
    year: nullable({ type: "integer" }),
    denomination: nullable({ type: "string" }),
    series: nullable({ type: "string" }),
    material: nullable({ type: "string", enum: [...materials] }),
    mintMark: nullable({ type: "string" }),
    ruler: nullable({ type: "string" }),
    diameter: nullable({ type: "number" }),
    inscriptions: nullable({ type: "string" }),
  },
} as const;

/** The JSON schema of the vision model's choice among Catalog entries. */
export const pickSchema = {
  type: "object",
  additionalProperties: false,
  required: ["key"],
  properties: { key: nullable({ type: "string" }) },
} as const;

function nullable<T extends object>(schema: T) {
  return { anyOf: [schema, { type: "null" }] } as const;
}

const textFields = [
  "title",
  "country",
  "denomination",
  "series",
  "material",
  "mintMark",
  "ruler",
  "inscriptions",
] as const;

/** A reading from the vision model's answer, or null when it doesn't have that shape. */
export function readingFrom(answer: unknown): CoinReading | null {
  if (typeof answer !== "object" || answer === null) return null;
  const value = answer as Record<string, unknown>;
  if (typeof value.isCoin !== "boolean") return null;
  const isTextOrNull = (field: unknown) =>
    field === null || typeof field === "string";
  const isNumberOrNull = (field: unknown) =>
    field === null || (typeof field === "number" && Number.isFinite(field));
  if (!textFields.every((name) => isTextOrNull(value[name]))) return null;
  if (!isNumberOrNull(value.year) || !isNumberOrNull(value.diameter))
    return null;
  return {
    isCoin: value.isCoin,
    title: value.title as string | null,
    country: value.country as string | null,
    year: value.year as number | null,
    denomination: value.denomination as string | null,
    series: value.series as string | null,
    material: value.material as string | null,
    mintMark: value.mintMark as string | null,
    ruler: value.ruler as string | null,
    diameter: value.diameter as number | null,
    inscriptions: value.inscriptions as string | null,
  };
}

/** The Catalog entry key the vision model chose; null for none, or an answer of another shape. */
export function pickFrom(answer: unknown): string | null {
  if (typeof answer !== "object" || answer === null) return null;
  const { key } = answer as Record<string, unknown>;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

/** A Catalog entry the reading might be, as the vision model and the ranking see it. */
export type ScanCandidate = {
  key: string;
  title: string;
  country?: string;
  denomination?: string;
  series?: string;
  yearFrom?: number;
  yearTo?: number;
  material?: Material;
  diameter?: number;
};

/** The descriptive facts a scan suggests for the Item, each checked against the Item's rules. */
export type ScanFacts = {
  country?: string;
  year?: number;
  denomination?: string;
  series?: string;
  material?: Material;
  mintMark?: string;
  ruler?: string;
  diameter?: number;
};

/** What a scan suggests: the Catalog entry it matched, or else the facts read. */
export type ScanSuggestion = {
  title: string;
  entry?: { key: string; title: string };
  facts: ScanFacts;
};

/** Trimmed text within `limit`, else undefined. */
function text(value: string | null, limit: number) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= limit ? trimmed : undefined;
}

/**
 * The reading's facts that an Item may hold. Anything the Item form would
 * refuse (an unknown country, a year in the future, a size out of range) is
 * left out rather than suggested. `today` is "YYYY-MM-DD".
 */
export function factsFrom(reading: CoinReading, today: string): ScanFacts {
  const country = reading.country?.trim().toUpperCase();
  const latestYear = Number(today.slice(0, 4)) + 1;
  const { year, diameter } = reading;
  const facts: ScanFacts = {
    country: country && isCountryCode(country) ? country : undefined,
    year:
      year !== null &&
      Number.isSafeInteger(year) &&
      year >= itemLimits.earliestYear &&
      year <= latestYear
        ? year
        : undefined,
    denomination: text(reading.denomination, itemLimits.denomination),
    series: text(reading.series, itemLimits.series),
    material: materials.find((material) => material === reading.material),
    mintMark: text(reading.mintMark, itemLimits.mintMark),
    ruler: text(reading.ruler, itemLimits.ruler),
    diameter:
      diameter !== null && diameter > 0 && diameter <= itemLimits.diameter
        ? diameter
        : undefined,
  };
  return Object.fromEntries(
    Object.entries(facts).filter(([, value]) => value !== undefined),
  ) as ScanFacts;
}

/**
 * What to suggest for a reading: the Catalog entry chosen, titled after it,
 * with the year read when the entry spans several years; or, without an
 * entry, every fact read and a title. Null when the reading says too little
 * to suggest anything, or isn't of a coin.
 */
export function suggestionFrom(
  reading: CoinReading,
  entry: ScanCandidate | null,
  today: string,
): ScanSuggestion | null {
  if (!reading.isCoin) return null;
  const facts = factsFrom(reading, today);
  if (entry) {
    const lastYear = entry.yearTo ?? entry.yearFrom;
    const singleYear =
      entry.yearFrom !== undefined && lastYear === entry.yearFrom;
    const yearFits =
      facts.year !== undefined &&
      !singleYear &&
      (entry.yearFrom === undefined || facts.year >= entry.yearFrom) &&
      (lastYear === undefined || facts.year <= lastYear);
    return {
      title: entry.title,
      entry: { key: entry.key, title: entry.title },
      facts: yearFits ? { year: facts.year } : {},
    };
  }
  const title =
    text(reading.title, itemLimits.title) ??
    text(
      [facts.denomination, facts.year].filter(Boolean).join(" "),
      itemLimits.title,
    );
  if (!title) return null;
  return { title, facts };
}

/** The words to look a reading up by in the Catalog: its denomination and series, else its title. */
export function lookupWords(reading: CoinReading) {
  const words = searchWords(
    [reading.denomination, reading.series].filter(Boolean).join(" "),
  );
  return words.length > 0 ? words : searchWords(reading.title ?? "");
}

/**
 * How many of `wanted`'s words `found` has, as a share of `wanted`'s. Numbers
 * must be equal ("1" isn't "10"); other words may differ in their ending
 * ("krone" is "kroner").
 */
function overlap(wanted: string | null | undefined, found?: string) {
  const want = searchWords(wanted ?? "");
  const have = searchWords(found ?? "");
  if (want.length === 0 || have.length === 0) return 0;
  const isNumber = (word: string) => /^\d+$/.test(word);
  const same = (a: string, b: string) =>
    isNumber(a) || isNumber(b) ? a === b : a.startsWith(b) || b.startsWith(a);
  return (
    want.filter((word) => have.some((each) => same(word, each))).length /
    want.length
  );
}

/**
 * The Catalog entries the reading might be, likeliest first, at most
 * `scannerLimits.candidates`. An entry of another country, or whose years
 * don't include the year read, is ruled out; the rest need their
 * denomination or series to agree with the reading.
 */
export function rankCandidates(
  reading: CoinReading,
  entries: ScanCandidate[],
): ScanCandidate[] {
  const facts = factsFrom(reading, "9999-12-31");
  const scored = entries.flatMap((entry) => {
    if (facts.country && entry.country && facts.country !== entry.country)
      return [];
    const lastYear = entry.yearTo ?? entry.yearFrom;
    if (
      facts.year !== undefined &&
      ((entry.yearFrom !== undefined && facts.year < entry.yearFrom) ||
        (lastYear !== undefined && facts.year > lastYear))
    )
      return [];
    const denomination = overlap(facts.denomination, entry.denomination);
    const series = overlap(facts.series, entry.series);
    if (denomination === 0 && series === 0) return [];
    const score =
      3 * denomination +
      2 * series +
      (facts.country && facts.country === entry.country ? 1 : 0) +
      (facts.material && facts.material === entry.material ? 1 : 0) +
      (facts.diameter &&
      entry.diameter &&
      Math.abs(facts.diameter - entry.diameter) <= 0.5
        ? 1
        : 0) +
      (facts.year !== undefined && entry.yearFrom === facts.year ? 1 : 0);
    return [{ entry, score }];
  });
  return scored
    .sort((a, b) => b.score - a.score || a.entry.key.localeCompare(b.entry.key))
    .slice(0, scannerLimits.candidates)
    .map(({ entry }) => entry);
}
