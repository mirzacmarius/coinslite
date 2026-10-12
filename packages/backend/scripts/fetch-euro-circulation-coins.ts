// Rebuilds convex/catalog/datasets/euroCoinSides.ts (and its De, Fr and Ro
// files) from the European Central Bank's pages on euro coins: the national
// sides of each denomination, in English and in the app's languages the ECB
// publishes (German, French, Romanian), the common sides' specifications, and
// the year each member joined the euro area. Nordic gold's alloy comes from
// Council Regulation (EU) No 729/2014, read on legislation.gov.uk because
// EUR-Lex blocks automated reading.
// Nothing here runs on a deployment; run it by hand when the ECB adds a
// series or an issuer, then review the diff. A new series stops the script
// until its years and designers below are filled in from the ECB's text.
// Usage: bun scripts/fetch-euro-circulation-coins.ts [cache-dir]
// With a cache directory, pages already saved there are read instead of fetched.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type NationalSide,
  cashYears,
  commonSides,
  nationalSides,
  nordicGold,
} from "./euro-coin-pages";

const ecb = "https://www.ecb.europa.eu";
const regulationAnnex =
  "https://www.legislation.gov.uk/eur/2014/729/annexes/adopted";
const target = new URL(
  "../convex/catalog/datasets/euroCoinSides.ts",
  import.meta.url,
).pathname;
const cacheDir = process.argv[2];

/** The app's languages besides English that the ECB publishes its pages in. */
const translations = ["de", "fr", "ro"] as const;
type Translation = (typeof translations)[number];

/** The denominations, smallest first: the Catalog's name, and the names of the ECB's pages and pictures. */
const denominations = [
  { name: "1 cent", page: "1cent", picture: "1cent" },
  { name: "2 cent", page: "2cents", picture: "2cent" },
  { name: "5 cent", page: "5cents", picture: "5cent" },
  { name: "10 cent", page: "10cents", picture: "10cent" },
  { name: "20 cent", page: "20cents", picture: "20cent" },
  { name: "50 cent", page: "50cents", picture: "50cent" },
  { name: "1 euro", page: "1euro", picture: "1euro" },
  { name: "2 euro", page: "2euro", picture: "2euro" },
] as const;
type Denomination = (typeof denominations)[number]["name"];

/** The issuers' names on the ECB's English pages, as ISO 3166-1 alpha-2. */
const countryCodes: Record<string, string> = {
  Andorra: "AD",
  Austria: "AT",
  Belgium: "BE",
  Bulgaria: "BG",
  Croatia: "HR",
  Cyprus: "CY",
  Estonia: "EE",
  Finland: "FI",
  France: "FR",
  Germany: "DE",
  Greece: "GR",
  Ireland: "IE",
  Italy: "IT",
  Latvia: "LV",
  Lithuania: "LT",
  Luxembourg: "LU",
  Malta: "MT",
  Monaco: "MC",
  Netherlands: "NL",
  "The Netherlands": "NL",
  Portugal: "PT",
  "San Marino": "SM",
  Slovakia: "SK",
  Slovenia: "SI",
  Spain: "ES",
  "Vatican City": "VA",
};

/**
 * How a design series' years are known: from the year the issuer joined the
 * euro area (`joined`), from the ECB's words on the national sides (`words`,
 * which must appear there), or not at all.
 */
type SeriesPlan =
  | { joined: true; until?: never }
  | { from: number; until?: number; words: string }
  | { unknown: true; until?: never };
const joined: SeriesPlan = { joined: true };
const unknown: SeriesPlan = { unknown: true };
const since = (from: number, words: string, until?: number): SeriesPlan => ({
  from,
  words,
  ...(until !== undefined && { until }),
});

const isEuro = (denomination: Denomination) => denomination.endsWith("euro");
const isNordicGold = (denomination: Denomination) =>
  ["10 cent", "20 cent", "50 cent"].includes(denomination);

