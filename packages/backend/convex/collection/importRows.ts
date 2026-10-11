import {
  type Locale,
  countryCodes,
  formatCountry,
  locales,
  parseMoney,
} from "@coinslite/i18n";
import { parseCsv } from "../catalog/csvText";
import {
  type GradingScale,
  type ItemType,
  type Strike,
  defaultScale,
  gradingScaleIds,
  gradingScales,
  isGrade,
} from "../items/grades";
import {
  type Grader,
  type StampCatalogue,
  graderNames,
  graders,
  stampCatalogueNames,
  stampCatalogues,
} from "../items/references";
import { type Material, materials } from "../items/rules";
import { type CsvColumn, csvColumns, exportLabels } from "./exportLabels";

/**
 * Reading a Collection CSV for import (spec: Import Items from a CSV file).
 * The file is laid out like the Collection export: its headings are the
 * export's column labels in any of the five languages, or the raw column
 * keys, plus three optional columns of the import's own. Each row's cells
 * are read back the way the export writes them, in any language: Item type,
 * Grade on its scale, Strike, material and its note, country name or code,
 * plain amounts, a grader or stamp catalogue by its name. Pure; the rules every Item must meet (items/rules.ts) are
 * applied when the row is checked against the person's Collection.
 */

export const importLimits = {
  /** Bytes of text: 5 MB. */
  fileSize: 5 * 1024 * 1024,
  /** Rows below the heading row. */
  rows: 2000,
  /** Rows one batch adds, all or nothing. */
  batch: 100,
} as const;

/** Why a whole file is refused. */
export const importErrors = {
  fileTooLarge: "FILE_TOO_LARGE",
  tooManyRows: "TOO_MANY_ROWS",
  unreadable: "UNREADABLE_FILE",
  noRows: "NO_ROWS",
  noKnownHeadings: "NO_KNOWN_HEADINGS",
  /** A batch of more than `importLimits.batch` rows. */
  batchTooLarge: "BATCH_TOO_LARGE",
} as const;

/** Why one row is left out; the rules' own codes (itemErrors) are used too. */
export const rowErrors = {
  unknownType: "UNKNOWN_TYPE",
  unknownScale: "UNKNOWN_SCALE",
  invalidGrade: "INVALID_GRADE",
  unknownStrike: "UNKNOWN_STRIKE",
  invalidCountry: "INVALID_COUNTRY",
  invalidAmount: "INVALID_AMOUNT",
  invalidNumber: "INVALID_NUMBER",
  otherCurrency: "OTHER_CURRENCY",
  unknownCatalogEntry: "UNKNOWN_CATALOG_ENTRY",
  tooManyAlbums: "TOO_MANY_ALBUMS",
} as const;

/** The import's own columns, besides the export's. */
export const extraColumns = ["notes", "album", "catalog_entry"] as const;
type Column = CsvColumn | (typeof extraColumns)[number];

/** One row read from the file, ready to be checked against the Collection. */
export type ImportRow = {
  /** The row's number in the file, the heading row being 1. */
  row: number;
  type: ItemType;
  title: string;
  year?: number;
  denomination?: string;
  gradingScale?: GradingScale;
  grade?: string;
  strike?: Strike;
  material?: Material;
  materialNote?: string;
  grader?: Grader;
  graderName?: string;
  certificateNumber?: string;
  stampCatalogue?: StampCatalogue;
  stampCatalogueName?: string;
  stampCatalogueNumber?: string;
  perforation?: string;
  watermark?: string;
  colour?: string;
  serialNumber?: string;
  signatures?: string;
  printer?: string;
  country?: string;
  quantity?: number;
  purchasePrice?: number;
  marketValue?: number;
  /** The currency column as written; it must be the Home currency. */
  currency?: string;
  purchaseDate?: string;
  source?: string;
  notes?: string;
  soldOn?: string;
  salePrice?: number;
  saleNote?: string;
  album?: string;
  catalogEntry?: string;
};

export type RejectedRow = { row: number; reason: string };

