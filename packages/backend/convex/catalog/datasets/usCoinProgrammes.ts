import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";
import { type UsProgrammeCoin, usProgrammeCoins } from "./usCoinProgrammeCoins";
import { usMint } from "./usSilverDollars";

/**
 * The US Mint's circulating coin programmes since 1999, as a Catalog CSV file
 * below the United States root the silver dollars add: the 50 State Quarters,
 * DC and U.S. Territories, America the Beautiful and American Women quarters,
 * and the Presidential and Native American $1 coins. One entry per design and
 * circulation mint: Philadelphia (P) and Denver (D), and West Point (W) for
 * the quarters it struck in 2019 and 2020.
 *
 * Facts and notes: each coin's page on usmint.gov (usCoinProgrammeCoins.ts,
 * rebuilt by scripts/fetch-us-coin-programmes.ts) and the Mint's coin
 * specifications. The Mint's works are public domain (17 U.S.C. § 105).
 * "50 State Quarters" and the other programme names are the Mint's, used
 * only to name the series; nothing here is endorsed by the Mint.
 *
 * No images: many of these designs were assigned to the Mint by outside
 * artists, so entries show the placeholder until a free photo of a design
 * that may be shown is added.
 */

const specifications =
  "https://www.usmint.gov/learn/coins-and-medals/circulating-coins/coin-specifications";

type Provenance = typeof usMint;
const mint = (link: string): Provenance => ({ ...usMint, link });
const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});

type Row = Record<string, string>;

/** Each denomination as the Mint's coin specifications give it. */
const denominations = {
  quarter: {
    item_type: "coin",
    country: "US",
    denomination: "25 cents",
    material: "cupronickel",
    composition: "copper 91.67%; nickel 8.33%",
    weight_g: "5.67",
    diameter_mm: "24.26",
    thickness_mm: "1.75",
    edge: "reeded",
  },
  dollar: {
    item_type: "coin",
    country: "US",
    denomination: "1 dollar",
    // Manganese brass. The Catalog's compositions have no manganese, so the
    // alloy is given in full in the series' notes instead.
    material: "brass",
    weight_g: "8.1",
    diameter_mm: "26.49",
    thickness_mm: "2",
    edge: "lettered",
  },
} as const;
type Denomination = keyof typeof denominations;

const dollarAlloy =
  "The Mint's specifications give the dollar's composition as 88.5% copper, 6% zinc, 3.5% manganese and 2% nickel: an outer layer of manganese brass on a copper core.";

const programmes: Record<
  UsProgrammeCoin["programme"],
  { key: string; series: string; denomination: Denomination }
> = {
  stateQuarters: {
    key: "us-50-state-quarters",
    series: "50 State Quarters",
    denomination: "quarter",
  },
  dcTerritoriesQuarters: {
    key: "us-dc-and-territories-quarters",
    series: "DC and U.S. Territories Quarters",
    denomination: "quarter",
  },
  americaTheBeautifulQuarters: {
    key: "us-america-the-beautiful-quarters",
    series: "America the Beautiful Quarters",
    denomination: "quarter",
  },
  americanWomenQuarters: {
    key: "us-american-women-quarters",
    series: "American Women Quarters",
    denomination: "quarter",
  },
  presidentialDollars: {
    key: "us-presidential-dollars",
    series: "Presidential $1 Coins",
    denomination: "dollar",
  },
  nativeAmericanDollars: {
    key: "us-native-american-dollars",
    series: "Native American $1 Coins",
    denomination: "dollar",
  },
};

const mintNames = { P: "Philadelphia", D: "Denver", W: "West Point" } as const;

/** "us-quarter-1999-delaware-d": denomination, year, design, mint. */
function entryKey(
  coin: UsProgrammeCoin,
  denomination: Denomination,
  mark: string,
) {
  const prefix = `us-${denomination}-${coin.year}-`;
  const suffix = `-${mark.toLowerCase()}`;
  const room = 64 - prefix.length - suffix.length;
  let design = "";
  for (const word of coin.slug.replace(/^\d{4}-/, "").split("-")) {
    const next = design ? `${design}-${word}` : word;
    if (next.length > room) break;
    design = next;
  }
  return `${prefix}${design}${suffix}`;
}

/** What the edge says on a coin from one mint: its mint mark in place of the page's note of the marks. */
const edgeLettering = (coin: UsProgrammeCoin, mark: string) =>
  coin.edgeInscriptions
    ?.map((inscription) =>
      /^mint mark/i.test(inscription) ? mark : inscription,
    )
    .join(", ") ?? "";

function entries(coin: UsProgrammeCoin): Row[] {
  const programme = programmes[coin.programme];
  const denomination = programme.denomination;
  const source = mint(coin.page);
  return coin.mints.map((mark) => ({
    id: entryKey(coin, denomination, mark),
    parent_id: programme.key,
    title: `${coin.name} ${denomination} ${coin.year}-${mark}`,
    series: programme.series,
    strike: "circulation",
    year_from: String(coin.year),
    year_to: String(coin.year),
    is_addable: "true",
    ...denominations[denomination],
    edge_lettering: edgeLettering(coin, mark),
    mint: mintNames[mark],
    mint_mark: mark,
    designers: coin.designers.join("; "),
    issue_date: coin.releaseDate ?? "",
    technical_details: `${coin.design} Artist credits: ${coin.artistCredits}.`,
    ...credit("facts", source),
    ...credit("notes", source),
  }));
}

const rows: Row[] = Object.entries(programmes).flatMap(
  ([name, programme], index) => {
    const coins = usProgrammeCoins.filter((coin) => coin.programme === name);
    const years = coins.map((coin) => coin.year);
    const grouping: Row = {
      id: programme.key,
      parent_id: "us",
      title: programme.series,
      series: programme.series,
      year_from: String(Math.min(...years)),
      year_to: String(Math.max(...years)),
      // After the Morgan and Peace dollars.
      sort_order: String(index + 3),
      is_addable: "false",
      ...denominations[programme.denomination],
      technical_details: programme.denomination === "dollar" ? dollarAlloy : "",
      ...credit("facts", mint(specifications)),
      ...credit("notes", mint(specifications)),
    };
    return [
      grouping,
      ...coins.flatMap(entries).map((entry, position) => ({
        ...entry,
        sort_order: String(position + 1),
      })),
    ];
  },
);

export const usCoinProgrammes = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