/**
 * Each issuer's design series, oldest first, one per picture on the ECB's
 * page; issuers not listed have one series since they joined. A series
 * replaced by the next ends the year before the next began, unless the ECB
 * says when it ended.
 */
const seriesPlans: Record<
  string,
  (denomination: Denomination) => SeriesPlan[]
> = {
  // Andorra's agreement dates from 2011; the ECB doesn't say when its coins began.
  AD: () => [unknown],
  BE: () => [
    joined,
    since(2008, "In 2008, Belgium slightly modified the design"),
    since(2014, "In 2014, Belgium introduced the third series"),
  ],
  ES: (denomination) => [
    joined,
    since(2010, "the coins were slightly redesigned in 2010"),
    ...(isEuro(denomination)
      ? [
          since(
            2015,
            "In 2015, Spain introduced a third series of €1 and €2 coins",
          ),
        ]
      : []),
  ],
  FR: (denomination) => {
    const second: Partial<Record<Denomination, SeriesPlan>> = {
      "2 euro": since(
        2022,
        "In 2022 France introduced a second series of €1 and €2 coins",
      ),
      "1 euro": since(
        2022,
        "In 2022 France introduced a second series of €1 and €2 coins",
      ),
      "50 cent": since(
        2024,
        "In 2024 France introduced a new 50 cent coin series",
      ),
      "20 cent": since(
        2024,
        "In 2024 France introduced a second series of 20 cent coins",
      ),
      "10 cent": since(2024, "In 2024 France introduced a new 10 cent coin"),
    };
    const later = second[denomination];
    return later ? [joined, later] : [joined];
  },
  MC: () => [
    since(2002, "The first series, issued in 2002"),
    since(2006, "The second series, introduced in 2006"),
    since(2025, "The third series, introduced in 2025"),
  ],
  NL: () => [joined, since(2014, "The second series, introduced in 2014")],
  // The ECB numbers San Marino's two series but gives no years.
  SM: () => [unknown, unknown],
  VA: () => [
    since(
      2002,
      "The first series, showing Pope John Paul II, was issued between 2002 and 2005",
      2005,
    ),
    // Dated 2005 (MMV), issued until March 2006.
    since(2005, 'the year of issue in Roman numerals, i.e. "MMV"', 2005),
    since(
      2006,
      "The third series, issued between April 2006 and December 2013",
      2013,
    ),
    since(2014, "The fourth series, first issued in January 2014"),
    since(2017, "The fifth series, first issued in March 2017"),
  ],
};

/**
 * Who designed a coin, where the ECB's text names them, by issuer, for a
 * denomination and a series counted from 0. Every name must appear in the
 * ECB's text on that coin in one of its languages.
 */
const designersOf: Record<
  string,
  (denomination: Denomination, series: number) => string[] | undefined
> = {
  AT: () => ["Josef Kaiser"],
  // The ECB credits Belgium's coins to Keustermans, the 2008 series being his
  // design slightly modified; it doesn't say who designed the third, King
  // Philippe's, series of 2014.
  BE: (_, series) => (series < 2 ? ["Jan Alfons Keustermans"] : undefined),
  DE: (denomination) =>
    isEuro(denomination)
      ? // The German page names them in full: "Heinz Hoyer und Sneschana Russewa-Hoyer".
        ["Heinz Hoyer", "Sneschana Russewa-Hoyer"]
      : isNordicGold(denomination)
        ? ["Reinhard Heinsdorff"]
        : ["Rolf Lederbogen"],
  FI: (denomination) =>
    denomination === "2 euro"
      ? ["Raimo Heino"]
      : denomination === "1 euro"
        ? ["Pertti Mäkinen"]
        : ["Heikki Häiväoja"],
  // The first series of 10, 20 and 50 cent: every ECB page credits "Laurent
  // Jorlo", which matches no known engraver, so it is left out.
  FR: (denomination, series) =>
    isEuro(denomination)
      ? series === 0
        ? ["Joaquin Jimenez"]
        : undefined
      : isNordicGold(denomination)
        ? series === 1
          ? ["Joaquin Jimenez"]
          : undefined
        : ["Fabienne Courtiade"],
  GR: () => ["Georges Stamatopoulos"],
  HR: (denomination) =>
    denomination === "2 euro"
      ? ["Ivan Šivak"]
      : denomination === "1 euro"
        ? ["Jagor Šunde", "David Čemeljić", "Fran Zekan"]
        : isNordicGold(denomination)
          ? ["Ivan Domagoj Račić"]
          : ["Maja Škripelj"],
  IE: () => ["Jarlath Hayes"],
  LT: () => ["Antanas Žukauskas"],
  LU: () => ["Yvette Gastauer-Claire"],
  LV: (denomination) =>
    isEuro(denomination) ? ["Guntars Sietiņš"] : ["Laimonis Šēnbergs"],
  NL: (_, series) => (series === 0 ? ["Bruno Ninaber van Eyben"] : undefined),
  PT: () => ["Vítor Manuel Fernandes dos Santos"],
  // The Sede Vacante series bears its designer's name, "D. LONGO".
  VA: (_, series) => (series === 1 ? ["D. Longo"] : undefined),
};