/** Lower case without accents or extra spaces, so headings and names match loosely. */
const folded = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Looks a folded text up among every language's words for the same things. */
function lookup<K extends string>(
  words: (locale: Locale) => Record<K, string>,
  raw: readonly K[],
) {
  const found = new Map<string, K>();
  for (const key of raw) found.set(folded(key), key);
  for (const locale of locales)
    for (const [key, word] of Object.entries(words(locale)) as [K, string][])
      found.set(folded(word), key);
  return (text: string) => found.get(folded(text));
}

const columnOf = lookup<Column>(
  (locale) => ({
    ...exportLabels[locale].columns,
    notes: "notes",
    album: "album",
    catalog_entry: "catalog_entry",
  }),
  [...csvColumns, ...extraColumns],
);
const typeOf = lookup<ItemType>(
  (locale) => exportLabels[locale].types,
  ["coin", "banknote", "stamp"],
);
const scaleOf = lookup<GradingScale>(
  (locale) => exportLabels[locale].scales,
  gradingScaleIds,
);
const strikeOf = lookup<Strike>(
  (locale) => exportLabels[locale].strikes,
  ["circulation", "bu", "proof"],
);
const materialOf = lookup<Material>(
  (locale) => exportLabels[locale].materials,
  materials,
);
const stampGradeOf = lookup<string>(
  (locale) => exportLabels[locale].stampGrades,
  gradingScales.stamp.grades,
);

/**
 * A grader or stamp catalogue by its name ("PCGS", "Michel"), or "other"
 * with the name as written; the word for "other" alone, in any language,
 * is "other" with no name.
 */
function referenceOf<K extends string>(
  names: Record<Exclude<K, "other">, string>,
  keys: readonly K[],
) {
  const known = lookup<K>(
    (locale) =>
      ({ ...names, other: exportLabels[locale].other }) as Record<K, string>,
    keys,
  );
  return (text: string | undefined) => {
    if (text === undefined) return {};
    const key = known(text);
    if (key === undefined) return { key: "other" as K, name: text };
    return { key };
  };
}
const graderOf = referenceOf<Grader>(graderNames, graders);
const stampCatalogueOf = referenceOf<StampCatalogue>(
  stampCatalogueNames,
  stampCatalogues,
);

let countryNames: Map<string, string> | undefined;
/** A country's code from its code or its name in any of the five languages. */
function countryOf(text: string) {
  if (!countryNames) {
    countryNames = new Map();
    for (const code of countryCodes) {
      countryNames.set(folded(code), code);
      for (const locale of locales)
        countryNames.set(folded(formatCountry(code, locale)), code);
    }
  }
  return countryNames.get(folded(text));
}

/** A Grade as the export writes it ("PF-65", "XF", "1−", "Used") as its stored code. */
function gradeOf(scale: GradingScale, text: string) {
  const code =
    scale === "stamp"
      ? stampGradeOf(text)
      : scale === "sheldon"
        ? /^(?:[A-Za-z]{2}-?)?(\d{1,2})$/.exec(text.trim())?.[1]
        : text.trim().toUpperCase().replace(/−/g, "-");
  return code !== undefined && isGrade(scale, code) ? code : undefined;
}

/** A row's problem: the reason it's left out. */
class RowProblem {
  constructor(readonly reason: string) {}
}
const problem = (reason: string): never => {
  throw new RowProblem(reason);
};

