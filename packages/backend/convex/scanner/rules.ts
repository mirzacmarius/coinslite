import { isCountryCode } from "@coinslite/i18n";
import { type CatalogItemType, catalogItemTypes } from "../catalog/fields";
import { searchWords } from "../catalog/searchWords";
import {
  type GradingScale,
  defaultScale,
  gradingScales,
  isGrade,
} from "../items/grades";
import {
  type Material,
  fieldSuits,
  itemLimits,
  materials,
} from "../items/rules";
import type { PhotoType } from "../photos/rules";

/**
 * The scanner (spec §16): what a scan of a coin or banknote suggests from
 * the vision model's reading of two photos and the Catalog. Pure, so the
 * app shares the error codes and limits and the rules are tested on their
 * own.
 */

/** Error codes the scanner throws (ConvexError data). */
export const scannerErrors = {
  /** The scanner flag (and Premium, during the beta) doesn't let this person scan. */
  notAvailable: "SCANNER_NOT_AVAILABLE",
  /** More scans in a short time than anyone identifying their coins and banknotes needs. */
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

/** What a scan reads: the Item types the Catalog holds. */
export type ScanItemType = CatalogItemType;

/**
 * The scales a scan suggests a Grade on: the one an Item starts on
 * (`defaultScale`) for a coin or banknote of its country.
 */
const scanScales = [
  "norwegian",
  "sheldon",
  "european",
  "international",
] as const satisfies readonly GradingScale[];

/** A Grade as a scan suggests it: a code on its scale. */
export type ScanGrade = { scale: GradingScale; value: string };

/** What the vision model read from the photos of both sides. */
export type ScanReading = {
  /** A coin or a banknote; null when the photos show neither. */
  itemType: ScanItemType | null;
  /** A short name for the piece, in the person's language: "1 krone 1997". */
  title: string | null;
  /** The issuing country, ISO 3166-1 alpha-2. */
  country: string | null;
  year: number | null;
  /** Value and unit as the Catalog writes them: "1 krone", "2 euro". */
  denomination: string | null;
  series: string | null;
  ruler: string | null;
  /** A coin's. */
  material: string | null;
  mintMark: string | null;
  /** Millimetres; a coin's. */
  diameter: number | null;
  /** A banknote's, as printed on it. */
  serialNumber: string | null;
  signatures: string | null;
  printer: string | null;
  /** The legends and other text on both sides. */
  inscriptions: string | null;
  /** The Grade the photos show, on the scale the piece would start on. */
  grade: { scale: string; value: string } | null;
};

/** The JSON schema of a reading, for the vision model's structured output. */
export const readingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "itemType",
    "title",
    "country",
    "year",
    "denomination",
    "series",
    "ruler",
    "material",
    "mintMark",
    "diameter",
    "serialNumber",
    "signatures",
    "printer",
    "inscriptions",
    "grade",
  ],
  properties: {
    itemType: nullable({ type: "string", enum: [...catalogItemTypes] }),
    title: nullable({ type: "string" }),
    country: nullable({ type: "string" }),
    year: nullable({ type: "integer" }),
    denomination: nullable({ type: "string" }),
    series: nullable({ type: "string" }),
    ruler: nullable({ type: "string" }),
    material: nullable({ type: "string", enum: [...materials] }),
    mintMark: nullable({ type: "string" }),
    diameter: nullable({ type: "number" }),
    serialNumber: nullable({ type: "string" }),
    signatures: nullable({ type: "string" }),
    printer: nullable({ type: "string" }),
    inscriptions: nullable({ type: "string" }),
    grade: nullable({
      type: "object",
      additionalProperties: false,
      required: ["scale", "value"],
      properties: {
        scale: { type: "string", enum: [...scanScales] },
        // Every code on those scales; which suit the scale is checked after.
        value: {
          type: "string",
          enum: [
            ...new Set(
              scanScales.flatMap((scale) => [...gradingScales[scale].grades]),
            ),
          ],
        },
      },
    }),
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
  "ruler",
  "material",
  "mintMark",
  "serialNumber",
  "signatures",
  "printer",
  "inscriptions",
] as const;

/**
 * A reading from the vision model's answer, or null when it doesn't have
 * that shape. A Grade of another shape is left out, not the whole reading.
 */
