import { parseCsv } from "../catalog/csvText";
import { type CsvColumn, csvColumns, exportLabels } from "./exportLabels";
import {
  type DateOrder,
  countryOf,
  currenciesOf,
  dateOrderOf,
  folded,
  isDate,
  lookup,
  readAmount,
  readNumistaNumber,
  readYear,
  strikeOf,
  typeOf,
} from "./importValues";

/**
 * Which column of a file being imported holds what (importRows.ts reads the
 * rows). A Collection export's headings, in any of the five languages, or
 * the raw column keys, are matched as they are. Other headings are guessed
 * from the names Numista, OpenNumismat, CoinManage and spreadsheets use, in
 * those languages, each guess kept only when most of the column's cells
 * read for it; the person checks the guesses before anything is read. Pure,
 * so the app inspects the file in the browser and the server reads it.
 */

/** The import's own columns, besides the export's. */
export const extraColumns = ["notes", "album", "catalog_entry"] as const;
/** Columns other apps' files have that the export doesn't write. */
export const otherAppColumns = [
  "unit",
  "series",
  "mint_mark",
  "ruler",
  "mintage",
  "numista_number",
  "grade_note",
] as const;
export type Column =
  | CsvColumn
  | (typeof extraColumns)[number]
  | (typeof otherAppColumns)[number];

/** Every column a file can have, in the order the app offers them. */
export const importColumns = [
  "title",
  "type",
  "country",
  "year",
  "denomination",
  "unit",
  "series",
  "mint_mark",
  "ruler",
  "mintage",
  "numista_number",
  "material",
  "grade",
  "gradingScale",
  "grade_note",
  "strike",
  "quantity",
  "purchasePrice",
  "currency",
  "purchaseDate",
  "source",
  "marketValue",
  "storage",
  "notes",
  "album",
  "soldOn",
  "salePrice",
  "saleNote",
  "grader",
  "certificateNumber",
  "serialNumber",
  "signatures",
  "printer",
  "stampCatalogue",
  "stampCatalogueNumber",
  "perforation",
  "watermark",
  "colour",
  "catalog_entry",
] as const satisfies readonly Column[];
// Every column is offered, once.
const _everyColumn: Exclude<
  Column,
  (typeof importColumns)[number]
> extends never
  ? true
  : never = true;

export const isColumn = (key: string): key is Column =>
  (importColumns as readonly string[]).includes(key);

/** A Collection export's heading, in any language, or a column's raw key. */
export const columnOf = lookup<Column>(
  (locale) => ({
    ...exportLabels[locale].columns,
    notes: "notes",
    album: "album",
    catalog_entry: "catalog_entry",
    unit: "unit",
    series: "series",
    mint_mark: "mint_mark",
    ruler: "ruler",
    mintage: "mintage",
    numista_number: "numista_number",
    grade_note: "grade_note",
  }),
  [...csvColumns, ...extraColumns, ...otherAppColumns],
);

/**
 * Headings other apps write, in the five languages, and the columns each
 * could be, first choice first; earlier lines are matched first, so "Name"
 * is the title before "Description" is considered for it.
 */
const aliases: ReadonlyArray<
  readonly [
    names: readonly string[],
    columns: readonly Column[] | ((headings: ReadonlySet<string>) => Column[]),
  ]
