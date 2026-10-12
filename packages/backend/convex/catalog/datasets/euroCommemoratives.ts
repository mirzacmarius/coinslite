import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns } from "../fields";
import {
  type EuroCommemorativeCoin,
  type EuroCommemorativeTranslation,
  euroCommemorativeCoins,
  euroCommemorativesIntro,
} from "./euroCommemorativeCoins";
import { de } from "./euroCommemorativeCoinsDe";
import { fr } from "./euroCommemorativeCoinsFr";
import { ro } from "./euroCommemorativeCoinsRo";

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
 * The ECB publishes its list in German, French and Romanian too, so each
 * coin's description comes in those languages, credited to that page.
 * Issuing volumes and dates that are plain figures become facts; others
 * ("varies from country to country", "autumn 2021") stay in the ECB's words.
 *
 * No images: the national sides' designs belong to each issuing country, and
 * the ECB's terms don't cover showing them, so entries show the placeholder.
 */

export const ecbPages = "https://www.ecb.europa.eu/euro/coins";
const changes =
  "Changes by CoinsLite: arranged into Catalog fields; capitals and typography tidied.";

export const ecb = (link: string) => ({
  source: "European Central Bank",
  author: "European Central Bank",
  licence: `Reused under the ECB's copyright terms, citing the ECB. Available free of charge at www.ecb.europa.eu. ${changes}`,
  link,
});
const officialJournal = (notice: string, link: string) => ({
  source: `Official Journal of the European Union, notice ${notice}`,
  author: "European Commission",
  licence: `© European Union. Reuse allowed with the source acknowledged (Commission Decision 2011/833/EU). ${changes}`,
  link,
});

type Provenance = ReturnType<typeof ecb>;
export const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});

/** The app's languages besides English that the ECB publishes in, with its pages in each. */
const translations = { de, fr, ro } as const;
type Translation = keyof typeof translations;
const translationLanguages = Object.keys(translations) as Translation[];

/** Notes in one of those languages, credited to the ECB's page in it. */
export const translated = (
  language: Translation,
  notes: { technical_details?: string; historical_notes?: string },
  link: string,
) => {
  const from = ecb(link);
  return {
    ...(notes.technical_details && {
      [`technical_details_${language}`]: notes.technical_details,
    }),
    ...(notes.historical_notes && {
      [`historical_notes_${language}`]: notes.historical_notes,
    }),
    [`notes_source_${language}`]: from.source,
    [`notes_author_${language}`]: from.author,
    [`notes_licence_${language}`]: from.licence,
    [`notes_link_${language}`]: from.link,
  };
};

/** How the ECB's pages label a coin's issuing volume and date, in each language. */
const factLabels: Record<"en" | Translation, [string, string]> = {
  en: ["Issuing volume", "Issuing date"],
  de: ["Ausgabevolumen", "Ausgabedatum"],
  fr: ["Volume d’émission", "Date d’émission"],
  ro: ["Tirajul emisiunii", "Data emiterii"],
};
/** French sets a colon apart. */
const colon = (language: string) => (language === "fr" ? "\u00a0: " : ": ");

/** "50 million coins", "1,4 million coins", "100,000 coins" or "1 000 000 coins" as a number. */
function mintageOf(volume: string) {
  const match = /^(\d[\d ,.]*?)\s*(millions?)?(?: coins)?$/.exec(volume.trim());
  if (!match) return undefined;
  const [, figure = "", million] = match;
  if (million) {
    const value = Number(figure.replace(",", "."));
    return Number.isFinite(value) ? Math.round(value * 1_000_000) : undefined;
  }
  const digits = figure.replace(/[ ,]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : undefined;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** "March 2004" as 2004-03 and "1 July 2022" as 2022-07-01; a quarter or a season isn't a date. */
function issueDateOf(issued: string) {
  const match = new RegExp(
    `^(?:(\\d{1,2}) )?(${months.join("|")}) (\\d{4})$`,
  ).exec(issued.trim());
  if (!match) return undefined;
  const [, day, month = "", year] = match;
  const mm = String(months.indexOf(month) + 1).padStart(2, "0");
  return day ? `${year}-${mm}-${day.padStart(2, "0")}` : `${year}-${mm}`;
}

/**
 * A coin's issuing volume and date: as facts where they are plain figures,
 * else as the ECB words them, in English and in each language it publishes.
 */
function issueOf(
  coin: EuroCommemorativeCoin,
  pages: Partial<Record<Translation, EuroCommemorativeTranslation>>,
) {
  // A coin whose facts the Official Journal credits keeps the ECB's figures as words.
  const mintage = coin.titleFrom ? undefined : mintageOf(coin.volume);
  const issueDate = coin.titleFrom ? undefined : issueDateOf(coin.issued);
  const words = (
    language: "en" | Translation,
    volume?: string,
    issued?: string,
  ) => {
    const [volumeLabel, issuedLabel] = factLabels[language];
    const line = (label: string, value?: string) =>
      value && `${label}${colon(language)}${value.replace(/\.$/, "")}.`;
    return [
      mintage === undefined && line(volumeLabel, volume),
      issueDate === undefined && line(issuedLabel, issued),
    ]
      .filter(Boolean)
      .join(" ");
  };
  return {
    facts: {
      ...(mintage !== undefined && { mintage: String(mintage) }),
      ...(issueDate !== undefined && { issue_date: issueDate }),
    },
    technical: {
      en: words("en", coin.volume, coin.issued),
      ...Object.fromEntries(
        Object.entries(pages).map(([language, page]) => [
          language,
          words(language as Translation, page?.volume, page?.issued),
        ]),
      ),
    } as Partial<Record<"en" | Translation, string>>,
  };
}

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
  historical_notes: euroCommemorativesIntro.en,
  ...credit("notes", ecb(`${ecbPages}/comm/html/index.en.html`)),
  ...Object.assign(
    {},
    ...translationLanguages.map((language) =>
      translated(
        language,
        { historical_notes: euroCommemorativesIntro[language] },
        `${ecbPages}/comm/html/index.${language}.html`,
      ),
    ),
  ),
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
      ...coins.map((coin, index) => {
        const pages = Object.fromEntries(
          translationLanguages.flatMap((language) => {
            const page = translations[language][coin.key];
            return page ? [[language, page]] : [];
          }),
        ) as Partial<Record<Translation, EuroCommemorativeTranslation>>;
        const issue = issueOf(coin, pages);
        return {
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
          ...issue.facts,
          technical_details: issue.technical.en ?? "",
          historical_notes: coin.description,
          ...credit("notes", ecb(yearPage(coin.year, "en"))),
          ...Object.assign(
            {},
            ...Object.entries(pages).map(([language, page]) =>
              translated(
                language as Translation,
                {
                  technical_details: issue.technical[language as Translation],
                  historical_notes: page?.description,
                },
                yearPage(coin.year, language),
              ),
            ),
          ),
        };
      }),
    ];
  }),
];

export const euroCommemoratives = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
