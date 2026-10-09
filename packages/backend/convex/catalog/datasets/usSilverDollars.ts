import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";

/**
 * The first Catalog dataset: United States Morgan dollars (1878–1904 and 1921)
 * and Peace dollars (1921–1928 and 1934–1935), every date and mint, as a
 * Catalog CSV file.
 *
 * Facts: the United States Mint. Its works are public domain (17 U.S.C. § 105),
 * and these dates, mints and specifications are facts. Historical notes are
 * CoinsLite's own summary of the Mint's history. No images yet: entries show
 * the placeholder until a licensed photo is added.
 */

const usMint = {
  source: "United States Mint",
  author: "United States Mint",
  licence: "Public domain (17 U.S.C. § 105)",
  link: "https://www.usmint.gov/news/inside-the-mint/one-hundred-years-of-silver-dollar-coinage-1878-1978",
};
const editorial = {
  source: "CoinsLite editorial, after the United States Mint",
  author: "CoinsLite",
  licence: "CoinsLite",
  link: usMint.link,
};

const credit = (group: "facts" | "notes", from: typeof usMint) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});

/** The standard silver dollar both series were struck to: 412.5 grains of 900 fine silver. */
const silverDollar = {
  item_type: "coin",
  country: "US",
  denomination: "1 dollar",
  material: "silver",
  metal: "silver",
  weight_g: "26.73",
  fineness: "0.9",
  diameter_mm: "38.1",
  ...credit("facts", usMint),
};

const mintNames: Record<string, string> = {
  P: "Philadelphia, no mint mark",
  CC: "Carson City",
  D: "Denver",
  O: "New Orleans",
  S: "San Francisco",
};

/** The mints that struck each year, from the Mint's records. */
const morganIssues: Array<[number, string]> = [
  [1878, "P CC S"],
  [1879, "P CC O S"],
  [1880, "P CC O S"],
  [1881, "P CC O S"],
  [1882, "P CC O S"],
  [1883, "P CC O S"],
  [1884, "P CC O S"],
  [1885, "P CC O S"],
  [1886, "P O S"],
  [1887, "P O S"],
  [1888, "P O S"],
  [1889, "P CC O S"],
  [1890, "P CC O S"],
  [1891, "P CC O S"],
  [1892, "P CC O S"],
  [1893, "P CC O S"],
  [1894, "P O S"],
  [1895, "P O S"],
  [1896, "P O S"],
  [1897, "P O S"],
  [1898, "P O S"],
  [1899, "P O S"],
  [1900, "P O S"],
  [1901, "P O S"],
  [1902, "P O S"],
  [1903, "P O S"],
  [1904, "P O S"],
  [1921, "P D S"],
];

const peaceIssues: Array<[number, string]> = [
  [1921, "P"],
  [1922, "P D S"],
  [1923, "P D S"],
  [1924, "P S"],
  [1925, "P S"],
  [1926, "P D S"],
  [1927, "P D S"],
  [1928, "P S"],
  [1934, "P D S"],
  [1935, "P S"],
];

/** What sets one date and mint apart, where something does. */
const notes: Record<string, string> = {
  "Morgan dollar 1895":
    "Known only in proof: no circulation strikes of 1895 from Philadelphia are known.",
  "Peace dollar 1921": "Struck in high relief, lowered from 1922.",
};

function seriesRows(
  key: string,
  series: string,
  issues: Array<[number, string]>,
  seriesNotes: { technical_details: string; historical_notes: string },
  sortOrder: number,
) {
  const years = issues.map(([year]) => year);
  const grouping = {
    id: key,
    parent_id: "us",
    title: series,
    series,
    year_from: String(Math.min(...years)),
    year_to: String(Math.max(...years)),
    sort_order: String(sortOrder),
    is_addable: "false",
    ...silverDollar,
    ...seriesNotes,
    ...credit("notes", editorial),
  };
  const entries = issues.flatMap(([year, mints]) =>
    mints.split(" ").map((mint) => {
      const title = `${series} ${year}${mint === "P" ? "" : `-${mint}`}`;
      return {
        id: `${key}-${year}${mint === "P" ? "" : `-${mint.toLowerCase()}`}`,
        parent_id: key,
        title,
        series,
        strike: title === "Morgan dollar 1895" ? "proof" : "circulation",
        year_from: String(year),
        year_to: String(year),
        is_addable: "true",
        ...silverDollar,
        technical_details: [`Mint: ${mintNames[mint]}.`, notes[title]]
          .filter(Boolean)
          .join(" "),
        ...credit("notes", usMint),
      };
    }),
  );
  return [
    grouping,
    ...entries.map((entry, index) => ({
      ...entry,
      sort_order: String(index + 1),
    })),
  ];
}

const rows: Array<Record<string, string>> = [
  { id: "us", title: "United States", country: "US", sort_order: "0" },
  ...seriesRows(
    "us-morgan-dollar",
    "Morgan dollar",
    morganIssues,
    {
      technical_details:
        "Designed by George T. Morgan. 90% silver, 10% copper. Reeded edge.",
      historical_notes:
        "The Bland-Allison Act of 1878 brought back the standard silver dollar, and the Morgan design carried it until production stopped in 1904. The Pittman Act of 1918 melted millions of silver dollars, and the Mint struck Morgan dollars once more in 1921 before turning to the Peace dollar.",
    },
    1,
  ),
  ...seriesRows(
    "us-peace-dollar",
    "Peace dollar",
    peaceIssues,
    {
      technical_details:
        "Designed by Anthony de Francisci. 90% silver, 10% copper. Reeded edge.",
      historical_notes:
        "Approved in December 1921 to mark the peace after the First World War, the Peace dollar replaced the Morgan dollar. It was struck until 1928, and again in 1934 and 1935.",
    },
    2,
  ),
];

export const usSilverDollars = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
