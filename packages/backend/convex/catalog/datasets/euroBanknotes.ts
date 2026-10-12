import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";
import { ecbSpecimenLicence } from "../imageRules";
import { credit, ecb, ecbAndDecision } from "./ecbCredit";

/**
 * The euro banknotes Theme, as a Catalog CSV file: the Theme root, its two
 * series (the first series of 2002 and the Europa series of 2013–2019) and
 * one entry per series and denomination, 13 in all. The euro area has no
 * country code, so no row has a country: the Theme's children are its
 * series, not countries (spec §6.1).
 *
 * Facts: sizes, colours and architectural styles as Decision ECB/2013/10,
 * Art. 1 (as amended by Decision ECB/2019/9) sets them; the first series'
 * issue date from the ECB's page on the 2002 changeover; each Europa note's
 * from the ECB press release that announced it; the Europa series' designer
 * as the ECB's design page names him. No primary source read names the first
 * series' designer, so it is left out. Every euro banknote remains legal
 * tender, so none has a withdrawal date; the €500 is no longer issued, in
 * the ECB's words. Credited to the ECB under its terms (ecbCredit.ts), each
 * entry linking its own page.
 *
 * Images: the ECB lets anyone use images of euro banknotes without prior
 * authorisation within its reproduction rules (Decision ECB/2013/10, Art.
 * 2): marked "specimen", and no more than 72 dpi at the note's real size.
 * Each entry's image is the front of its note from the ECB's specimen set,
 * which an admin uploads (catalog/images.ts); the image rules keep it within
 * 72 dpi at the note's size (imageRules.ts fullImageBounds). The rows carry
 * the image's credit, so the upload dialog starts from it.
 */

type Row = Record<string, string>;

const pages = "https://www.ecb.europa.eu";
const denominationsPage = `${pages}/euro/banknotes/current/denominations/html/index.en.html`;
const currentPage = `${pages}/euro/banknotes/current/html/index.en.html`;
const changeoverPage = `${pages}/euro/changeover/2002/html/index.en.html`;
const pressRelease = (path: string) => `${pages}/press/pr/date/${path}.en.html`;
const imagesPage = `${pages}/euro/banknotes/images/html/index.en.html`;

const themeKey = "eur-banknotes";
const firstKey = "eur-banknotes-first-series";
const europaKey = "eur-banknotes-europa-series";

type Note = {
  value: number;
  width: number;
  height: number;
  colour: string;
  style: string;
};

/** Decision ECB/2013/10, Art. 1: each first-series denomination. */
const firstSeries: Note[] = [
  { value: 5, width: 120, height: 62, colour: "Grey", style: "Classical" },
  { value: 10, width: 127, height: 67, colour: "Red", style: "Romanesque" },
  { value: 20, width: 133, height: 72, colour: "Blue", style: "Gothic" },
  { value: 50, width: 140, height: 77, colour: "Orange", style: "Renaissance" },
  {
    value: 100,
    width: 147,
    height: 82,
    colour: "Green",
    style: "Baroque and rococo",
  },
  {
    value: 200,
    width: 153,
    height: 82,
    colour: "Yellow-brown",
    style: "Iron and glass architecture",
  },
  {
    value: 500,
    width: 160,
    height: 82,
    colour: "Purple",
    style: "Modern 20th-century architecture",
  },
];

/**
 * The Europa series: the same colours and styles, the €100 and €200 lower
 * (Decision ECB/2019/9), no €500, each issued on the date its press release
 * gives.
 */
const europaSeries: Array<Note & { issued: string; page: string }> = [
  { issued: "2013-05-02", page: pressRelease("2013/html/pr130110_1") },
  { issued: "2014-09-23", page: pressRelease("2014/html/pr140113") },
  { issued: "2015-11-25", page: pressRelease("2015/html/pr150224") },
  { issued: "2017-04-04", page: pressRelease("2016/html/pr160705") },
  { issued: "2019-05-28", page: pressRelease("2018/html/ecb.pr180917") },
  { issued: "2019-05-28", page: pressRelease("2018/html/ecb.pr180917") },
].map((issue, index) => {
  const note = firstSeries[index] as Note;
  return { ...note, height: note.value >= 100 ? 77 : note.height, ...issue };
});

/** What every row shares. */
const banknote = { item_type: "banknote" };

/** Who to credit for each entry's specimen image, once an admin uploads it. */
const imageCredit = {
  image_source: "European Central Bank",
  image_author: "European Central Bank",
  image_licence: ecbSpecimenLicence,
  image_link: imagesPage,
};

const year = (date: string) => date.slice(0, 4);
const entryKey = (value: number, issued: string) =>
  `${themeKey}-${value}-euro-${year(issued)}`;

/** "Colour: grey. Architectural style: Classical." */
const design = (note: Note) =>
  `Colour: ${note.colour.toLowerCase()}. Architectural style: ${note.style}. Both series show the theme "Ages and styles of Europe".`;

/** The €500, in the ECB's words on its current banknotes page. */
const fiveHundredNote =
  "The €500 banknote has not been issued since 27 April 2019. It remains legal tender, like every euro banknote.";

