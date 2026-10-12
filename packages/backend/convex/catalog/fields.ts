import {
  type Locale,
  formatCountry,
  isCountryCode,
  locales,
} from "@coinslite/i18n";
import { type Strike, strikes } from "../items/grades";
import { type Material, materials } from "../items/rules";
import { formatCsvRecord, parseCsv } from "./csvText";
import { searchWords } from "./searchWords";

/**
 * What a Catalog node holds, and how it reads from and writes to a Catalog CSV
 * file. Pure, so the app can show the same columns and limits; the backend
 * checks every file.
 */

/** Roots are countries or Themes; entries are the leaves Items are made from. */
export const catalogKinds = ["country", "theme", "grouping", "entry"] as const;
export type CatalogKind = (typeof catalogKinds)[number];

/** The Catalog has coins and banknotes; stamps are always entered by hand. */
export const catalogItemTypes = ["coin", "banknote"] as const;
export type CatalogItemType = (typeof catalogItemTypes)[number];

/** Metals with a Spot price. */
export const preciousMetals = [
  "gold",
  "silver",
  "platinum",
  "palladium",
] as const;
export type PreciousMetal = (typeof preciousMetals)[number];

/** The metals a coin's alloy is made of, in its composition; each is also a material. */
export const alloyMetals = [
  "aluminium",
  "copper",
  "gold",
  "iron",
  "nickel",
  "palladium",
  "platinum",
  "silver",
  "tin",
  "zinc",
] as const;
export type AlloyMetal = (typeof alloyMetals)[number];

/** How a coin's edge is finished. */
export const coinEdges = [
  "plain",
  "reeded",
  "interruptedReeding",
  "lettered",
] as const;
export type CoinEdge = (typeof coinEdges)[number];

/** A mint mark that says the coin has none, as Philadelphia's dollars did. */
export const noMintMark = "none";

export const catalogErrors = {
  // The file
  emptyFile: "EMPTY_FILE",
  unclosedQuote: "UNCLOSED_QUOTE",
  missingColumn: "MISSING_COLUMN",
  unknownColumn: "UNKNOWN_COLUMN",
  duplicateColumn: "DUPLICATE_COLUMN",
  tooManyRows: "TOO_MANY_ROWS",
  // A row's cells
  idRequired: "ID_REQUIRED",
  invalidId: "INVALID_ID",
  duplicateId: "DUPLICATE_ID",
  titleRequired: "TITLE_REQUIRED",
  tooLong: "TOO_LONG",
  invalidValue: "INVALID_VALUE",
  invalidCountry: "INVALID_COUNTRY",
  invalidNumber: "INVALID_NUMBER",
  invalidYear: "INVALID_YEAR",
  /** Dates are YYYY-MM-DD, YYYY-MM or YYYY. */
  invalidDate: "INVALID_DATE",
  invalidUrl: "INVALID_URL",
  numistaData: "NUMISTA_DATA",
  // The node
  itemTypeRequired: "ITEM_TYPE_REQUIRED",
  notForType: "FIELD_NOT_FOR_TYPE",
  yearsReversed: "YEARS_REVERSED",
  /** A translation of the notes in the language they're written in. */
  sameLanguage: "SAME_LANGUAGE",
  /** It stopped being legal tender before it was issued. */
  datesReversed: "DATES_REVERSED",
  sourceRequired: "SOURCE_REQUIRED",
  /** Facts, notes and images each need their source, author, licence and link. */
  creditRequired: "CREDIT_REQUIRED",
  rootNotAddable: "ROOT_NOT_ADDABLE",
  // Its place in the tree
  parentNotFound: "PARENT_NOT_FOUND",
  parentIsEntry: "PARENT_IS_ENTRY",
  parentCycle: "PARENT_CYCLE",
  tooDeep: "TOO_DEEP",
  entryHasChildren: "ENTRY_HAS_CHILDREN",
  /** Items link to this entry, so it stays a Catalog entry. */
  entryHasItems: "ENTRY_HAS_ITEMS",
  /** A deletion or Item type change is running there (catalog/changes.ts); try again once it's done. */
  changeInProgress: "CHANGE_IN_PROGRESS",
  /** A move takes more nodes below along than one save can update. */
  tooManyNodesBelow: "TOO_MANY_NODES_BELOW",
} as const;
export type CatalogError = (typeof catalogErrors)[keyof typeof catalogErrors];