> = [
  [
    ["title", "name", "titel", "titre", "nom", "navn", "tittel", "titlu"],
    ["title"],
  ],
  [
    ["designation", "bezeichnung", "denumire", "description", "beschreibung"],
    ["title", "notes"],
  ],
  [
    [
      "item type",
      "type",
      "kind",
      "category",
      "kategorie",
      "kategori",
      "categorie",
      "catégorie",
      "typ",
      "tip",
      "art",
    ],
    ["type"],
  ],
  [
    [
      "issuer",
      "issuing country",
      "land",
      "pays",
      "emetteur",
      "emittent",
      "ausgabeland",
      "staat",
      "utsteder",
      "tara",
      "stat",
      "nation",
    ],
    ["country"],
  ],
  [["gregorian year", "gregorianisches jahr", "annee gregorienne"], ["year"]],
  [
    [
      "year",
      "jahr",
      "jahrgang",
      "pragejahr",
      "annee",
      "ar",
      "an",
      "anul",
      "date",
      "datum",
    ],
    ["year", "purchaseDate"],
  ],
  [
    [
      "face value",
      "nominal",
      "nominal value",
      "valeur faciale",
      "nennwert",
      "palydende",
      "valoare nominala",
    ],
    ["denomination"],
  ],
  [["unit", "einheit", "unite", "enhet", "unitate"], ["unit"]],
  [
    // OpenNumismat's "Value" is the number of a denomination whose unit is
    // its own column; elsewhere a value is what a piece is worth.
    ["value", "wert", "valeur", "verdi", "valoare"],
    (headings) =>
      [...headings].some((heading) => columnOrAlias(heading) === "unit")
        ? ["denomination"]
        : ["marketValue"],
  ],
  [["series", "serie", "serien"], ["series"]],
  [
    [
      "mint mark",
      "mintmark",
      "munzzeichen",
      "marque d'atelier",
      "myntmerke",
      "marca monetariei",
    ],
    ["mint_mark"],
  ],
  [["mint", "munzstatte", "atelier", "myntsted", "monetaria"], ["mint_mark"]],
  [
    [
      "ruler",
      "monarch",
      "herrscher",
      "regent",
      "souverain",
      "monarque",
      "monarh",
      "conducator",
    ],
    ["ruler"],
  ],
  [["mintage", "auflage", "pragung", "tirage", "opplag", "tiraj"], ["mintage"]],
  [
    [
      "n#",
      "numista",
      "numista number",
      "numista id",
      "numista n#",
      "numista nr",
      "numista-nummer",
      "numista nummer",
      "numero numista",
      "nr numista",
      "numista-nr",
    ],
    ["numista_number"],
  ],
  [
    ["composition", "metal", "metall", "werkstoff", "materiau", "materiale"],
    ["material"],
  ],
  [
    [
      "condition",
      "erhaltung",
      "etat",
      "kvalitet",
      "stare",
      "grad",
      "conservation",
      "zustand",
    ],
    ["grade"],
  ],
  [
    ["finish", "quality", "pragequalitat", "qualite de frappe", "preg"],
    ["strike"],
  ],
  [
    [
      "quantity",
      "qty",
      "qty.",
      "count",
      "pieces",
      "anzahl",
      "menge",
      "stuck",
      "quantite",
      "antall",
      "cantitate",
    ],
    ["quantity"],
  ],
  [
    [
      "price",
      "purchase price",
      "cost",
      "buy price",
      "price paid",
      "acquisition price",
      "kaufpreis",
      "einkaufspreis",
      "preis",
      "prix",
      "prix d'achat",
      "pris",
      "kjopspris",
      "innkjopspris",
      "pret",
      "pret de achizitie",
    ],
    ["purchasePrice"],
  ],
  [
    [
      "estimated value",
      "estimate",
      "current value",
      "market value",
      "catalog value",
      "catalogue value",
      "marktwert",
      "schatzwert",
      "valeur estimee",
      "valeur de marche",
      "markedsverdi",
      "valoare estimata",
    ],
    ["marketValue"],
  ],
  [["currency", "wahrung", "devise", "valuta", "moneda"], ["currency"]],
  [
    [
      "acquisition date",
      "purchase date",
      "date acquired",
      "date purchased",
      "bought",
      "acquired",
      "paydate",
      "kaufdatum",
      "erwerbsdatum",
      "date d'achat",
      "date d'acquisition",
      "kjopsdato",
      "innkjopsdato",
      "data achizitiei",
      "data cumpararii",
    ],
    ["purchaseDate"],
  ],
  [
    [
      "seller",
      "vendor",
      "dealer",
      "purchased from",
      "bought from",
      "acquired from",
      "acquisition place",
      "place of acquisition",
      "acquisition source",
      "handler",
      "verkaufer",
      "bezugsquelle",
      "herkunft",
      "vendeur",
      "provenance",
      "selger",
      "kilde",
      "sursa",
      "vanzator",
    ],
    ["source"],
  ],
  [
    [
      "storage",
      "storage location",
      "location",
      "aufbewahrung",
      "aufbewahrungsort",
      "lagerort",
      "standort",
      "emplacement",
      "rangement",
      "oppbevaring",
      "plassering",
      "locatie",
      "depozitare",
    ],
    ["storage"],
  ],
  [
    [
      "note",
      "notes",
      "comment",
      "comments",
      "private comment",
      "public comment",
      "remarks",
      "bemerkung",
      "bemerkungen",
      "kommentar",
      "notizen",
      "commentaire",
      "commentaires",
      "remarque",
      "remarques",
      "merknad",
      "merknader",
      "notater",
      "observatii",
      "comentarii",
    ],
    ["notes"],
  ],
  [["folder", "ordner", "dossier", "mappe"], ["album"]],
  [
    [
      "sold on",
      "sale date",
      "date sold",
      "verkaufsdatum",
      "date de vente",
      "salgsdato",
      "data vanzarii",
    ],
    ["soldOn"],
  ],
  [
    [
      "sold for",
      "verkaufspreis",
      "prix de vente",
      "salgspris",
      "pret de vanzare",
    ],
    ["salePrice"],
  ],
  [["grading company", "grading service", "tpg", "slab"], ["grader"]],
  [
    [
      "cert",
      "cert #",
      "cert number",
      "certification number",
      "slab number",
      "zertifikatsnummer",
      "numero de certificat",
      "sertifikatnummer",
    ],
    ["certificateNumber"],
  ],
  [
    [
      "serial",
      "seriennummer",
      "numero de serie",
      "serienummer",
      "numar de serie",
    ],
    ["serialNumber"],
  ],
];

