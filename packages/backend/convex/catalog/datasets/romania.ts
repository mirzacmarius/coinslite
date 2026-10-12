import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";
import {
  type BnrBanknote,
  type BnrCoin,
  type BnrIssue,
  circulationBanknotes,
  circulationCoins,
  mintSets,
  numismaticBanknotes,
  polymerBanknotes,
} from "./romaniaBnr";
import { numismaticCoins } from "./romaniaBnrCoins";

/**
 * Romania, as a Catalog CSV file: the coins and banknotes in circulation
 * since the leu was redenominated in 2005, the polymer banknotes of
 * 2000–2003, and the National Bank of Romania's numismatic issues from 1995:
 * its coins by year, its banknotes for collectors and its mint sets. An issue
 * or set of several coins is a grouping with one entry per coin.
 *
 * Facts and notes: the BNR's website (romaniaBnr.ts and romaniaBnrCoins.ts,
 * rebuilt by scripts/fetch-bnr.ts). Its terms allow redistributing its
 * content in any form with the source named; changes must be stated, and
 * where the information serves a paid service, users must be told it comes
 * from bnr.ro, where it is free. Every row's credit says all three, and the
 * app shows it with the facts. Notes stay in the BNR's Romanian.
 *
 * Left out: medals, which aren't money, and values the BNR's pages fail to
 * fill in. The BNR's "Tiraj maxim" is a ceiling, not a mintage, so it stays
 * in the notes.
 *
 * No images: the BNR registers its designs and must consent to colour
 * reproductions (docs/research/catalog-expansion.md §3.3), so entries show
 * the placeholder.
 */

const bnr = "Banca Națională a României";
const credit = (group: "facts" | "notes", link: string) => ({
  [`${group}_source`]: bnr,
  [`${group}_author`]: bnr,
  [`${group}_licence`]:
    "Redistribuit cu indicarea sursei; informațiile sunt disponibile gratuit pe www.bnr.ro. Modificări CoinsLite: aranjate în câmpurile Catalogului.",
  [`${group}_link`]: link,
});

type Row = Record<string, string>;

const root = "ro";
const pages = "https://www.bnr.ro";

/** A grouping below another node: Items aren't made from it. */
const grouping = (
  id: string,
  parent: string,
  title: string,
  sortOrder: number,
  link: string,
  more: Row = {},
): Row => ({
  id,
  parent_id: parent,
  title,
  country: "RO",
  sort_order: String(sortOrder),
  is_addable: "false",
  ...more,
  ...credit("facts", link),
});

/** The BNR's description of an issue, in Romanian, credited to its page. */
const notes = (details: string | undefined, link: string): Row =>
  details
    ? {
        technical_details: details,
        notes_language: "ro",
        ...credit("notes", link),
      }
    : {};

const number = (value: number | undefined) =>
  value === undefined ? "" : String(value);

function coinRow(
  coin: BnrCoin,
  parent: string,
  sortOrder: number,
  series = "",
): Row {
  return {
    id: coin.key,
    parent_id: parent,
    item_type: "coin",
    title: coin.title,
    country: "RO",
    denomination: coin.denomination,
    series,
    material: coin.material ?? "",
    strike: coin.strike ?? "",
    metal: coin.metal ?? "",
    weight_g: number(coin.weight),
    fineness: number(coin.fineness),
    diameter_mm: number(coin.diameter),
    thickness_mm: number(coin.thickness),
    composition: coin.composition ?? "",
    edge: coin.edge ?? "",
    year_from: String(coin.year),
    year_to: String(coin.year),
    issue_date: coin.issueDate ?? "",
    sort_order: String(sortOrder),
    is_addable: "true",
    ...credit("facts", coin.link),
    ...notes(coin.details, coin.link),
  };
}

function banknoteRow(
  note: BnrBanknote,
  parent: string,
  sortOrder: number,
  series = "",
): Row {
  return {
    id: note.key,
    parent_id: parent,
    item_type: "banknote",
    title: note.title,
    country: "RO",
    denomination: note.denomination,
    series,
    width_mm: number(note.width),
    height_mm: number(note.height),
    year_from: String(note.year),
    issue_date: note.issueDate ?? "",
    sort_order: String(sortOrder),
    is_addable: "true",
    ...credit("facts", note.link),
    ...notes(note.details, note.link),
  };
}