export const catalogLimits = {
  /** Data rows per CSV file; split bigger files. */
  rows: 3000,
  /** Characters per CSV file. */
  fileLength: 5_000_000,
  key: 64,
  /** Levels from a root down to its deepest entry. */
  depth: 8,
  title: 200,
  denomination: 100,
  series: 100,
  mint: 100,
  mintMark: 20,
  edgeLettering: 200,
  /** Each designer's name. */
  designer: 100,
  designers: 10,
  notes: 5000,
  provenance: 200,
  url: 2000,
  /** Grams. */
  weight: 100_000,
  /** Millimetres: a coin's diameter and thickness, a banknote's width and height. */
  diameter: 500,
  mintage: 1e12,
  sortOrder: 1_000_000_000,
  /** Linked Items the delete confirmation counts; past that it says there are more. */
  linkedItems: 1000,
  /** Nodes one delete removes, the node and everything below it. */
  deleteNodes: 2000,
  /** Nodes below that one save moves along with the nodes it moves. */
  moveNodes: 2000,
  /** Years are whole numbers, BC as negatives. */
  earliestYear: -3000,
  latestYear: 3000,
} as const;

/** Lists of Catalog entries load this many at a time. */
export const catalogPageSize = 50;

/** A node's own values, one per CSV column, with provenance flattened. */
export type NodeValues = {
  title: string;
  sortOrder: number;
  itemType?: CatalogItemType;
  country?: string;
  denomination?: string;
  series?: string;
  material?: Material;
  strike?: Strike;
  metal?: PreciousMetal;
  weight?: number;
  fineness?: number;
  diameter?: number;
  yearFrom?: number;
  yearTo?: number;
  mint?: string;
  /** "none" when the coin has no mint mark. */
  mintMark?: string;
  /** "silver 90%; copper 10%", in `alloyMetals`. */
  composition?: string;
  edge?: CoinEdge;
  edgeLettering?: string;
  thickness?: number;
  width?: number;
  height?: number;
  /** Names separated by "; ". */
  designers?: string;
  /** How many were struck or printed. */
  mintage?: number;
  /** YYYY-MM-DD, YYYY-MM or YYYY. */
  issueDate?: string;
  /** When it stopped being legal tender: YYYY-MM-DD, YYYY-MM or YYYY. */
  withdrawalDate?: string;
  /** The language the notes are written in, as their source wrote them; English when unset. */
  notesLanguage?: string;
  technicalDetails?: string;
  historicalNotes?: string;
  imageUrl?: string;
  numistaId?: number;
} & Partial<Record<ProvenanceKey | TranslationKey, string>>;

/** The language notes are in when nothing says otherwise. */
export const defaultNotesLanguage = "en";

