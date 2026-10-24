import type { Locale } from "@coinslite/i18n";
import type { GradingScale, ItemType, Strike } from "../items/grades";
import {
  type Grader,
  type StampCatalogue,
  graderNames,
  graders,
  stampCatalogueNames,
  stampCatalogues,
} from "../items/references";
import type { Material } from "../items/rules";
import { exportLabels } from "./exportLabels";
import {
  type Column,
  dateOrderIn,
  guessColumns,
  importErrors,
  importLimits,
  isColumn,
  readTable,
} from "./importColumns";
import {
  type DateOrder,
  countryOf,
  currenciesOf,
  lookup,
  readAmount,
  readDate,
  readGrade,
  readMaterial,
  readNumistaNumber,
  readYear,
  scaleOf,
  strikeOf,
  typeOf,
} from "./importValues";

export { importErrors, importLimits } from "./importColumns";

/**
 * Reading a file for import (spec §7, Import). A Collection export reads
 * as it is: its headings are the export's column labels in any of the five
 * languages, or the raw column keys, plus optional columns of the import's
 * own. A file from another app (Numista, OpenNumismat, CoinManage) or a
 * spreadsheet reads by the columns the person confirmed, guessed from its
 * headings (importColumns.ts). Cells read the way the export writes them,
 * in any language, and the ways other apps do (importValues.ts): Item type,
 * Grade, Strike, material and its note, country name or code, amounts with
 * or without a currency, dates, a grader or stamp catalogue by its name.
 * Pure; the rules every Item must meet (items/rules.ts) are applied when
 * the row is checked against the person's Collection.
 */

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

/** One row read from the file, ready to be checked against the Collection. */
export type ImportRow = {
  /** The row's number in the file, the heading row being 1. */
  row: number;
  type: ItemType;
  title: string;
  year?: number;
  denomination?: string;
  series?: string;
  mintMark?: string;
  ruler?: string;
  mintage?: number;
  numistaNumber?: number;
  gradingScale?: GradingScale;
  grade?: string;
  gradeNote?: string;
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
  /**
   * The currency as written, upper case: the currency column's, else the
   * one written with an amount. It must be the Home currency.
   */
  currency?: string;
  purchaseDate?: string;
  source?: string;
  /** Kept in. */
  storage?: string;
  notes?: string;
  soldOn?: string;
  salePrice?: number;
  saleNote?: string;
  album?: string;
  catalogEntry?: string;
};

export type RejectedRow = { row: number; reason: string };

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

/** A row's problem: the reason it's left out. */
class RowProblem {
  constructor(readonly reason: string) {}
}
const problem = (reason: string): never => {
  throw new RowProblem(reason);
};

/** How the rows are read, besides their cells. */
export type ReadOptions = {
  /** The Item type of rows that don't give one. */
  itemType?: ItemType;
  /** How dates with the year last put day and month. */
  dateOrder: DateOrder;
  /** The language of what the import writes into notes. */
  locale: Locale;
};

/** What a row holds that CoinsLite can't store as it is, and so keeps in notes. */
type Unread = { country?: string; grade?: string };

/** Reads one row's cells into an ImportRow; throws a RowProblem when it can't. */
function readRow(
  row: number,
  cells: Map<Column, string>,
  options: ReadOptions,
): { read: ImportRow; unread: Unread } {
  const text = (column: Column) => cells.get(column)?.trim() || undefined;
  const marks: string[] = [];
  const amount = (column: Column) => {
    const value = text(column);
    if (value === undefined) return undefined;
    const read = readAmount(value) ?? problem(rowErrors.invalidAmount);
    if (read.currency) marks.push(read.currency);
    return read.amount;
  };
  const whole = (column: Column) => {
    const value = text(column);
    if (value === undefined) return undefined;
    return /^-?\d+$/.test(value)
      ? Number(value)
      : problem(rowErrors.invalidNumber);
  };
  const date = (column: Column) => {
    const value = text(column);
    return value === undefined ? undefined : readDate(value, options.dateOrder);
  };
  const unread: Unread = {};

  const typeText = text("type");
  const type = typeText
    ? (typeOf(typeText) ?? problem(rowErrors.unknownType))
    : (options.itemType ?? problem(rowErrors.unknownType));
  // A country CoinsLite doesn't know ("German Empire") is kept in the notes.
  const countryText = text("country");
  const country = countryText ? countryOf(countryText) : undefined;
  if (countryText && !country) unread.country = countryText;
  const yearText = text("year");
  const year =
    yearText === undefined
      ? undefined
      : readYear(yearText) === null
        ? problem(rowErrors.invalidNumber)
        : (readYear(yearText) ?? undefined);
  const scaleText = text("gradingScale");
  const gradeText = text("grade");
  const scale = scaleText
    ? (scaleOf(scaleText) ?? problem(rowErrors.unknownScale))
    : undefined;
  const grade = gradeText ? readGrade(type, country, scale, gradeText) : {};
  if (gradeText && !grade.grade && !grade.strike) unread.grade = gradeText;
  const strikeText = text("strike");
  const strike = strikeText
    ? (strikeOf(strikeText) ?? problem(rowErrors.unknownStrike))
    : grade.strike;
  const materialText = text("material");
  const { material, materialNote } = materialText
    ? readMaterial(materialText)
    : {};
  const numistaText = text("numista_number");
  const numistaNumber =
    numistaText === undefined
      ? undefined
      : (readNumistaNumber(numistaText) ?? problem(rowErrors.invalidNumber));
  const denomination =
    [text("denomination"), text("unit")].filter(Boolean).join(" ") || undefined;

  const purchasePrice = amount("purchasePrice");
  const marketValue = amount("marketValue");
  const salePrice = amount("salePrice");
  // Amounts in one currency: the column's, else the first written with one.
  const currency = text("currency")?.toUpperCase() ?? marks[0];
  if (
    currency !== undefined &&
    marks.some(
      (mark) =>
        !currenciesOf(mark).some((code) =>
          currenciesOf(currency).includes(code),
        ),
    )
  )
    problem(rowErrors.otherCurrency);

  const grader = graderOf(text("grader"));
  const stampCatalogue = stampCatalogueOf(text("stampCatalogue"));
  const labels = exportLabels[options.locale].columns;
  const notes =
    [text("notes"), unread.country && `${labels.country}: ${unread.country}`]
      .filter(Boolean)
      .join("\n") || undefined;
  const gradeNote =
    [grade.gradeNote, text("grade_note")].filter(Boolean).join(" · ") ||
    undefined;

  return {
    read: {
      row,
      type,
      // A file without titles names each Item by its denomination and year.
      title:
        text("title") ??
        [denomination, year].filter((part) => part !== undefined).join(" "),
      year,
      denomination,
      series: text("series"),
      mintMark: text("mint_mark"),
      ruler: text("ruler"),
      mintage: whole("mintage"),
      numistaNumber,
      gradingScale: grade.gradingScale,
      grade: grade.grade,
      gradeNote,
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
      purchasePrice,
      marketValue,
      currency,
      purchaseDate: date("purchaseDate"),
      source: text("source"),
      storage: text("storage"),
      notes,
      soldOn: date("soldOn"),
      salePrice,
      saleNote: text("saleNote"),
      album: text("album"),
      catalogEntry: text("catalog_entry"),
    },
    unread,
  };
}