export function readingFrom(answer: unknown): ScanReading | null {
  if (typeof answer !== "object" || answer === null) return null;
  const value = answer as Record<string, unknown>;
  const itemType = catalogItemTypes.find((type) => type === value.itemType);
  if (itemType === undefined && value.itemType !== null) return null;
  const isTextOrNull = (field: unknown) =>
    field === null || typeof field === "string";
  const isNumberOrNull = (field: unknown) =>
    field === null || (typeof field === "number" && Number.isFinite(field));
  if (!textFields.every((name) => isTextOrNull(value[name]))) return null;
  if (!isNumberOrNull(value.year) || !isNumberOrNull(value.diameter))
    return null;
  const grade = value.grade as Record<string, unknown> | null | undefined;
  return {
    itemType: itemType ?? null,
    title: value.title as string | null,
    country: value.country as string | null,
    year: value.year as number | null,
    denomination: value.denomination as string | null,
    series: value.series as string | null,
    ruler: value.ruler as string | null,
    material: value.material as string | null,
    mintMark: value.mintMark as string | null,
    diameter: value.diameter as number | null,
    serialNumber: value.serialNumber as string | null,
    signatures: value.signatures as string | null,
    printer: value.printer as string | null,
    inscriptions: value.inscriptions as string | null,
    grade:
      typeof grade === "object" &&
      grade !== null &&
      typeof grade.scale === "string" &&
      typeof grade.value === "string"
        ? { scale: grade.scale, value: grade.value }
        : null,
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

/**
 * The descriptive facts a scan suggests for the Item, each checked against
 * the Item's rules and suiting its type: a coin's material, mint mark and
 * diameter, a banknote's serial number, signatures and printer.
 */
export type ScanFacts = {
  country?: string;
  year?: number;
  denomination?: string;
  series?: string;
  material?: Material;
  mintMark?: string;
  ruler?: string;
  diameter?: number;
  serialNumber?: string;
  signatures?: string;
  printer?: string;
};

/**
 * What a scan suggests: an Item of the type read, the Catalog entry it
 * matched or else the facts read, and the Grade the photos show.
 */
export type ScanSuggestion = {
  itemType: ScanItemType;
  title: string;
  entry?: { key: string; title: string };
  facts: ScanFacts;
  /** From the photos alone: the form marks it as the scanner's. */
  grade?: ScanGrade;
};

/** Trimmed text within `limit`, else undefined. */
function text(value: string | null, limit: number) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= limit ? trimmed : undefined;
}

/**
 * The reading's facts that an Item of its type may hold. Anything the Item
 * form would refuse (an unknown country, a year in the future, a size out
 * of range, a coin's mint mark on a banknote) is left out rather than
 * suggested. `today` is "YYYY-MM-DD".
 */
export function factsFrom(reading: ScanReading, today: string): ScanFacts {
  const country = reading.country?.trim().toUpperCase();
  const latestYear = Number(today.slice(0, 4)) + 1;
  const { itemType, year, diameter } = reading;
  const suits = (field: Parameters<typeof fieldSuits>[0]) =>
    itemType !== null && fieldSuits(field, itemType);
  /** The reading's text for a field the type has, within its limit. */
  const typeText = (
    field: "mintMark" | "ruler" | "serialNumber" | "signatures" | "printer",
    limit: number,
  ) => (suits(field) ? text(reading[field], limit) : undefined);
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
    material: suits("material")
      ? materials.find((material) => material === reading.material)
      : undefined,
    mintMark: typeText("mintMark", itemLimits.mintMark),
    ruler: typeText("ruler", itemLimits.ruler),
    diameter:
      suits("diameter") &&
      diameter !== null &&
      diameter > 0 &&
      diameter <= itemLimits.diameter
        ? diameter
        : undefined,
    serialNumber: typeText("serialNumber", itemLimits.reference),
    signatures: typeText("signatures", itemLimits.reference),
    printer: typeText("printer", itemLimits.reference),
  };
  return Object.fromEntries(
    Object.entries(facts).filter(([, value]) => value !== undefined),
  ) as ScanFacts;
}

/**
 * The Grade the photos show, when it's one on the scale the Item starts on
 * (`defaultScale`, by its type and `country`); a Grade on another scale,
 * or not on its scale, isn't suggested.
 */
export function gradeFrom(
  reading: ScanReading,
  country: string | undefined,
): ScanGrade | undefined {
  const { itemType, grade } = reading;
  if (!itemType || !grade) return undefined;
  const scale = defaultScale(itemType, country);
  return grade.scale === scale && isGrade(scale, grade.value)
    ? { scale, value: grade.value }
    : undefined;
}

/**
 * What to suggest for a reading: the Catalog entry chosen, titled after it,
 * with what the entry can't say (the year read when it spans several years,
 * a banknote's serial number and signatures); or, without an entry, every
 * fact read and a title. Either way the Grade the photos show, if any. Null
 * when the reading says too little to suggest anything, or is of neither a
 * coin nor a banknote.
 */
export function suggestionFrom(
  reading: ScanReading,
  entry: ScanCandidate | null,
  today: string,
): ScanSuggestion | null {
  const { itemType } = reading;
  if (!itemType) return null;
  const facts = factsFrom(reading, today);
  const grade = gradeFrom(reading, entry ? entry.country : facts.country);
  const graded = grade && { grade };
  if (entry) {
    const singleYear =
      entry.yearFrom !== undefined && entry.yearTo === entry.yearFrom;
    const yearFits =
      facts.year !== undefined && !singleYear && coversYear(entry, facts.year);
    const { serialNumber, signatures } = facts;
    return {
      itemType,
      title: entry.title,
      entry: { key: entry.key, title: entry.title },
      facts: {
        ...(yearFits && { year: facts.year }),
        ...(serialNumber && { serialNumber }),
        ...(signatures && { signatures }),
      },
      ...graded,
    };
  }
  const title =
    text(reading.title, itemLimits.title) ??
    text(
      [facts.denomination, facts.year].filter(Boolean).join(" "),
      itemLimits.title,
    );
  if (!title) return null;
  return { itemType, title, facts, ...graded };
}

/**
 * Whether an entry's years include `year`: one without a last year is still
 * issued, as for suggested Catalog entries (spec §5.4), and one without
 * years can be of any.
 */
const coversYear = (entry: ScanCandidate, year: number) =>
  (entry.yearFrom === undefined || year >= entry.yearFrom) &&
  (entry.yearTo === undefined || year <= entry.yearTo);

/** The words to look a reading up by in the Catalog: its denomination and series, else its title. */
export function lookupWords(reading: ScanReading) {
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
  reading: ScanReading,
  entries: ScanCandidate[],
): ScanCandidate[] {
  const facts = factsFrom(reading, "9999-12-31");
  const scored = entries.flatMap((entry) => {
    if (facts.country && entry.country && facts.country !== entry.country)
      return [];
    if (facts.year !== undefined && !coversYear(entry, facts.year)) return [];
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