const aliasColumns = new Map(
  aliases.flatMap(([names, columns]) =>
    names.map((name) => [folded(name), columns] as const),
  ),
);

/** The column a heading names, or its first guess; for the "unit" check. */
function columnOrAlias(heading: string): Column | undefined {
  const exact = columnOf(heading);
  if (exact) return exact;
  const guess = aliasColumns.get(folded(heading));
  return Array.isArray(guess) ? guess[0] : undefined;
}

/** What a cell must read as for a column to be guessed (other columns take any text). */
const reads: Partial<Record<Column, (text: string) => boolean>> = {
  type: (text) => typeOf(text) !== undefined,
  country: (text) => countryOf(text) !== undefined,
  year: (text) => readYear(text) !== null,
  quantity: (text) => /^\d+$/.test(text),
  mintage: (text) => /^\d+$/.test(text),
  numista_number: (text) => readNumistaNumber(text) !== null,
  purchasePrice: (text) => readAmount(text) !== undefined,
  marketValue: (text) => readAmount(text) !== undefined,
  salePrice: (text) => readAmount(text) !== undefined,
  currency: (text) => currenciesOf(text).length > 0,
  purchaseDate: isDate,
  soldOn: isDate,
  strike: (text) => strikeOf(text) !== undefined,
};

/** Rows looked at to guess a column: enough to tell, few enough to stay quick. */
const sampleRows = 200;

/**
 * Guesses each heading's column: an export heading or raw key as it is,
 * then the other apps' names; a column whose cells mostly don't read for
 * it isn't guessed (a country column of other names than CoinsLite's is
 * still a country, its unknown names kept in the notes). Each column is
 * given to one heading at most; null leaves a heading out.
 */
export function guessColumns(
  headings: readonly string[],
  records: readonly (readonly string[])[],
): (Column | null)[] {
  const guessed: (Column | null)[] = headings.map(() => null);
  const taken = new Set<Column>();
  const fits = (column: Column, at: number) => {
    const check = reads[column];
    if (!check || column === "country") return true;
    const cells = records
      .slice(0, sampleRows)
      .map((record) => record[at]?.trim() ?? "")
      .filter(Boolean);
    return cells.filter(check).length * 2 >= cells.length;
  };
  const give = (column: Column, at: number) => {
    if (taken.has(column) || !fits(column, at)) return false;
    guessed[at] = column;
    taken.add(column);
    return true;
  };
  headings.forEach((heading, at) => {
    const column = columnOf(heading);
    if (column) give(column, at);
  });
  const names = new Set(headings.map(folded));
  for (const [aliasNames, columns] of aliases) {
    const wanted = new Set(aliasNames.map(folded));
    headings.forEach((heading, at) => {
      if (guessed[at] !== null || !wanted.has(folded(heading))) return;
      if (columnOf(heading)) return;
      const choices = typeof columns === "function" ? columns(names) : columns;
      for (const column of choices) if (give(column, at)) break;
    });
  }
  return guessed;
}

