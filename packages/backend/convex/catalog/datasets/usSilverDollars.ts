import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";

/**
 * The first Catalog dataset: United States Morgan dollars (1878–1904 and 1921)
 * and Peace dollars (1921–1928 and 1934–1935), every date and mint, as a
 * Catalog CSV file.
 *
 * Facts: the United States Mint. Its works are public domain (17 U.S.C. § 105),
 * and these dates, mints and specifications are facts. Historical notes are
 * CoinsLite's own summary of the Mint's history, in English, translated by
 * CoinsLite into the app's other languages. No images yet: entries show the
 * placeholder until a licensed photo is added.
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

const translation = {
  source: "CoinsLite editorial translation",
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

/** The languages CoinsLite translates these notes into. */
const languages = ["nb", "de", "fr", "ro"] as const;
type Translated = { en: string } & Record<(typeof languages)[number], string>;

/** A note in English and CoinsLite's translations of it, each translation credited. */
const translated = (
  column: "technical_details" | "historical_notes",
  text: Translated,
) => ({
  [column]: text.en,
  ...Object.fromEntries(
    languages.flatMap((language) => [
      [`${column}_${language}`, text[language]],
      [`notes_source_${language}`, translation.source],
      [`notes_author_${language}`, translation.author],
      [`notes_licence_${language}`, translation.licence],
      [`notes_link_${language}`, translation.link],
    ]),
  ),
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
  composition: "silver 90%; copper 10%",
  edge: "reeded",
  ...credit("facts", usMint),
};

/** Philadelphia struck its dollars without a mint mark. */
const mintNames: Record<string, string> = {
  P: "Philadelphia",
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
const notes: Record<string, Translated> = {
  "Morgan dollar 1895": {
    en: "Known only in proof: no circulation strikes of 1895 from Philadelphia are known.",
    nb: "Kjent bare som proof: ingen sirkulasjonspreg fra Philadelphia fra 1895 er kjent.",
    de: "Nur in Polierter Platte bekannt: Umlaufprägungen von 1895 aus Philadelphia sind nicht bekannt.",
    fr: "Connu uniquement en belle épreuve : aucune frappe courante de 1895 de Philadelphie n’est connue.",
    ro: "Cunoscut doar în calitate proof: nu se cunosc exemplare de circulație din 1895 bătute la Philadelphia.",
  },
  "Peace dollar 1921": {
    en: "Struck in high relief, lowered from 1922.",
    nb: "Preget i høyt relieff, senket fra 1922.",
    de: "In Hochrelief geprägt, ab 1922 flacher.",
    fr: "Frappé en haut relief, abaissé à partir de 1922.",
    ro: "Bătut în relief înalt, coborât începând din 1922.",
  },
};

function seriesRows(
  key: string,
  series: string,
  issues: Array<[number, string]>,
  designer: string,
  history: Translated,
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
    designers: designer,
    ...translated("historical_notes", history),
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
        designers: designer,
        mint: mintNames[mint] ?? "",
        mint_mark: mint === "P" ? "none" : mint,
        ...(notes[title] && {
          ...translated("technical_details", notes[title]),
          ...credit("notes", usMint),
        }),
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
    "George T. Morgan",
    {
      en: "The Bland-Allison Act of 1878 brought back the standard silver dollar, and the Morgan design carried it until production stopped in 1904. The Pittman Act of 1918 melted millions of silver dollars, and the Mint struck Morgan dollars once more in 1921 before turning to the Peace dollar.",
      nb: "Bland-Allison-loven av 1878 gjeninnførte standard-sølvdollaren, og Morgan-motivet ble brukt til pregingen stanset i 1904. Etter Pittman-loven av 1918 ble millioner av sølvdollar smeltet om, og myntverket preget Morgan-dollar én gang til i 1921 før det gikk over til Peace-dollaren.",
      de: "Der Bland-Allison Act von 1878 führte den Standard-Silberdollar wieder ein, und das Morgan-Motiv blieb bis zum Ende der Prägung 1904 in Gebrauch. Nach dem Pittman Act von 1918 wurden Millionen Silberdollar eingeschmolzen; 1921 prägte die Münzanstalt noch einmal Morgan-Dollar, bevor sie zum Peace-Dollar überging.",
      fr: "Le Bland-Allison Act de 1878 rétablit le dollar d’argent standard, et le type Morgan le porta jusqu’à l’arrêt de la frappe en 1904. Le Pittman Act de 1918 fit fondre des millions de dollars d’argent, et la Monnaie frappa une dernière fois des dollars Morgan en 1921 avant de passer au dollar Peace.",
      ro: "Legea Bland-Allison din 1878 a readus dolarul standard de argint, iar modelul Morgan a fost folosit până la oprirea producției, în 1904. În urma Legii Pittman din 1918 au fost topiți milioane de dolari de argint, iar Monetăria a mai bătut dolari Morgan o dată în 1921, înainte de a trece la dolarul Peace.",
    },
    1,
  ),
  ...seriesRows(
    "us-peace-dollar",
    "Peace dollar",
    peaceIssues,
    "Anthony de Francisci",
    {
      en: "Approved in December 1921 to mark the peace after the First World War, the Peace dollar replaced the Morgan dollar. It was struck until 1928, and again in 1934 and 1935.",
      nb: "Peace-dollaren ble godkjent i desember 1921 for å markere freden etter første verdenskrig, og erstattet Morgan-dollaren. Den ble preget til 1928, og igjen i 1934 og 1935.",
      de: "Der im Dezember 1921 genehmigte Peace-Dollar erinnerte an den Frieden nach dem Ersten Weltkrieg und löste den Morgan-Dollar ab. Er wurde bis 1928 und erneut 1934 und 1935 geprägt.",
      fr: "Approuvé en décembre 1921 pour célébrer la paix après la Première Guerre mondiale, le dollar Peace remplaça le dollar Morgan. Il fut frappé jusqu’en 1928, puis de nouveau en 1934 et 1935.",
      ro: "Aprobat în decembrie 1921 pentru a marca pacea de după Primul Război Mondial, dolarul Peace a înlocuit dolarul Morgan. A fost bătut până în 1928 și din nou în 1934 și 1935.",
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
