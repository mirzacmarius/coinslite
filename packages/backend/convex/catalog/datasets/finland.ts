import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";
import {
  type FinlandCollectorCoin,
  finlandCollectorCoins,
} from "./finlandCollectorCoins";

/**
 * Finland's collector and commemorative coins since 1989, as a Catalog CSV
 * file below the Finland root the euro circulation coins add: a "Collector
 * coins" grouping, one grouping per denomination, euro before markka, and
 * one entry per coin a Ministry of Finance decree issues. A decree that
 * issues two denominations gives two entries, as do the two whose proofs
 * are struck in finer silver and the EU 10 markkaa of 1995, struck in two
 * alloys.
 *
 * Facts and notes: each coin's decree in the Finnish Statute Book, read
 * from the Finlex open data API (finlandCollectorCoins.ts, rebuilt by
 * scripts/fetch-finlex-coins.ts). Finlex licenses its open data CC BY 4.0,
 * which allows storing and adapting it with credit and the changes stated.
 * Titles and the design described are the decree's Finnish; the mints the
 * decrees name abroad are given in English. Decrees give designers by
 * initial only, so no designer is filled in, and no mintages.
 *
 * No images: whether the coin images published in decrees may be shown
 * needs the Ministry of Finance to confirm (docs/research/catalog-expansion.md
 * §6), so entries show the placeholder.
 */

type Row = Record<string, string>;

const finlex = (link: string) => ({
  source: "Finlex",
  author: "Valtiovarainministeriö (Ministry of Finance of Finland)",
  licence:
    "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes by CoinsLite: arranged into Catalog fields.",
  link,
});
type Provenance = ReturnType<typeof finlex>;
const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});
/** Facts and notes alike, from one page. */
const creditBoth = (from: Provenance) => ({
  ...credit("facts", from),
  ...credit("notes", from),
});

/** Finlex's page on its open data, which the decrees were read through. */
const openData = finlex("https://www.finlex.fi/fi/avoin-data");
const decreePage = ({ decreeYear, decreeNumber }: FinlandCollectorCoin) =>
  finlex(
    `https://www.finlex.fi/fi/lainsaadanto/saadoskokoelma/${decreeYear}/${decreeNumber}`,
  );

const series = "Collector coins";
const rootKey = "fi-collector-coins";
const shared = { item_type: "coin", country: "FI", series };

const slug = (text: string) => text.toLowerCase().replace(/\s+/g, "-");
const denominationKey = (denomination: string) =>
  `${rootKey}-${slug(denomination)}`;

/** Euro before markka, then the highest value first. */
const denominationOrder = (denomination: string) => {
  const [value = "0", unit] = denomination.split(" ");
  return (unit === "euro" ? 0 : 1_000_000) - Number(value);
};
const denominations = [
  ...new Set(finlandCollectorCoins.map((coin) => coin.denomination)),
].sort((a, b) => denominationOrder(a) - denominationOrder(b));

const variantTitles = {
  proof: "erikoislyönti",
  goldAndSilver: "kulta ja hopea",
} as const;
const variantKeys = { proof: "proof", goldAndSilver: "gold-and-silver" };

const yearsOf = (coins: FinlandCollectorCoin[]) => {
  const years = coins.map((coin) => coin.year);
  return {
    year_from: String(Math.min(...years)),
    year_to: String(Math.max(...years)),
  };
};

function entry(coin: FinlandCollectorCoin, position: number): Row {
  const key = [
    "fi-collector",
    coin.decreeYear,
    coin.decreeNumber,
    slug(coin.denomination),
    ...(coin.variant ? [variantKeys[coin.variant]] : []),
  ].join("-");
  return {
    id: key,
    parent_id: denominationKey(coin.denomination),
    title: coin.variant
      ? `${coin.subject}, ${variantTitles[coin.variant]}`
      : coin.subject,
    sort_order: String(position + 1),
    is_addable: "true",
    ...shared,
    denomination: coin.denomination,
    year_from: String(coin.year),
    year_to: String(coin.year),
    strike: coin.strike ?? "",
    material: coin.material,
    metal: coin.metal ?? "",
    fineness: coin.fineness === undefined ? "" : String(coin.fineness),
    composition: coin.composition ?? "",
    weight_g: String(coin.weight),
    diameter_mm: String(coin.diameter),
    edge: coin.edge ?? "",
    edge_lettering: coin.edgeLettering ?? "",
    mint: coin.mint ?? "",
    mint_mark: coin.mintMark ?? "",
    technical_details: coin.design,
    notes_language: "fi",
    ...creditBoth(decreePage(coin)),
  };
}

const rows: Row[] = [
  {
    id: rootKey,
    parent_id: "fi",
    title: series,
    // After the eight euro circulation denominations.
    sort_order: "9",
    is_addable: "false",
    ...shared,
    ...yearsOf(finlandCollectorCoins),
    ...creditBoth(openData),
  },
  ...denominations.flatMap((denomination, index) => {
    const coins = finlandCollectorCoins
      .filter((coin) => coin.denomination === denomination)
      .sort(
        (a, b) =>
          a.year - b.year ||
          a.decreeYear - b.decreeYear ||
          a.decreeNumber - b.decreeNumber,
      );
    return [
      {
        id: denominationKey(denomination),
        parent_id: rootKey,
        title: denomination,
        sort_order: String(index + 1),
        is_addable: "false",
        ...shared,
        denomination,
        ...yearsOf(coins),
        ...creditBoth(openData),
      },
      ...coins.map(entry),
    ];
  }),
];

export const finland = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