/** The ways the ECB's English pages describe the 2-euro coin's edge lettering. */
const letteringPatterns: Array<[RegExp, (match: RegExpExecArray) => string]> = [
  [
    /Edge[- ]lettering of the €2 coin(?:, both series)?: (.+?)(?:\.(?=\s+\p{Lu})|\.?$)/u,
    ([, lettering = ""]) => lettering,
  ],
  [
    /The inscription (.+?) is written twice, both normally and in reverse, around the edge of the coin/,
    ([, lettering = ""]) =>
      `${lettering}, written twice, both normally and in reverse`,
  ],
  [
    /The edge of the coin bears the inscription (.+?)\./,
    ([, lettering = ""]) => lettering,
  ],
];
/** Lettering the ECB gives for some of an issuer's series only. */
const letteringSeries: Record<string, number[]> = {
  // Under "First series:" only.
  SM: [0],
};

const ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function page(url: string, name: string) {
  const cached = cacheDir && join(cacheDir, name);
  if (cached && existsSync(cached)) return readFileSync(cached, "utf8");
  await delay(700);
  const response = await fetch(url, {
    headers: { "User-Agent": "CoinsLite catalog builder" },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  if (cached) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cached, html);
  }
  return html;
}

const sidesPage = (denomination: string, language: string) =>
  `${ecb}/euro/coins/${denomination}/html/index.${language}.html`;
const commonPage = (language: string) =>
  `${ecb}/euro/coins/common/html/index.${language}.html`;
const joiningPage = `${ecb}/euro/changeover/html/index.en.html`;

const years = cashYears(await page(joiningPage, "joining.en.html"));
const memberYears: Record<string, number> = {};
for (const [name, year] of Object.entries(years)) {
  const code = countryCodes[name];
  if (!code) throw new Error(`Unknown euro-area member ${name}`);
  memberYears[code] = year;
}

const alloy = nordicGold(
  await page(regulationAnnex, "regulation-729-2014.html"),
);
if (!alloy) throw new Error("No Nordic gold alloy in the regulation's annex");

/** Each denomination's specifications, from the common sides page in each language. */
const specifications: Record<
  string,
  Array<{ label: string; value: string }>
> = {};
const commonWords: Record<
  Translation,
  Record<string, Array<{ label: string; value: string }>>
> = { de: {}, fr: {}, ro: {} };
for (const language of ["en", ...translations] as const) {
  for (const side of commonSides(
    await page(commonPage(language), `common.${language}.html`),
  )) {
    const denomination = denominations.find(
      ({ picture }) => picture === side.picture,
    );
    if (!denomination) throw new Error(`Unknown common side ${side.picture}`);
    if (side.facts.length !== 7)
      throw new Error(
        `${language} ${side.picture}: ${side.facts.length} facts`,
      );
    if (language === "en") specifications[denomination.name] = side.facts;
    else commonWords[language][denomination.name] = side.facts;
  }
}
const number = (
  facts: Array<{ label: string; value: string }>,
  label: string,
) => {
  const value = facts.find((fact) => fact.label === label)?.value;
  if (!value || !/^\d+(\.\d+)?$/.test(value))
    throw new Error(`No ${label} in ${JSON.stringify(facts)}`);
  return value;
};