/** Reads one row's cells into an ImportRow; throws a RowProblem when it can't. */
function readRow(row: number, cells: Map<Column, string>): ImportRow {
  const text = (column: Column) => cells.get(column)?.trim() || undefined;
  const amount = (column: Column) => {
    const value = text(column);
    if (value === undefined) return undefined;
    // The export writes plain amounts ("1250.50"); a spreadsheet saved in a
    // language that groups with "." and marks decimals with "," reads too.
    return (
      parseMoney(value, "en") ??
      parseMoney(value, "de") ??
      problem(rowErrors.invalidAmount)
    );
  };
  const whole = (column: Column) => {
    const value = text(column);
    if (value === undefined) return undefined;
    return /^-?\d+$/.test(value)
      ? Number(value)
      : problem(rowErrors.invalidNumber);
  };

  const typeText = text("type");
  const type = typeText
    ? typeOf(typeText) ?? problem(rowErrors.unknownType)
    : problem(rowErrors.unknownType);
  const countryText = text("country");
  const country = countryText
    ? countryOf(countryText) ?? problem(rowErrors.invalidCountry)
    : undefined;
  const scaleText = text("gradingScale");
  const gradeText = text("grade");
  let gradingScale: GradingScale | undefined;
  let grade: string | undefined;
  if (gradeText !== undefined) {
    gradingScale = scaleText
      ? scaleOf(scaleText) ?? problem(rowErrors.unknownScale)
      : defaultScale(type, country);
    grade = gradeOf(gradingScale, gradeText) ?? problem(rowErrors.invalidGrade);
  }
  const strikeText = text("strike");
  const strike = strikeText
    ? strikeOf(strikeText) ?? problem(rowErrors.unknownStrike)
    : undefined;
  // As the export writes it: the material, then " · " and the note about it.
  const materialText = text("material");
  let material: Material | undefined;
  let materialNote: string | undefined;
  if (materialText !== undefined) {
    const [first = "", ...rest] = materialText.split(" · ");
    material = materialOf(first);
    materialNote = material
      ? rest.join(" · ").trim() || undefined
      : materialText;
  }

  const grader = graderOf(text("grader"));
  const stampCatalogue = stampCatalogueOf(text("stampCatalogue"));

  return {
    row,
    type,
    title: text("title") ?? "",
    year: whole("year"),
    denomination: text("denomination"),
    gradingScale,
    grade,
    strike,
    material,
    materialNote,
    grader: grader.key,
    graderName: grader.name,
    certificateNumber: text("certificateNumber"),
    stampCatalogue: stampCatalogue.key,
    stampCatalogueName: stampCatalogue.name,
    stampCatalogueNumber: text("stampCatalogueNumber"),
    perforation: text("perforation"),
    watermark: text("watermark"),
    colour: text("colour"),
    serialNumber: text("serialNumber"),
    signatures: text("signatures"),
    printer: text("printer"),
    country,
    quantity: whole("quantity"),
    purchasePrice: amount("purchasePrice"),
    marketValue: amount("marketValue"),
    currency: text("currency")?.toUpperCase(),
    purchaseDate: text("purchaseDate"),
    source: text("source"),
    notes: text("notes"),
    soldOn: text("soldOn"),
    salePrice: amount("salePrice"),
    saleNote: text("saleNote"),
    album: text("album"),
    catalogEntry: text("catalog_entry"),
  };
}

/** Leaves out the fields an object doesn't have, as Convex values need. */
export const defined = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;

/**
 * Reads a whole file: the rows it can read, the rows it can't with their
 * reasons, and the headings it doesn't know (ignored). A file it can't read
 * at all is a string: one of `importErrors`.
 */
export function readImportFile(text: string):
  | string
  | {
      rows: ImportRow[];
      rejected: RejectedRow[];
      ignoredHeadings: string[];
    } {
  if (new TextEncoder().encode(text).length > importLimits.fileSize)
    return importErrors.fileTooLarge;
  const parsed = parseCsv(text);
  if (!("records" in parsed)) return importErrors.unreadable;
  // Blank rows are skipped, but rows keep their number in the file (from 1).
  const [headings = [], ...records] = parsed.records
    .map((cells, index) => ({ cells, row: index + 1 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ""))
    .map(({ cells, row }) => Object.assign(cells, { row }));
  if (records.length === 0) return importErrors.noRows;
  if (records.length > importLimits.rows) return importErrors.tooManyRows;
  const columns = [...headings].map((heading) => columnOf(heading));
  if (!columns.some(Boolean)) return importErrors.noKnownHeadings;
  const ignoredHeadings = [...headings].filter(
    (heading, index) => !columns[index] && heading.trim() !== "",
  );

  const rows: ImportRow[] = [];
  const rejected: RejectedRow[] = [];
  for (const record of records) {
    const { row } = record;
    const cells = new Map<Column, string>();
    columns.forEach((column, at) => {
      if (column) cells.set(column, record[at] ?? "");
    });
    try {
      rows.push(defined(readRow(row, cells)));
    } catch (error) {
      if (!(error instanceof RowProblem)) throw error;
      rejected.push({ row, reason: error.reason });
    }
  }
  return { rows, rejected, ignoredHeadings };
}