/** An issue of one coin is an entry; of several, a grouping with one entry per coin. */
function issueRows(issue: BnrIssue, parent: string, sortOrder: number): Row[] {
  const [only] = issue.pieces;
  if (issue.pieces.length === 1 && only)
    return [coinRow({ ...only, title: issue.title }, parent, sortOrder)];
  return [
    grouping(issue.key, parent, issue.title, sortOrder, issue.link, {
      year_from: String(issue.year),
      year_to: String(issue.year),
      ...notes(issue.details, issue.link),
    }),
    ...issue.pieces.map((coin, index) => coinRow(coin, issue.key, index + 1)),
  ];
}

const circulationCoinsKey = "ro-circulation-coins";
const circulationBanknotesKey = "ro-circulation-banknotes";
const banknotes2005Key = "ro-banknotes-2005";
const banknotes2000Key = "ro-banknotes-2000";
const numismaticKey = "ro-numismatic";
const numismaticCoinsKey = "ro-numismatic-coins";
const numismaticBanknotesKey = "ro-numismatic-banknotes";
const mintSetsKey = "ro-mint-sets";

const coinYears = [...new Set(numismaticCoins.map((issue) => issue.year))].sort(
  (a, b) => b - a,
);

const rows: Row[] = [
  {
    id: root,
    title: "Romania",
    country: "RO",
    sort_order: "3",
    ...credit("facts", `${pages}/662-bancnote-si-monede`),
  },
  grouping(
    circulationCoinsKey,
    root,
    "Circulation coins",
    1,
    `${pages}/2267-monede-in-circulatie`,
  ),
  ...circulationCoins.map((coin, index) =>
    coinRow(coin, circulationCoinsKey, index + 1, "Leu 2005"),
  ),
  grouping(
    circulationBanknotesKey,
    root,
    "Circulation banknotes",
    2,
    `${pages}/764-bancnote-in-circulatie`,
  ),
  grouping(
    banknotes2005Key,
    circulationBanknotesKey,
    "Leu 2005",
    1,
    `${pages}/764-bancnote-in-circulatie`,
    { series: "Leu 2005" },
  ),
  ...circulationBanknotes.map((note, index) =>
    banknoteRow(note, banknotes2005Key, index + 1, "Leu 2005"),
  ),
  grouping(
    banknotes2000Key,
    circulationBanknotesKey,
    "Polymer 2000–2003",
    2,
    `${pages}/2275-prima-emisiune-bnr-realizata-din-polimer-2000-2003`,
    { series: "Polymer 2000–2003" },
  ),
  ...polymerBanknotes.map((note, index) =>
    banknoteRow(note, banknotes2000Key, index + 1, "Polymer 2000–2003"),
  ),
  grouping(
    numismaticKey,
    root,
    "Numismatic issues",
    3,
    `${pages}/664-numismatica`,
  ),
  grouping(
    numismaticCoinsKey,
    numismaticKey,
    "Coins",
    1,
    `${pages}/2271-monede-si-medalii`,
  ),
  ...coinYears.flatMap((year, yearIndex) => {
    const key = `${numismaticCoinsKey}-${year}`;
    // The BNR lists its issues newest first; a year reads in the order they came out.
    const issues = numismaticCoins
      .filter((issue) => issue.year === year)
      .reverse();
    return [
      grouping(
        key,
        numismaticCoinsKey,
        String(year),
        yearIndex + 1,
        `${pages}/2271-monede-si-medalii`,
        { year_from: String(year), year_to: String(year) },
      ),
      ...issues.flatMap((issue, index) => issueRows(issue, key, index + 1)),
    ];
  }),
  grouping(
    numismaticBanknotesKey,
    numismaticKey,
    "Banknotes",
    2,
    `${pages}/1066-bancnote`,
  ),
  ...numismaticBanknotes.map((note, index) =>
    banknoteRow(note, numismaticBanknotesKey, index + 1),
  ),
  grouping(
    mintSetsKey,
    numismaticKey,
    "Mint sets",
    3,
    `${pages}/1069-seturi-de-monetarie`,
  ),
  ...mintSets.flatMap((set, index) => [
    grouping(set.key, mintSetsKey, set.title, index + 1, set.link, {
      year_from: String(set.year),
      year_to: String(set.year),
      issue_date: set.issueDate ?? "",
      ...notes(set.details, set.link),
    }),
    ...set.pieces.map((coin, pieceIndex) =>
      coinRow(coin, set.key, pieceIndex + 1),
    ),
  ]),
];

export const romania = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