type Series = {
  title: string;
  yearFrom?: number;
  yearTo?: number;
  designers?: string[];
  edgeLettering?: string;
};
type Side = {
  key: string;
  country: string;
  denomination: Denomination;
  text: string;
  series: Series[];
};

const issuers = new Map<string, { name: string; page: string }>();
const sides: Side[] = [];
const translated: Record<Translation, Record<string, string>> = {
  de: {},
  fr: {},
  ro: {},
};
const report: string[] = [];

for (const denomination of denominations) {
  const english = nationalSides(
    await page(
      sidesPage(denomination.page, "en"),
      `${denomination.page}.en.html`,
    ),
  );
  const local: Record<Translation, NationalSide[]> = { de: [], fr: [], ro: [] };
  for (const language of translations) {
    local[language] = nationalSides(
      await page(
        sidesPage(denomination.page, language),
        `${denomination.page}.${language}.html`,
      ),
    );
  }
  for (const side of english) {
    const country = countryCodes[side.issuer];
    if (!country) throw new Error(`Unknown issuer ${side.issuer}`);
    issuers.set(country, { name: side.issuer, page: side.page });
    const key = `${country}-${denomination.picture}`;

    // The same box on each translated page: the same issuer's page and pictures.
    const texts = [side.text];
    for (const language of translations) {
      const other = local[language].find(
        (box) =>
          box.page === side.page &&
          box.pictures.join() === side.pictures.join(),
      );
      if (other?.text) {
        translated[language][key] = other.text;
        texts.push(other.text);
      } else report.push(`${key}: no ${language} text`);
    }

    const plans = (seriesPlans[country] ?? (() => [joined]))(denomination.name);
    if (plans.length !== side.pictures.length)
      throw new Error(
        `${key}: the ECB shows ${side.pictures.length} series (${side.pictures.join(", ")}), the plan has ${plans.length}`,
      );
    const starts = plans.map((plan) => {
      if ("joined" in plan) {
        const year = memberYears[country];
        if (year === undefined)
          throw new Error(`${key}: ${country} never joined`);
        return year;
      }
      if ("words" in plan) {
        if (!side.text.includes(plan.words))
          throw new Error(`${key}: the ECB no longer says "${plan.words}"`);
        return plan.from;
      }
      return undefined;
    });
    const series = plans.map((plan, index): Series => {
      const yearFrom = starts[index];
      const next = starts[index + 1];
      const yearTo = plan.until ?? (next === undefined ? undefined : next - 1);
      const designers = designersOf[country]?.(denomination.name, index);
      for (const name of designers ?? []) {
        if (
          !texts.some((text) => text.toLowerCase().includes(name.toLowerCase()))
        )
          throw new Error(`${key}: the ECB doesn't name ${name}`);
      }
      let edgeLettering: string | undefined;
      if (
        denomination.name === "2 euro" &&
        (letteringSeries[country]?.includes(index) ?? true)
      ) {
        for (const [pattern, read] of letteringPatterns) {
          const match = pattern.exec(side.text);
          if (match) {
            edgeLettering = read(match).trim();
            break;
          }
        }
      }
      return {
        title: `${ordinals[index]} series`,
        ...(yearFrom !== undefined && { yearFrom }),
        ...(yearTo !== undefined && { yearTo }),
        ...(designers && { designers }),
        ...(edgeLettering && { edgeLettering }),
      };
    });
    if (
      denomination.name === "2 euro" &&
      !series.some((one) => one.edgeLettering)
    )
      report.push(`${key}: no edge lettering in the ECB's text`);
    sides.push({
      key,
      country,
      denomination: denomination.name,
      text: side.text,
      series,
    });
  }
}