/** The character between a file's cells: a comma, a semicolon or a tab, whichever the first line has most of. */
export function csvDelimiter(text: string) {
  const counts = new Map([
    [",", 0],
    [";", 0],
    ["\t", 0],
  ]);
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && counts.has(char))
      counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  let best = ",";
  for (const [char, count] of counts)
    if (count > (counts.get(best) ?? 0)) best = char;
  return best;
}

/** Why a whole file is refused. */
export const importErrors = {
  fileTooLarge: "FILE_TOO_LARGE",
  tooManyRows: "TOO_MANY_ROWS",
  unreadable: "UNREADABLE_FILE",
  noRows: "NO_ROWS",
  /** No column of the file is matched to a field. */
  noKnownHeadings: "NO_KNOWN_HEADINGS",
  /** The columns chosen name a field that doesn't exist, or one twice. */
  invalidColumns: "INVALID_COLUMNS",
  /** A batch of more than `importLimits.batch` rows. */
  batchTooLarge: "BATCH_TOO_LARGE",
} as const;

export const importLimits = {
  /** Bytes of text: 5 MB. */
  fileSize: 5 * 1024 * 1024,
  /** Rows below the heading row. */
  rows: 2000,
  /** Columns a file's choices can name. */
  columns: 300,
  /** Rows one batch adds, all or nothing. */
  batch: 100,
} as const;

export type ImportTable = {
  headings: string[];
  /** The rows below the headings, blank ones left out, each with its number in the file. */
  records: Array<string[] & { row: number }>;
};

/**
 * A file's headings and rows, read with the delimiter it uses. Blank rows
 * are skipped, but rows keep their number in the file (from 1). A file it
 * can't take is a string: one of `importErrors`.
 */
export function readTable(text: string): ImportTable | string {
  if (new TextEncoder().encode(text).length > importLimits.fileSize)
    return importErrors.fileTooLarge;
  const parsed = parseCsv(text, csvDelimiter(text));
  if (!("records" in parsed)) return importErrors.unreadable;
  const [headings = [], ...records] = parsed.records
    .map((cells, index) => ({ cells, row: index + 1 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ""))
    .map(({ cells, row }) => Object.assign(cells, { row }));
  if (records.length === 0) return importErrors.noRows;
  if (records.length > importLimits.rows) return importErrors.tooManyRows;
  return { headings: [...headings], records };
}

/**
 * Whether a file is laid out like the Collection export: each heading an
 * export column (in any language) or a raw key, an Item type column among
 * them, and every one kept by the guess. Such a file needs no checking of
 * its columns.
 */
export function laidOutAsExport(
  headings: readonly string[],
  columns: readonly (Column | null)[],
) {
  return (
    columns.includes("type") &&
    headings.every(
      (heading, at) =>
        heading.trim() === "" || columns[at] === columnOf(heading),
    )
  );
}

/** The cells of one column, in every row. */
const cellsOf = (
  table: ImportTable,
  columns: readonly (Column | null)[],
  column: Column,
) => {
  const at = columns.indexOf(column);
  return at === -1
    ? []
    : table.records.map((record) => record[at]?.trim() ?? "").filter(Boolean);
};

/** Whether some rows have no Item type, so one must be chosen for them. */
export function needsItemType(
  table: ImportTable,
  columns: readonly (Column | null)[],
) {
  const at = columns.indexOf("type");
  return at === -1 || table.records.some((record) => !record[at]?.trim());
}

/**
 * How the file's dates with the year last are written: day or month
 * first, as its cells show; null when they don't (and the person chooses)
 * or it has none.
 */
export function dateOrderIn(
  table: ImportTable,
  columns: readonly (Column | null)[],
): { order: DateOrder | null; unclear: boolean } {
  const cells = [
    ...cellsOf(table, columns, "purchaseDate"),
    ...cellsOf(table, columns, "soldOn"),
  ];
  const order = dateOrderOf(cells);
  return {
    order,
    unclear:
      order === null &&
      cells.some((cell) => /^\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/.test(cell)),
  };
}
