import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";
import { euroCommemorativeCoins } from "./euroCommemorativeCoins";

/**
 * The 2-euro commemoratives Theme, as a Catalog CSV file: one node per issuing
 * country below the Theme root, and one entry per commemorative coin from
 * 2004, jointly issued coins once for each country that issued them.
 *
 * Facts and notes: the European Central Bank's list of 2-euro commemorative
 * coins (euroCommemorativeCoins.ts, rebuilt by
 * scripts/fetch-euro-commemoratives.ts). The ECB lets anyone reuse its
 * website's information with the ECB cited as the source; where it is part of
 * something sold, buyers must be told it is free of charge from the ECB, and
 * any change must be stated. Each entry's provenance says all three. A title
 * the ECB's list leaves out comes from the coin's notice in the Official
 * Journal of the European Union, credited on that entry.
 *
 * No images: the national sides' designs belong to each issuing country, and
 * the ECB's terms don't cover showing them, so entries show the placeholder.
 */

const ecbPages = "https://www.ecb.europa.eu/euro/coins";
const changes =
  "Changes by CoinsLite: arranged into Catalog fields; capitals and typography tidied.";

const ecb = (link: string) => ({
  source: "European Central Bank",
  author: "European Central Bank",
  licence: `ECB copyright: free reuse with the ECB cited as source. Free of charge at www.ecb.europa.eu. ${changes}`,
  link,
});
const officialJournal = (notice: string, link: string) => ({
  source: `Official Journal of the European Union, notice ${notice}`,
  author: "European Commission",
  licence: `© European Union. Reuse allowed with the source acknowledged (Commission Decision 2011/833/EU). ${changes}`,
  link,
});

type Provenance = ReturnType<typeof ecb>;
const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});

const yearPage = (year: number, language: string) =>
  `${ecbPages}/comm/html/comm_${year}.${language}.html`;

/** What every 2-euro coin shares, from the ECB's page on the coins' common sides. */
const twoEuro = {
  item_type: "coin",
  denomination: "2 euro",
  material: "bimetallic",
  strike: "circulation",
  weight_g: "8.5",
  diameter_mm: "25.75",
};

/** The issuing countries' names as the ECB's English pages give them. */
const countryNames: Record<string, string> = {
  AD: "Andorra",
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  CY: "Cyprus",
  DE: "Germany",
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GR: "Greece",
  HR: "Croatia",
  IE: "Ireland",
  IT: "Italy",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MC: "Monaco",
  MT: "Malta",
  NL: "Netherlands",
  PT: "Portugal",
  SI: "Slovenia",
  SK: "Slovakia",
  SM: "San Marino",
  VA: "Vatican City",
};

const themeKey = "eur2-commemoratives";
const countryKey = (country: string) => `eur2-${country.toLowerCase()}`;
const yearsOf = (coins: typeof euroCommemorativeCoins) => {
  const years = coins.map((coin) => coin.year);
  return {
    year_from: String(Math.min(...years)),
    year_to: String(Math.max(...years)),
  };
};

const countries = [
  ...new Set(euroCommemorativeCoins.map((coin) => coin.country)),
].sort((a, b) => (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b));

const theme = {
  id: themeKey,
  title: "2-euro commemoratives",
  sort_order: "1",
  ...twoEuro,
  ...yearsOf(euroCommemorativeCoins),
  ...credit("facts", ecb(`${ecbPages}/common/html/index.en.html`)),
  historical_notes:
    "Each country that uses the euro as its official currency may issue two commemorative coins per year. These coins have the same features, properties and common side as normal €2 coins. What makes them different is the commemorative design on their national side. Only the €2 denomination can be used for commemorative coins. €2 commemorative coins are legal tender throughout the euro area. Exceptionally, a third coin may be issued, provided it is issued jointly by all euro area countries and commemorates an event of Europe-wide importance.",
  ...credit("notes", ecb(`${ecbPages}/comm/html/index.en.html`)),
};

const rows: Array<Record<string, string>> = [
  theme,
  ...countries.flatMap((country, countryIndex) => {
    const coins = euroCommemorativeCoins.filter(
      (coin) => coin.country === country,
    );
    const name = countryNames[country];
    if (!name) throw new Error(`No name for issuing country ${country}`);
    return [
      {
        id: countryKey(country),
        parent_id: themeKey,
        title: name,
        country,
        sort_order: String(countryIndex + 1),
        is_addable: "false",
        ...twoEuro,
        ...yearsOf(coins),
        ...credit("facts", ecb(`${ecbPages}/comm/html/index.en.html`)),
      },
      ...coins.map((coin, index) => ({
        id: coin.key,
        parent_id: countryKey(country),
        title: coin.title,
        country,
        year_from: String(coin.year),
        year_to: String(coin.year),
        sort_order: String(index + 1),
        is_addable: "true",
        ...twoEuro,
        ...credit(
          "facts",
          coin.titleFrom
            ? officialJournal(coin.titleFrom.notice, coin.titleFrom.link)
            : ecb(yearPage(coin.year, coin.language)),
        ),
        technical_details: `Issuing volume: ${coin.volume}. Issuing date: ${coin.issued}.`,
        historical_notes: coin.description,
        ...credit("notes", ecb(yearPage(coin.year, "en"))),
      })),
    ];
  }),
];

export const euroCommemoratives = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