const literal = (value: unknown) =>
  `  {\n${Object.entries(value as Record<string, unknown>)
    .map(([name, item]) => `    ${name}: ${JSON.stringify(item)},`)
    .join("\n")}\n  },`;

const header = (language: string) =>
  `// Generated by packages/backend/scripts/fetch-euro-circulation-coins.ts from the
// European Central Bank's pages on the national and common sides of euro coins:
// ${sidesPage("2euro", language)} and the other denominations' pages
// Run the script again rather than editing by hand.
`;

const issuerList = [...issuers.entries()]
  .map(([code, { name, page }]) => ({ code, name, page }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  target,
  `${header("en")}
/** An issuer of euro coins: a euro-area member, or a country with a monetary agreement with the EU. */
export type EuroCoinIssuer = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  /** As the ECB's English pages name it. */
  name: string;
  /** Its page on the ECB's site: /euro/coins/html/{page}.en.html. */
  page: string;
};

/** One design series of an issuer's national side for a denomination. */
export type EuroCoinSeries = {
  /** "First series", as the ECB counts them. */
  title: string;
  yearFrom?: number;
  yearTo?: number;
  /** Where the ECB's text names them. */
  designers?: string[];
  /** The 2-euro coin's, as the ECB's text gives it. */
  edgeLettering?: string;
};

/** An issuer's national side of one denomination, as the ECB shows it. */
export type EuroNationalSide = {
  /** Issuer and denomination: "DE-2euro". */
  key: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  denomination: string;
  /** The ECB's English text on the design, covering every series. */
  text: string;
  /** One per picture on the ECB's page, oldest first. */
  series: EuroCoinSeries[];
};

/** A specification of the common side, as the ECB's page words it. */
export type EuroCoinFact = { label: string; value: string };

/** The issuers, by their English names. */
export const euroCoinIssuers: EuroCoinIssuer[] = [
${issuerList.map(literal).join("\n")}
];

/** Each denomination's diameter, thickness, weight, shape, colour, composition and edge, from the ECB's page on the common sides. */
export const euroCoinSpecifications: Record<string, EuroCoinFact[]> = ${JSON.stringify(specifications, null, 2)};

/** Nordic gold, the 10, 20 and 50-cent coins' alloy, in percent: Council Regulation (EU) No 729/2014, Annex I. */
export const nordicGold = ${JSON.stringify(alloy)};

/** Every issuer's national side of every denomination, smallest denomination first. */
export const euroNationalSides: EuroNationalSide[] = [
${sides.map(literal).join("\n")}
];
`,
);
const written = [target];
/** Each language in a file of its own, as one file would be too large to format. */
for (const language of translations) {
  const file = target.replace(
    /\.ts$/,
    `${language.charAt(0).toUpperCase()}${language.slice(1)}.ts`,
  );
  writeFileSync(
    file,
    `${header(language)}
import type { EuroCoinFact } from "./euroCoinSides";

/** The ECB's text on each national side on its pages in this language, by issuer and denomination. */
export const ${language}: Record<string, string> = ${JSON.stringify(translated[language], null, 2)};

/** The common sides' specifications on the ECB's page in this language, by denomination. */
export const ${language}Specifications: Record<string, EuroCoinFact[]> = ${JSON.stringify(commonWords[language], null, 2)};
`,
  );
  written.push(file);
}
execFileSync("bunx", ["biome", "format", "--write", ...written], {
  stdio: "inherit",
});

const coins = sides.flatMap((side) => side.series);
const perDenomination = denominations.map(
  ({ name }) =>
    `${name}: ${sides.filter((side) => side.denomination === name).flatMap((side) => side.series).length}`,
);
console.info(
  `${issuers.size} issuers, ${coins.length} coins (${perDenomination.join(", ")})`,
);
for (const line of report) console.info(line);