/** Leaves out the fields an object doesn't have, as Convex values need. */
export const defined = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as T;

/** What a file holds that CoinsLite can't store as it is: shown before importing. */
export type UnreadValues = {
  /** Country names it doesn't know, kept in the Items' notes. */
  countries: string[];
  /** Grades no scale reads, kept as the Grade's note. */
  grades: string[];
};

/** How many of each unread value the preview names. */
const unreadShown = 20;

/** Which columns a file's rows are read by, and how. */
export type FileChoices = {
  /** Each heading's column, by its place; null leaves it out. Guessed when absent. */
  columns?: readonly (string | null)[];
  itemType?: ItemType;
  /** Guessed from the dates when absent; day first when they don't say. */
  dateOrder?: DateOrder;
  locale?: Locale;
};

/**
 * Reads a whole file: the rows it can read, the rows it can't with their
 * reasons, the headings left out, and what it keeps in notes. A file it
 * can't read at all is a string: one of `importErrors`.
 */
export function readImportFile(
  text: string,
  choices: FileChoices = {},
):
  | string
  | {
      rows: ImportRow[];
      rejected: RejectedRow[];
      ignoredHeadings: string[];
      unread: UnreadValues;
    } {
  const table = readTable(text);
  if (typeof table === "string") return table;
  const { headings, records } = table;
  let columns: (Column | null)[];
  if (choices.columns) {
    if (choices.columns.length > importLimits.columns)
      return importErrors.invalidColumns;
    columns = headings.map((_, at) => {
      const column = choices.columns?.[at] ?? null;
      return column !== null && isColumn(column) ? column : null;
    });
    const named = choices.columns.filter((column) => column !== null);
    if (
      named.some((column) => !isColumn(column)) ||
      new Set(named).size !== named.length
    )
      return importErrors.invalidColumns;
  } else columns = guessColumns(headings, records);
  if (!columns.some(Boolean)) return importErrors.noKnownHeadings;
  const ignoredHeadings = headings.filter(
    (heading, at) => !columns[at] && heading.trim() !== "",
  );
  const options: ReadOptions = {
    itemType: choices.itemType,
    dateOrder: choices.dateOrder ?? dateOrderIn(table, columns).order ?? "dmy",
    locale: choices.locale ?? "en",
  };

  const rows: ImportRow[] = [];
  const rejected: RejectedRow[] = [];
  const countries = new Set<string>();
  const grades = new Set<string>();
  for (const record of records) {
    const { row } = record;
    const cells = new Map<Column, string>();
    columns.forEach((column, at) => {
      if (column) cells.set(column, record[at] ?? "");
    });
    try {
      const { read, unread } = readRow(row, cells, options);
      rows.push(defined(read));
      if (unread.country) countries.add(unread.country);
      if (unread.grade) grades.add(unread.grade);
    } catch (error) {
      if (!(error instanceof RowProblem)) throw error;
      rejected.push({ row, reason: error.reason });
    }
  }
  return {
    rows,
    rejected,
    ignoredHeadings,
    unread: {
      countries: [...countries].slice(0, unreadShown),
      grades: [...grades].slice(0, unreadShown),
    },
  };
}