function entry(
  note: Note,
  issued: string,
  parent: string,
  link: string,
  index: number,
): Row {
  const europa = parent === europaKey;
  return {
    id: entryKey(note.value, issued),
    parent_id: parent,
    ...banknote,
    title: `${note.value} euro ${year(issued)}${europa ? ", Europa series" : ""}`,
    denomination: `${note.value} euro`,
    series: europa ? "Europa series" : "First series",
    year_from: year(issued),
    width_mm: String(note.width),
    height_mm: String(note.height),
    issue_date: issued,
    designers: europa ? "Reinhold Gerstetter" : "",
    sort_order: String(index + 1),
    is_addable: "true",
    ...credit("facts", ecb(link)),
    technical_details: design(note),
    ...(note.value === 500
      ? {
          historical_notes: fiveHundredNote,
          ...credit("notes", ecbAndDecision(currentPage)),
        }
      : credit("notes", ecbAndDecision())),
    ...imageCredit,
  };
}

const rows: Row[] = [
  {
    id: themeKey,
    title: "Euro banknotes",
    ...banknote,
    year_from: "2002",
    sort_order: "2",
    ...credit("facts", ecb(denominationsPage)),
  },
  {
    id: firstKey,
    parent_id: themeKey,
    title: "First series",
    ...banknote,
    series: "First series",
    year_from: "2002",
    sort_order: "1",
    is_addable: "false",
    ...credit("facts", ecb(changeoverPage)),
  },
  ...firstSeries.map((note, index) =>
    entry(note, "2002-01-01", firstKey, changeoverPage, index),
  ),
  {
    id: europaKey,
    parent_id: themeKey,
    title: "Europa series",
    ...banknote,
    series: "Europa series",
    year_from: "2013",
    year_to: "2019",
    sort_order: "2",
    is_addable: "false",
    ...credit("facts", ecb(denominationsPage)),
  },
  ...europaSeries.map((note, index) =>
    entry(note, note.issued, europaKey, note.page, index),
  ),
];

export const euroBanknotes = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");

const specimenFolder = "euro_banknotes_specimen_72dpi";
const firstFolder = `${specimenFolder}/Banknotes ES1 Specimen 72dpi`;
const europaFolder = `${specimenFolder}/Banknotes ES2 Specimen 72dpi/ES2 Specimen with Draghi's Signature`;

/**
 * Which file of the ECB's specimen set
 * (https://www.ecb.europa.eu/euro/shared/img/euro_banknotes_specimen_72dpi.zip,
 * read 2026-10-12) is each entry's image: the front of the note, the Europa
 * notes with Draghi's signature, as first issued. With each file's size in
 * pixels, larger than 72 dpi at the note's size, so the upload shrinks it.
 */
export const euroBanknoteSpecimens = {
  "eur-banknotes-5-euro-2002": {
    file: `${firstFolder}/5euro_fr_ES1_Specimen_RGB_72dpi.jpg`,
    size: { width: 510, height: 262 },
  },
  "eur-banknotes-10-euro-2002": {
    file: `${firstFolder}/10euro_fr_ES1_Specimen_RGB_72dpi.jpg`,
    size: { width: 485, height: 253 },
  },
  "eur-banknotes-20-euro-2002": {
    file: `${firstFolder}/20euro_fr_ES1_Specimen_RGB_72dpi.jpg`,
    size: { width: 510, height: 276 },
  },
  "eur-banknotes-50-euro-2002": {
    file: `${firstFolder}/50euro_fr_ES1_Specimen_RGB_72dpi.jpg`,
    size: { width: 510, height: 280 },
  },
  "eur-banknotes-100-euro-2002": {
    file: `${firstFolder}/100euro_fr_ES1_Specimen_RGB_72dpi.jpg`,
    size: { width: 510, height: 283 },
  },
  "eur-banknotes-200-euro-2002": {
    file: `${firstFolder}/200euro_fr_ES1_Specimen_RGB_72dpi.jpg`,
    size: { width: 430, height: 230 },
  },
  "eur-banknotes-500-euro-2002": {
    file: `${firstFolder}/500euro_fr_ES1_Specimen_RGB_72dpi.jpg`,
    size: { width: 510, height: 261 },
  },
  "eur-banknotes-5-euro-2013": {
    file: `${europaFolder}/ECB 5 Euro Specimen Front with Draghi signature.jpg`,
    size: { width: 861, height: 439 },
  },
  "eur-banknotes-10-euro-2014": {
    file: `${europaFolder}/ECB 10 Euro Specimen Front with Draghi signature.jpg`,
    size: { width: 708, height: 370 },
  },
  "eur-banknotes-20-euro-2015": {
    file: `${europaFolder}/ECB 20 Euro Specimen Front with Draghi signature.jpg`,
    size: { width: 786, height: 424 },
  },
  "eur-banknotes-50-euro-2017": {
    file: `${europaFolder}/ECB 50 Euro Specimen Front with Draghi signature.jpg`,
    size: { width: 730, height: 400 },
  },
  "eur-banknotes-100-euro-2019": {
    file: `${europaFolder}/ECB 100 Euro Specimen Front with Draghi signature.jpg`,
    size: { width: 740, height: 412 },
  },
  "eur-banknotes-200-euro-2019": {
    file: `${europaFolder}/ECB 200 Euro Specimen Front with Draghi signature.jpg`,
    size: { width: 730, height: 390 },
  },
} as const;
