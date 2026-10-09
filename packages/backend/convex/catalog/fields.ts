import { formatCountry, isCountryCode, locales } from "@coinslite/i18n";
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
  invalidUrl: "INVALID_URL",
  numistaData: "NUMISTA_DATA",
  // The node
  itemTypeRequired: "ITEM_TYPE_REQUIRED",
  notForType: "FIELD_NOT_FOR_TYPE",
  yearsReversed: "YEARS_REVERSED",
  sourceRequired: "SOURCE_REQUIRED",
  /** An image needs its source, author, licence and link. */
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
  /** More Items link to the entries changed than one save can update. */
  tooManyLinkedItems: "TOO_MANY_LINKED_ITEMS",
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
  notes: 5000,
  provenance: 200,
  url: 2000,
  /** Grams. */
  weight: 100_000,
  /** Millimetres. */
  diameter: 500,
  sortOrder: 1_000_000_000,
  /** Items one save or delete updates: those linked to the entries it changes. */
  linkedItems: 1000,
  /** Nodes one delete removes, the node and everything below it. */
  deleteNodes: 2000,
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
  technicalDetails?: string;
  historicalNotes?: string;
  imageUrl?: string;
  numistaId?: number;
} & Partial<Record<ProvenanceKey, string>>;

const provenanceGroups = ["facts", "notes", "image"] as const;
const provenanceParts = ["source", "author", "licence", "link"] as const;
type ProvenanceGroup = (typeof provenanceGroups)[number];
type ProvenancePart = (typeof provenanceParts)[number];
type ProvenanceKey = `${ProvenanceGroup}${Capitalize<ProvenancePart>}`;
type ValueKey = keyof NodeValues;

/** "facts" and "source" make factsSource. */
function provenanceKey(group: ProvenanceGroup, part: ProvenancePart) {
  return `${group}${part.charAt(0).toUpperCase()}${part.slice(1)}` as ProvenanceKey;
}
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
  ],
  notes: ["technicalDetails", "historicalNotes"],
  image: ["imageUrl"],
};

/** Coins only: a banknote has no metal or size. */
export const coinOnlyValues = [
  "material",
  "metal",
  "weight",
  "fineness",
  "diameter",
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
      `${group}_${part}`,
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
 * group of facts.
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
] as const;

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
  // Catalog data of unknown origin is never stored (ADR 0003).
  for (const group of provenanceGroups) {
    const hasData =
      groupValues[group].some((value) => values[value] !== undefined) ||
      (group === "image" && uploadedImage);
    const credited = provenanceParts.some(
      (part) => values[provenanceKey(group, part)] !== undefined,
    );
    if (
      (hasData || credited) &&
      values[provenanceKey(group, "source")] === undefined
    )
      problems.push({
        column: `${group}_source`,
        code: catalogErrors.sourceRequired,
      });
  }
  // Every image is credited in full: source, author, licence and link.
  if (values.imageUrl !== undefined || uploadedImage) {
    for (const part of ["author", "licence", "link"] as const) {
      if (values[provenanceKey("image", part)] === undefined)
        problems.push({
          column: `image_${part}`,
          code: catalogErrors.creditRequired,
        });
    }
  }
  return problems;
}

/** Where a group of facts comes from, as stored on a node. */
export type Provenance = {
  source: string;
  author?: string;
  licence?: string;
  link?: string;
};

/** The stored form of a node's values. */
export type NodeFields = Omit<NodeValues, ProvenanceKey> & {
  factsProvenance?: Provenance;
  notesProvenance?: Provenance;
  imageProvenance?: Provenance;
};

/** Stored fields from values, dropping the ones that are unset. */
export function fieldsFromValues(values: NodeValues): NodeFields {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && !isProvenanceKey(key)) fields[key] = value;
  }
  for (const group of provenanceGroups) {
    const source = values[provenanceKey(group, "source")];
    if (source === undefined) continue;
    const record: Record<string, string> = { source };
    for (const part of ["author", "licence", "link"] as const) {
      const value = values[provenanceKey(group, part)];
      if (value !== undefined) record[part] = value;
    }
    fields[`${group}Provenance`] = record;
  }
  return fields as NodeFields;
}

/** A stored node's values, one per CSV column. */
export function valuesFromFields(fields: NodeFields): NodeValues {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(columnOf)) {
    const value = (fields as Record<string, unknown>)[key];
    if (value !== undefined && !isProvenanceKey(key)) values[key] = value;
  }
  for (const group of provenanceGroups) {
    const record = fields[`${group}Provenance`];
    if (!record) continue;
    for (const part of provenanceParts) {
      if (record[part] !== undefined)
        values[provenanceKey(group, part)] = record[part];
    }
  }
  return values as NodeValues;
}

const isProvenanceKey = (key: string): key is ProvenanceKey =>
  provenanceKeys.has(key);

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