const capitalised = <T extends string>(text: T) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}` as Capitalize<T>;

/** The notes in one of the app's languages, credited on their own: "notesDe". */
type TranslationGroup = `notes${Capitalize<Locale>}`;
const translationGroupOf = (locale: Locale) =>
  `notes${capitalised(locale)}` as TranslationGroup;
/** A translated note: "historicalNotesDe". */
type TranslationKey =
  `${"technicalDetails" | "historicalNotes"}${Capitalize<Locale>}`;
export const translationKeysOf = (locale: Locale) => ({
  technicalDetails: `technicalDetails${capitalised(locale)}` as TranslationKey,
  historicalNotes: `historicalNotes${capitalised(locale)}` as TranslationKey,
});

/** Groups of values stored with their provenance on the node. */
const storedGroups = ["facts", "notes", "image"] as const;
const provenanceGroups = [
  ...storedGroups,
  ...locales.map(translationGroupOf),
] as const;
const provenanceParts = ["source", "author", "licence", "link"] as const;
type ProvenanceGroup = (typeof storedGroups)[number] | TranslationGroup;
type ProvenancePart = (typeof provenanceParts)[number];
type ProvenanceKey = `${ProvenanceGroup}${Capitalize<ProvenancePart>}`;
type ValueKey = keyof NodeValues;

/** "facts" and "source" make factsSource; "notesDe" and "source" make notesDeSource. */
export function provenanceKey(group: ProvenanceGroup, part: ProvenancePart) {
  return `${group}${capitalised(part)}` as ProvenanceKey;
}

/** The locale a translation group holds, if it is one. */
const localeOfGroup = (group: ProvenanceGroup) =>
  locales.find((locale) => translationGroupOf(locale) === group);

/** facts_source, or for a translation notes_source_de. */
const provenanceColumn = (group: ProvenanceGroup, part: ProvenancePart) => {
  const locale = localeOfGroup(group);
  return locale ? `notes_${part}_${locale}` : `${group}_${part}`;
};

const translationValueKeys = new Set<string>(
  locales.flatMap((locale) => Object.values(translationKeysOf(locale))),
);
const provenanceKeys = new Set<string>(
  provenanceGroups.flatMap((group) =>
    provenanceParts.map((part) => provenanceKey(group, part)),
  ),
);

/** The values each provenance record covers. */
const groupValues: Record<ProvenanceGroup, ValueKey[]> = {
  facts: [
    "denomination",
    "series",
    "material",
    "strike",
    "metal",
    "weight",
    "fineness",
    "diameter",
    "yearFrom",
    "yearTo",
    "mint",
    "mintMark",
    "composition",
    "edge",
    "edgeLettering",
    "thickness",
    "width",
    "height",
    "designers",
    "mintage",
    "issueDate",
    "withdrawalDate",
  ],
  notes: ["technicalDetails", "historicalNotes"],
  image: ["imageUrl"],
  ...(Object.fromEntries(
    locales.map((locale) => [
      translationGroupOf(locale),
      Object.values(translationKeysOf(locale)),
    ]),
  ) as Record<TranslationGroup, ValueKey[]>),
};

/** Coins only: a banknote has no metal, coin size, edge or mint. */
export const coinOnlyValues = [
  "material",
  "metal",
  "weight",
  "fineness",
  "diameter",
  "thickness",
  "composition",
  "edge",
  "edgeLettering",
  "mint",
  "mintMark",
] as const satisfies readonly ValueKey[];

class CellError {
  constructor(readonly code: CatalogError) {}
}
const fail = (code: CatalogError): never => {
  throw new CellError(code);
};

type Read = (cell: string) => string | number | undefined;

const text =
  (limit: number): Read =>
  (cell) => {
    const value = cell.trim();
    if (value.length > limit) fail(catalogErrors.tooLong);
    return value || undefined;
  };

const oneOf =
  (values: readonly string[]): Read =>
  (cell) => {
    const value = cell.trim().toLowerCase();
    if (!value) return undefined;
    return (
      values.find((option) => option.toLowerCase() === value) ??
      fail(catalogErrors.invalidValue)
    );
  };

/** A decimal above zero, up to `max`. */
const measure =
  (max: number): Read =>
  (cell) => {
    const value = cell.trim();
    if (!value) return undefined;
    const number = Number(value);
    if (!/^\d+(\.\d+)?$/.test(value) || number <= 0 || number > max)
      fail(catalogErrors.invalidNumber);
    return number;
  };

const year: Read = (cell) => {
  const value = cell.trim();
  if (!value) return undefined;
  const number = Number(value);
  if (
    !/^-?\d+$/.test(value) ||
    number < catalogLimits.earliestYear ||
    number > catalogLimits.latestYear
  )
    fail(catalogErrors.invalidYear);
  return number;
};

/** A whole number from zero up to `max`. */
const count =
  (max: number): Read =>
  (cell) => {
    const value = cell.trim();
    if (!value) return undefined;
    const number = Number(value);
    if (!/^\d+$/.test(value) || number > max) fail(catalogErrors.invalidNumber);
    return number;
  };

/** YYYY-MM-DD, YYYY-MM or YYYY, a day that exists. */
const date: Read = (cell) => {
  const value = cell.trim();
  if (!value) return undefined;
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) return fail(catalogErrors.invalidDate);
  const [, year, month = "01", day = "01"] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  )
    fail(catalogErrors.invalidDate);
  return value;
};

/** "Silver 90 %; copper 10" reads as "silver 90%; copper 10%": known metals, each once, 100% at most. */
const composition: Read = (cell) => {
  const value = cell.trim();
  if (!value) return undefined;
  const parts = value.split(";").map((part) => {
    const match = /^([a-z]+)\s+(\d+(?:\.\d+)?)\s*%?$/i.exec(part.trim());
    const metal = alloyMetals.find(
      (known) => known === match?.[1]?.toLowerCase(),
    );
    const percent = Number(match?.[2]);
    if (!match || !metal || !(percent > 0)) fail(catalogErrors.invalidValue);
    return { metal: metal as AlloyMetal, percent };
  });
  const total = parts.reduce((sum, { percent }) => sum + percent, 0);
  if (
    total > 100.001 ||
    new Set(parts.map(({ metal }) => metal)).size !== parts.length
  )
    fail(catalogErrors.invalidValue);
  return formatComposition(parts);
};

/** A composition as stored, in the words CSV files use. */
export const formatComposition = (
  parts: ReadonlyArray<{ metal: AlloyMetal; percent: number }>,
) => parts.map(({ metal, percent }) => `${metal} ${percent}%`).join("; ");

/** A composition's parts, from the words CSV files use. */
export const parseComposition = (text: string) =>
  text.split("; ").map((part) => {
    const [metal, percent] = part.split(" ");
    return {
      metal: metal as AlloyMetal,
      percent: Number.parseFloat(percent as string),
    };
  });

/** Names separated by semicolons, each within the limit. */
const designers: Read = (cell) => {
  const value = cell.trim();
  if (!value) return undefined;
  const names = value.split(";").map((name) => name.trim());
  if (names.some((name) => !name) || names.length > catalogLimits.designers)
    fail(catalogErrors.invalidValue);
  if (names.some((name) => name.length > catalogLimits.designer))
    fail(catalogErrors.tooLong);
  return names.join("; ");
};

/** A language code such as "en" or "nb", lowercased. */
const language: Read = (cell) => {
  const value = cell.trim().toLowerCase();
  if (!value) return undefined;
  return /^[a-z]{2,3}$/.test(value) ? value : fail(catalogErrors.invalidValue);
};

/** Any mark, or "none" in any case for a coin with none. */
const mintMark: Read = (cell) => {
  const value = text(catalogLimits.mintMark)(cell);
  return typeof value === "string" && value.toLowerCase() === noMintMark
    ? noMintMark
    : value;
};

const country: Read = (cell) => {
  const value = cell.trim().toUpperCase();
  if (!value) return undefined;
  return isCountryCode(value) ? value : fail(catalogErrors.invalidCountry);
};

const sortOrder: Read = (cell) => {
  const value = cell.trim();
  if (!value) return 0;
  const number = Number(value);
  if (
    !/^-?\d+(\.\d+)?$/.test(value) ||
    Math.abs(number) > catalogLimits.sortOrder
  )
    fail(catalogErrors.invalidNumber);
  return number;
};

const numistaId: Read = (cell) => {
  const value = cell.trim();
  if (!value) return undefined;
  const number = Number(value);
  if (!/^\d+$/.test(value) || number < 1 || !Number.isSafeInteger(number))
    fail(catalogErrors.invalidNumber);
  return number;
};

/** No Numista data is stored (ADR 0003): no fact, note or image may come from it. */
const notFromNumista =
  (read: Read): Read =>
  (cell) => {
    const value = read(cell);
    if (typeof value === "string" && /numista/i.test(value))
      fail(catalogErrors.numistaData);
    return value;
  };

const url: Read = notFromNumista((cell) => {
  const value = cell.trim();
  if (!value) return undefined;
  if (value.length > catalogLimits.url) fail(catalogErrors.tooLong);
  let protocol = "";
  try {
    protocol = new URL(value).protocol;
  } catch {
    fail(catalogErrors.invalidUrl);
  }
  if (protocol !== "https:" && protocol !== "http:")
    fail(catalogErrors.invalidUrl);
  return value;
});

const provenanceText = notFromNumista(text(catalogLimits.provenance));

const provenanceColumns = Object.fromEntries(
  provenanceGroups.flatMap((group) =>
    provenanceParts.map((part) => [
      provenanceColumn(group, part),
      {
        value: provenanceKey(group, part),
        read: part === "link" ? url : provenanceText,
      },
    ]),
  ),
) as Record<string, { value: ProvenanceKey; read: Read }>;

/** The columns holding a node's values, in file order. */
const valueColumns: Record<string, { value: ValueKey; read: Read }> = {
  item_type: { value: "itemType", read: oneOf(catalogItemTypes) },
  title: { value: "title", read: text(catalogLimits.title) },
  country: { value: "country", read: country },
  denomination: {
    value: "denomination",
    read: text(catalogLimits.denomination),
  },
  series: { value: "series", read: text(catalogLimits.series) },
  material: { value: "material", read: oneOf(materials) },
  strike: { value: "strike", read: oneOf(strikes) },
  metal: { value: "metal", read: oneOf(preciousMetals) },
  weight_g: { value: "weight", read: measure(catalogLimits.weight) },
  fineness: { value: "fineness", read: measure(1) },
  diameter_mm: { value: "diameter", read: measure(catalogLimits.diameter) },
  year_from: { value: "yearFrom", read: year },
  year_to: { value: "yearTo", read: year },
  mint: { value: "mint", read: notFromNumista(text(catalogLimits.mint)) },
  mint_mark: { value: "mintMark", read: mintMark },
  composition: { value: "composition", read: composition },
  edge: { value: "edge", read: oneOf(coinEdges) },
  edge_lettering: {
    value: "edgeLettering",
    read: text(catalogLimits.edgeLettering),
  },
  thickness_mm: { value: "thickness", read: measure(catalogLimits.diameter) },
  width_mm: { value: "width", read: measure(catalogLimits.diameter) },
  height_mm: { value: "height", read: measure(catalogLimits.diameter) },
  designers: { value: "designers", read: notFromNumista(designers) },
  mintage: { value: "mintage", read: count(catalogLimits.mintage) },
  issue_date: { value: "issueDate", read: date },
  withdrawal_date: { value: "withdrawalDate", read: date },
  notes_language: { value: "notesLanguage", read: language },
  ...Object.fromEntries(
    locales.flatMap((locale) => {
      const keys = translationKeysOf(locale);
      return [
        [
          `technical_details_${locale}`,
          { value: keys.technicalDetails, read: text(catalogLimits.notes) },
        ],
        [
          `historical_notes_${locale}`,
          { value: keys.historicalNotes, read: text(catalogLimits.notes) },
        ],
      ];
    }),
  ),
  technical_details: {
    value: "technicalDetails",
    read: text(catalogLimits.notes),
  },
  historical_notes: {
    value: "historicalNotes",
    read: text(catalogLimits.notes),
  },
  image_url: { value: "imageUrl", read: url },
  sort_order: { value: "sortOrder", read: sortOrder },
  numista_id: { value: "numistaId", read: numistaId },
  ...provenanceColumns,
};

/**
 * Every Catalog CSV column, in the order exports write them: the spec's
 * columns first, then the Numista cross-reference and the provenance of each
 * group of facts, then the technical facts added since, the notes' language
 * and the notes in each of the app's languages with their credit. A file may
 * leave out any column but id and title.
 */
export const catalogCsvColumns = [
  "id",
  "parent_id",
  "item_type",
  "title",
  "country",
  "denomination",
  "series",
  "material",
  "strike",
  "metal",
  "weight_g",
  "fineness",
  "diameter_mm",
  "year_from",
  "year_to",
  "technical_details",
  "historical_notes",
  "image_url",
  "image_source",
  "image_author",
  "image_licence",
  "sort_order",
  "is_addable",
  "numista_id",
  "image_link",
  "facts_source",
  "facts_author",
  "facts_licence",
  "facts_link",
  "notes_source",
  "notes_author",
  "notes_licence",
  "notes_link",
  "mint",
  "mint_mark",
  "composition",
  "edge",
  "edge_lettering",
  "thickness_mm",
  "width_mm",
  "height_mm",
  "designers",
  "mintage",
  "issue_date",
  "withdrawal_date",
  "notes_language",
  ...locales.flatMap((locale) => [
    `technical_details_${locale}`,
    `historical_notes_${locale}`,
    ...provenanceParts.map((part) =>
      provenanceColumn(translationGroupOf(locale), part),
    ),
  ]),
];

const columnOf = Object.fromEntries(
  Object.entries(valueColumns).map(([column, { value }]) => [value, column]),
) as Record<ValueKey, string>;

/** A problem with a row of the file; row 1 is the header, as in a spreadsheet. */
export type RowError = { row: number; column?: string; code: CatalogError };

/** One row of a Catalog CSV file, read but not yet checked against the Catalog. */
export type FileRow = {
  row: number;
  /** The node's id. */
  key: string;
  /** null for a root; undefined when the file has no parent_id column. */
  parentKey?: string | null;
  /** Undefined when the file has no is_addable column. */
  addable?: boolean;
  /** Only the file's columns; a key set to undefined is cleared. */
  values: Partial<NodeValues>;
};

/** Ids are lowercase letters, digits, ".", "_" and "-", starting with a letter or digit. */
const keyPattern = new RegExp(
  `^[a-z0-9][a-z0-9._-]{0,${catalogLimits.key - 1}}$`,
);

const readKey = (cell: string) => {
  const value = cell.trim().toLowerCase();
  return value && keyPattern.test(value) ? value : undefined;
};

const readBoolean = (cell: string) => {
  const value = cell.trim().toLowerCase();
  if (["true", "yes", "1"].includes(value)) return true;
  if (["false", "no", "0", ""].includes(value)) return false;
  return fail(catalogErrors.invalidValue);
};

/** Reads a Catalog CSV file: the header, then each row's cells. */
export function readCatalogFile(csv: string): {
  rows: FileRow[];
  errors: RowError[];
} {
  if (csv.length > catalogLimits.fileLength)
    return { rows: [], errors: [{ row: 1, code: catalogErrors.tooManyRows }] };
  const parsed = parseCsv(csv);
  if ("unclosedQuoteAt" in parsed)
    return {
      rows: [],
      errors: [
        { row: parsed.unclosedQuoteAt, code: catalogErrors.unclosedQuote },
      ],
    };
  const [header = [], ...records] = parsed.records;
  const columns = header.map((name) => name.trim().toLowerCase());

  const errors: RowError[] = [];
  const known = new Set<string>(catalogCsvColumns);
  columns.forEach((column, index) => {
    if (!known.has(column))
      errors.push({ row: 1, column, code: catalogErrors.unknownColumn });
    else if (columns.indexOf(column) !== index)
      errors.push({ row: 1, column, code: catalogErrors.duplicateColumn });
  });
  for (const column of ["id", "title"]) {
    if (!columns.includes(column))
      errors.push({ row: 1, column, code: catalogErrors.missingColumn });
  }
  if (errors.length > 0) return { rows: [], errors };

  const filled = records
    .map((cells, index) => ({ cells, row: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ""));
  if (filled.length === 0)
    return { rows: [], errors: [{ row: 1, code: catalogErrors.emptyFile }] };
  if (filled.length > catalogLimits.rows)
    return {
      rows: [],
      errors: [
        {
          row: (filled[catalogLimits.rows] as { row: number }).row,
          code: catalogErrors.tooManyRows,
        },
      ],
    };

  const rows: FileRow[] = [];
  const seen = new Set<string>();
  for (const { cells, row } of filled) {
    const cell = (column: string) => cells[columns.indexOf(column)] ?? "";
    const rowErrors: RowError[] = [];
    const attempt = <T>(column: string, read: () => T) => {
      try {
        return read();
      } catch (error) {
        if (!(error instanceof CellError)) throw error;
        rowErrors.push({ row, column, code: error.code });
        return undefined;
      }
    };

    const key = readKey(cell("id"));
    if (key === undefined) {
      errors.push({
        row,
        column: "id",
        code: cell("id").trim()
          ? catalogErrors.invalidId
          : catalogErrors.idRequired,
      });
      continue;
    }
    if (seen.has(key)) {
      errors.push({ row, column: "id", code: catalogErrors.duplicateId });
      continue;
    }
    seen.add(key);

    const fileRow: FileRow = { row, key, values: {} };
    if (columns.includes("parent_id")) {
      // An id that can't exist is simply not found.
      fileRow.parentKey = cell("parent_id").trim().toLowerCase() || null;
    }
    if (columns.includes("is_addable"))
      fileRow.addable = attempt("is_addable", () =>
        readBoolean(cell("is_addable")),
      );
    for (const column of columns) {
      const spec = valueColumns[column];
      if (!spec) continue;
      const value = attempt(column, () => spec.read(cell(column)));
      if (rowErrors.some((error) => error.column === column)) continue;
      (fileRow.values as Record<string, unknown>)[spec.value] = value;
    }
    if (!fileRow.values.title && !rowErrors.some((e) => e.column === "title"))
      rowErrors.push({
        row,
        column: "title",
        code: catalogErrors.titleRequired,
      });

    errors.push(...rowErrors);
    rows.push(fileRow);
  }
  return { rows, errors };
}

/**
 * The rules a node's values must meet once the file is merged into it.
 * `uploadedImage` says the node keeps an image an admin uploaded, which the
 * file's image credit then covers.
 */
export function checkNode(
  values: Partial<NodeValues>,
  kind: CatalogKind,
  { uploadedImage = false }: { uploadedImage?: boolean } = {},
): Array<{ column: string; code: CatalogError }> {
  const problems: Array<{ column: string; code: CatalogError }> = [];
  if (kind === "entry" && values.itemType === undefined)
    problems.push({
      column: "item_type",
      code: catalogErrors.itemTypeRequired,
    });
  if (values.itemType === "banknote") {
    for (const value of coinOnlyValues) {
      if (values[value] !== undefined)
        problems.push({
          column: columnOf[value],
          code: catalogErrors.notForType,
        });
    }
  }
  if (
    values.yearFrom !== undefined &&
    values.yearTo !== undefined &&
    values.yearTo < values.yearFrom
  )
    problems.push({ column: "year_to", code: catalogErrors.yearsReversed });
  if (
    values.issueDate !== undefined &&
    values.withdrawalDate !== undefined &&
    datesReversed(values.issueDate, values.withdrawalDate)
  )
    problems.push({
      column: "withdrawal_date",
      code: catalogErrors.datesReversed,
    });
  // Catalog data of unknown origin is never stored (ADR 0003), and each
  // group of facts, notes and images is credited in full: source, author,
  // licence and link.
  for (const group of provenanceGroups) {
    const hasData =
      groupValues[group].some((value) => values[value] !== undefined) ||
      (group === "image" && uploadedImage);
    const credited = provenanceParts.some(
      (part) => values[provenanceKey(group, part)] !== undefined,
    );
    if (!hasData && !credited) continue;
    if (values[provenanceKey(group, "source")] === undefined)
      problems.push({
        column: provenanceColumn(group, "source"),
        code: catalogErrors.sourceRequired,
      });
    // Credit for data that isn't there yet needs only its source.
    if (!hasData) continue;
    for (const part of ["author", "licence", "link"] as const) {
      if (values[provenanceKey(group, part)] === undefined)
        problems.push({
          column: provenanceColumn(group, part),
          code: catalogErrors.creditRequired,
        });
    }
  }
  // The notes themselves are in their own language; a translation adds another.
  const own = locales.find(
    (locale) => locale === (values.notesLanguage ?? defaultNotesLanguage),
  );
  if (own) {
    const keys = translationKeysOf(own);
    const translated = (["technicalDetails", "historicalNotes"] as const).find(
      (note) => values[keys[note]] !== undefined,
    );
    if (translated)
      problems.push({
        column: columnOf[keys[translated]],
        code: catalogErrors.sameLanguage,
      });
  }
  return problems;
}

/**
 * Whether a date comes before another, as far as both say: 1903-12-31 comes
 * before 1904, but 1904-03 doesn't come before 1904.
 */
function datesReversed(from: string, to: string) {
  const length = Math.min(from.length, to.length);
  return to.slice(0, length) < from.slice(0, length);
}

/** Where a group of facts comes from, as stored on a node. */
export type Provenance = {
  source: string;
  author?: string;
  licence?: string;
  link?: string;
};

/** The notes in another of the app's languages, with their own credit. */
export type NotesTranslation = {
  technicalDetails?: string;
  historicalNotes?: string;
  provenance: Provenance;
};

/** The stored form of a node's values. */
export type NodeFields = Omit<
  NodeValues,
  ProvenanceKey | TranslationKey | "composition" | "designers"
> & {
  composition?: Array<{ metal: AlloyMetal; percent: number }>;
  designers?: string[];
  factsProvenance?: Provenance;
  notesProvenance?: Provenance;
  imageProvenance?: Provenance;
  notesTranslations?: Partial<Record<Locale, NotesTranslation>>;
};

/** A provenance record from its flattened values, if it has a source. */
function provenanceOf(values: NodeValues, group: ProvenanceGroup) {
  const source = values[provenanceKey(group, "source")];
  if (source === undefined) return undefined;
  const record: Provenance = { source };
  for (const part of ["author", "licence", "link"] as const) {
    const value = values[provenanceKey(group, part)];
    if (value !== undefined) record[part] = value;
  }
  return record;
}

/** Stored fields from values, dropping the ones that are unset. */
export function fieldsFromValues(values: NodeValues): NodeFields {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && !isProvenanceKey(key) && !isTranslationKey(key))
      fields[key] = value;
  }
  if (values.composition !== undefined)
    fields.composition = parseComposition(values.composition);
  if (values.designers !== undefined)
    fields.designers = values.designers.split("; ");
  for (const group of storedGroups) {
    const record = provenanceOf(values, group);
    if (record) fields[`${group}Provenance`] = record;
  }
  const translations: Partial<Record<Locale, NotesTranslation>> = {};
  for (const locale of locales) {
    const provenance = provenanceOf(values, translationGroupOf(locale));
    if (!provenance) continue;
    const keys = translationKeysOf(locale);
    const technicalDetails = values[keys.technicalDetails];
    const historicalNotes = values[keys.historicalNotes];
    translations[locale] = {
      ...(technicalDetails !== undefined && { technicalDetails }),
      ...(historicalNotes !== undefined && { historicalNotes }),
      provenance,
    };
  }
  if (Object.keys(translations).length > 0)
    fields.notesTranslations = translations;
  return fields as NodeFields;
}

/** A stored node's values, one per CSV column. */
export function valuesFromFields(fields: NodeFields): NodeValues {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(columnOf)) {
    const value = (fields as Record<string, unknown>)[key];
    if (value !== undefined && !isProvenanceKey(key) && !isTranslationKey(key))
      values[key] = value;
  }
  if (fields.composition !== undefined)
    values.composition = formatComposition(fields.composition);
  if (fields.designers !== undefined)
    values.designers = fields.designers.join("; ");
  const setProvenance = (group: ProvenanceGroup, record?: Provenance) => {
    if (!record) return;
    for (const part of provenanceParts) {
      if (record[part] !== undefined)
        values[provenanceKey(group, part)] = record[part];
    }
  };
  for (const group of storedGroups) {
    setProvenance(group, fields[`${group}Provenance`]);
  }
  for (const locale of locales) {
    const translation = fields.notesTranslations?.[locale];
    if (!translation) continue;
    const keys = translationKeysOf(locale);
    if (translation.technicalDetails !== undefined)
      values[keys.technicalDetails] = translation.technicalDetails;
    if (translation.historicalNotes !== undefined)
      values[keys.historicalNotes] = translation.historicalNotes;
    setProvenance(translationGroupOf(locale), translation.provenance);
  }
  return values as NodeValues;
}

const isProvenanceKey = (key: string): key is ProvenanceKey =>
  provenanceKeys.has(key);
const isTranslationKey = (key: string): key is TranslationKey =>
  translationValueKeys.has(key);

/** A translation's values: its notes and its credit, "historicalNotesDe" and "notesDeSource". */
export type TranslationValueKey =
  | TranslationKey
  | `${TranslationGroup}${Capitalize<ProvenancePart>}`;

/** The values of the translations into `languages`. */
export function translationValuesOf(languages: readonly Locale[]) {
  return languages.flatMap((locale) => [
    ...Object.values(translationKeysOf(locale)),
    ...provenanceParts.map((part) =>
      provenanceKey(translationGroupOf(locale), part),
    ),
  ]) as TranslationValueKey[];
}

/**
 * The values the Catalog editor sets on a node: all of them but the image
 * and its credit, which catalog/images.ts looks after.
 */
export const editorValueKeys = [
  "title",
  "sortOrder",
  "itemType",
  "country",
  "denomination",
  "series",
  "material",
  "strike",
  "metal",
  "weight",
  "fineness",
  "diameter",
  "yearFrom",
  "yearTo",
  "mint",
  "mintMark",
  "composition",
  "edge",
  "edgeLettering",
  "thickness",
  "width",
  "height",
  "designers",
  "mintage",
  "issueDate",
  "withdrawalDate",
  "notesLanguage",
  "technicalDetails",
  "historicalNotes",
  "numistaId",
  "factsSource",
  "factsAuthor",
  "factsLicence",
  "factsLink",
  "notesSource",
  "notesAuthor",
  "notesLicence",
  "notesLink",
  ...translationValuesOf(locales),
] as const satisfies readonly ValueKey[];
export type EditorValueKey = (typeof editorValueKeys)[number];

/** A node's values as the Catalog editor saves them; one left out is cleared. */
export type EditorValues = Pick<NodeValues, "title" | "sortOrder"> &
  Partial<Pick<NodeValues, Exclude<EditorValueKey, "title" | "sortOrder">>>;

/** The CSV column that holds a value, which problems name. */
export const columnOfValue = (key: ValueKey) => columnOf[key];

/**
 * The editor's values read the way a Catalog CSV file's cells are, so a node
 * saved in the editor meets the same rules as one imported: trimmed, within
 * the limits, nothing from Numista. Every editor value is present in
 * `values`, undefined when empty, so saving clears it.
 */
export function readEditorValues(input: EditorValues): {
  values: Partial<NodeValues>;
  problems: Array<{ column: string; code: CatalogError }>;
} {
  const values: Record<string, unknown> = {};
  const problems: Array<{ column: string; code: CatalogError }> = [];
  for (const key of editorValueKeys) {
    const column = columnOf[key];
    const value = input[key];
    try {
      values[key] = (valueColumns[column] as { read: Read }).read(
        value === undefined ? "" : String(value),
      );
    } catch (error) {
      if (!(error instanceof CellError)) throw error;
      problems.push({ column, code: error.code });
      values[key] = undefined;
    }
  }
  if (values.title === undefined && !problems.some((p) => p.column === "title"))
    problems.push({ column: "title", code: catalogErrors.titleRequired });
  return { values: values as Partial<NodeValues>, problems };
}

/** A node id as typed, lowercased, or undefined when it can't be one. */
export const readCatalogKey = (text: string) => readKey(text);

/** Whether two nodes' values are the same. */
export function sameValues(a: Partial<NodeValues>, b: Partial<NodeValues>) {
  return Object.keys(columnOf).every(
    (key) => a[key as ValueKey] === b[key as ValueKey],
  );
}

/**
 * The words a Catalog search matches: title, denomination, series and
 * country, by its code and its name in every language of the app.
 */
export const searchTextOf = (values: Partial<NodeValues>) =>
  searchWords(
    [
      values.title,
      values.denomination,
      values.series,
      values.country,
      ...(values.country
        ? locales.map((locale) =>
            formatCountry(values.country as string, locale),
          )
        : []),
    ]
      .filter(Boolean)
      .join(" "),
  ).join(" ");

/** A node as a CSV record, in `catalogCsvColumns` order. */
export function csvRecordOf(node: {
  key: string;
  parentKey: string | null;
  kind: CatalogKind;
  values: NodeValues;
}) {
  const cells = catalogCsvColumns.map((column) => {
    if (column === "id") return node.key;
    if (column === "parent_id") return node.parentKey ?? "";
    if (column === "is_addable") return String(node.kind === "entry");
    const spec = valueColumns[column];
    const value = spec && node.values[spec.value];
    return value === undefined ? "" : String(value);
  });
  return formatCsvRecord(cells);
}

export const catalogCsvHeader = formatCsvRecord(catalogCsvColumns);

/**
 * A node's kind follows from its place and the spec's columns: without a
 * parent it is a root, a country when it has one and a Theme when it spans
 * several; below a parent it is an entry when Items can be made from it
 * (is_addable), otherwise a grouping.
 */
export function kindOf(node: {
  parentKey: string | null;
  country?: string;
  addable: boolean;
}): CatalogKind {
  if (node.parentKey === null) return node.country ? "country" : "theme";
  return node.addable ? "entry" : "grouping";
}
