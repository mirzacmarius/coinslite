// Rebuilds convex/catalog/datasets/euroCommemorativeCoins.ts from the European
// Central Bank's list of 2-euro commemorative coins: one page per year, read in
// English and in each issuing country's language. Nothing here runs on a
// deployment; run it by hand when the ECB adds coins, then review the diff.
// Usage: bun scripts/fetch-euro-commemoratives.ts [cache-dir]
// With a cache directory, pages already saved there are read instead of fetched.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ecb = "https://www.ecb.europa.eu/euro/coins/comm/html";
const target = new URL(
  "../convex/catalog/datasets/euroCommemorativeCoins.ts",
  import.meta.url,
).pathname;
const cacheDir = process.argv[2];

/** The country names the ECB's English pages use, as ISO 3166-1 alpha-2. */
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
  Nederland: "NL",
  Portugal: "PT",
  "San Marino": "SM",
  San_Marino: "SM",
  Slovakia: "SK",
  Slovenia: "SI",
  Spain: "ES",
  "Vatican City": "VA",
  Vatican: "VA",
};

/**
 * A country's one national language, where the ECB publishes its pages in it.
 * Countries with several official languages (Belgium, Cyprus, Finland,
 * Ireland, Luxembourg, Malta) and Andorra (Catalan isn't one of the ECB's
 * languages) keep the ECB's English.
 */
const languages: Record<string, string> = {
  AT: "de",
  DE: "de",
  BG: "bg",
  EE: "et",
  ES: "es",
  FR: "fr",
  MC: "fr",
  GR: "el",
  HR: "hr",
  IT: "it",
  SM: "it",
  VA: "it",
  LT: "lt",
  LV: "lv",
  NL: "nl",
  PT: "pt",
  SI: "sl",
  SK: "sk",
};

/** How each language's pages head a country, for the countries that use it. */
const localCountryNames: Record<string, Record<string, string>> = {
  bg: { България: "BG" },
  de: { Österreich: "AT", Deutschland: "DE" },
  el: { Ελλάδα: "GR" },
  es: { España: "ES" },
  et: { Eesti: "EE" },
  fr: { France: "FR", Monaco: "MC", "Principauté de Monaco": "MC" },
  hr: { Hrvatska: "HR" },
  it: {
    Italia: "IT",
    "San Marino": "SM",
    "Repubblica di San Marino": "SM",
    "Città del Vaticano": "VA",
  },
  lt: { Lietuva: "LT" },
  lv: { Latvija: "LV" },
  nl: { Nederland: "NL" },
  pt: { Portugal: "PT" },
  sk: { Slovensko: "SK" },
  sl: { Slovenija: "SI" },
};

/** The label each language gives a coin's feature, the first thing a box says. */
const featureLabels: Record<string, string[]> = {
  en: ["Feature"],
  bg: ["Тема"],
  de: ["Anlass der Ausgabe", "Anlass", "Thema", "Abbildung", "Gedenkobjekt"],
  el: ["Θέμα"],
  es: ["Motivo conmemorativo", "Feature"],
  et: ["Motiiv"],
  fr: ["Dessin commémoratif"],
  hr: ["Tema"],
  it: ["Effigie"],
  lt: ["Atvaizdas", "Proga", "Paminėjimo tema", "Įamžinimo objektas"],
  lv: ["Motīvs"],
  nl: ["Onderwerp van de herdenkingsmunt", "Onderwerp", "Feature"],
  pt: ["Desenho"],
  sk: ["Motív"],
  sl: ["Motiv"],
};

/** Titles the ECB's list leaves out, from the Official Journal notice of the coin. */
const titlesFromTheOfficialJournal: Record<
  string,
  { title: string; notice: string; link: string }
> = {
  "comm_2023/0439-23r.jpg": {
    title:
      "The 25th anniversary of the membership of Grand Duke Henri to the International Olympic Committee",
    notice: "2023/C 122/05",
    link: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:C:2023:122:FULL",
  },
};

/** Coins whose page in the national language contradicts the English one: keep the English. */
const keepEnglish = new Set([
  // The Italian page says 750th; Dante died in 1321.
  "2021 VA The 700th anniversary of the death of Dante Alighieri",
]);

type Box = {
  images: string[];
  country: string;
  /** Labelled paragraphs in page order. */
  fields: Array<[string, string]>;
  /** Paragraphs without a label. */
  extra: string[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function page(name: string) {
  const cached = cacheDir && join(cacheDir, name);
  if (cached && existsSync(cached)) return readFileSync(cached, "utf8");
  await delay(700);
  const response = await fetch(`${ecb}/${name}`, {
    headers: { "User-Agent": "CoinsLite catalog builder" },
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const html = await response.text();
  if (cached) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cached, html);
  }
  return html;
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function clean(fragment: string) {
  return fragment
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match)
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The coins on one year page, each in its box. */
function boxes(html: string): Box[] {
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  return main
    .split('<div class="box"')
    .slice(1)
    .map((part) => {
      const content = part.slice(part.indexOf('class="content-box"'));
      const box: Box = {
        images: [...part.matchAll(/<img src="([^"]+)"/g)].map(
          (match) => match[1] as string,
        ),
        country: clean(/<h3>(.*?)<\/h3>/s.exec(part)?.[1] ?? ""),
        fields: [],
        extra: [],
      };
      for (const [, paragraph = ""] of content.matchAll(/<p>(.*?)<\/p>/gs)) {
        const labelled = /^\s*<strong>(.*?)<\/strong>(.*)$/s.exec(paragraph);
        if (labelled) {
          const label = clean(labelled[1] ?? "")
            .replace(/:$/, "")
            .trim();
          const value = clean(labelled[2] ?? "")
            .replace(/^:/, "")
            .trim();
          if (!box.fields.some(([known]) => known === label))
            box.fields.push([label, value]);
        } else if (clean(paragraph)) {
          box.extra.push(clean(paragraph));
        }
      }
      return box;
    });
}

/** An English box's facts, with stray "Label: value" paragraphs folded back in. */
function englishFacts(box: Box) {
  const facts = new Map(box.fields);
  const split = facts.get("Issuing");
  if (split?.startsWith("date:")) {
    facts.set("Issuing date", split.slice(5).trim());
    facts.delete("Issuing");
  }
  const more: string[] = [];
  for (const paragraph of box.extra) {
    const labelled = /^(Issuing volume|Issuing date):\s*(.*)$/.exec(paragraph);
    if (labelled) {
      if (!facts.has(labelled[1] as string))
        facts.set(labelled[1] as string, labelled[2] as string);
    } else {
      more.push(paragraph);
    }
  }
  if (more.length > 0)
    facts.set(
      "Description",
      [facts.get("Description") ?? "", ...more].join(" ").trim(),
    );
  return facts;
}

function featureOf(box: Box | undefined, language: string) {
  const [label, value] = box?.fields[0] ?? [];
  return label && value && featureLabels[language]?.includes(label)
    ? value
    : undefined;
}

/** The issuing country of one coin in a joint issue's row of pictures. */
function jointCountry(image: string) {
  const name = image.split("/").at(-1) ?? "";
  // Germany's Erasmus coin: the picture shows mint mark D and sits where Deutschland sorts.
  if (name.includes("EU1-erasmus")) return "DE";
  // A second picture of Luxembourg's coin.
  if (name.includes("Luxembourg_Face")) return undefined;
  const stem = name
    .replace(/\.(jpg|png)$/i, "")
    .replace(/^joint_comm_\d{4}_/, "")
    .replace(/\d+$/, "");
  const code = countryCodes[stem];
  if (!code) throw new Error(`Unknown joint issue picture ${image}`);
  return code;
}

/** "Grand-Duc Henri" -> "grand-duc-henri", short enough for a Catalog id. */
function slug(text: string, room: number) {
  const words = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/['’‘]/g, "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  let result = "";
  for (const word of words) {
    const next = result ? `${result}-${word}` : word;
    if (next.length > room) break;
    result = next;
  }
  return result || (words[0] ?? "coin").slice(0, room);
}

const capitalised = (text: string, language: string) =>
  text.charAt(0).toLocaleUpperCase(language) + text.slice(1);

/** Some Greek pages type the micro sign (µ) for the letter mu (μ), which search would miss. */
const greekLetters = (text: string, language: string) =>
  language === "el" ? text.replace(/\u00b5/g, "\u03bc") : text;

const index = await page("index.en.html");
const years = [
  ...new Set(
    [...index.matchAll(/comm_(\d{4})\.en\.html/g)].map((match) =>
      Number(match[1]),
    ),
  ),
].sort((a, b) => a - b);

type Coin = {
  key: string;
  country: string;
  year: number;
  title: string;
  language: string;
  description: string;
  volume: string;
  issued: string;
  titleFrom?: { notice: string; link: string };
};
const coins: Coin[] = [];
const report: string[] = [];

for (const year of years) {
  const english = boxes(await page(`comm_${year}.en.html`));
  const needed = new Set<string>();
  for (const box of english) {
    const countries =
      box.images.length > 1
        ? box.images.map(jointCountry)
        : [countryCodes[box.country]];
    for (const country of countries) {
      const language = country && languages[country];
      if (language) needed.add(language);
    }
  }
  const local = new Map<string, Box[]>();
  for (const language of needed) {
    local.set(language, boxes(await page(`comm_${year}.${language}.html`)));
  }

  const singlesOf = (list: Box[], country: string, language?: string) =>
    list.filter(
      (box) =>
        box.images.length === 1 &&
        (language
          ? localCountryNames[language]?.[box.country]
          : countryCodes[box.country]) === country,
    );

  /**
   * The same coin's box on the page in its country's language: a joint issue
   * by the country's picture, other coins by their place among the country's
   * coins, or by picture when the pages list different numbers of them.
   */
  const localBox = (
    box: Box,
    country: string,
    language: string,
    image: string,
  ) => {
    const page = local.get(language) ?? [];
    if (box.images.length > 1)
      return page.find(
        (other) => other.images.length > 1 && other.images.includes(image),
      );
    const ours = singlesOf(english, country);
    const theirs = singlesOf(page, country, language);
    if (ours.length === theirs.length) return theirs[ours.indexOf(box)];
    const sameImage = theirs.filter(
      (other) => other.images[0] === box.images[0],
    );
    const oursSameImage = ours.filter(
      (other) => other.images[0] === box.images[0],
    );
    return sameImage.length === 1 && oursSameImage.length === 1
      ? sameImage[0]
      : undefined;
  };

  /** This year's coins, each with its place on the page. */
  const yearCoins: Array<Coin & { position: number }> = [];
  english.forEach((box, position) => {
    const facts = englishFacts(box);
    const joint = box.images.length > 1;
    const issuers = joint
      ? box.images.flatMap((image) => {
          const country = jointCountry(image);
          return country ? [{ country, image }] : [];
        })
      : [{ country: countryCodes[box.country], image: box.images[0] }];
    for (const { country, image } of issuers) {
      if (!country) throw new Error(`${year}: unknown country ${box.country}`);
      const englishTitle = featureOf(box, "en");
      const fromJournal = image
        ? titlesFromTheOfficialJournal[image]
        : undefined;
      let title = englishTitle ?? fromJournal?.title;
      let language = "en";
      const national = languages[country];
      if (national && !keepEnglish.has(`${year} ${country} ${englishTitle}`)) {
        const localTitle = featureOf(
          localBox(box, country, national, image as string),
          national,
        );
        if (localTitle) {
          title = capitalised(greekLetters(localTitle, national), national);
          language = national;
        } else {
          report.push(`${year} ${country}: no ${national} title, kept English`);
        }
      }
      const description = facts.get("Description");
      const volume = facts.get("Issuing volume");
      const issued = facts.get("Issuing date");
      if (!title || !description || !volume || !issued)
        throw new Error(
          `${year} ${country}: incomplete entry ${JSON.stringify([...facts])}`,
        );
      const prefix = `eur2-${country.toLowerCase()}-${year}-`;
      yearCoins.push({
        key: prefix + slug(englishTitle ?? title, 64 - prefix.length),
        country,
        year,
        title,
        language,
        description: capitalised(description, "en"),
        volume,
        issued,
        ...(!englishTitle &&
          fromJournal && {
            titleFrom: { notice: fromJournal.notice, link: fromJournal.link },
          }),
        position,
      });
    }
  });
  // The ECB lists each year's newest coins first.
  coins.push(
    ...yearCoins
      .sort((a, b) => b.position - a.position)
      .map(({ position: _, ...coin }) => coin),
  );
}

const keys = new Set<string>();
for (const coin of coins) {
  if (keys.has(coin.key)) throw new Error(`Two coins share the id ${coin.key}`);
  keys.add(coin.key);
}

const literal = (coin: Coin) =>
  `  {\n${Object.entries(coin)
    .map(([name, value]) => `    ${name}: ${JSON.stringify(value)},`)
    .join("\n")}\n  },`;

writeFileSync(
  target,
  `// Generated by packages/backend/scripts/fetch-euro-commemoratives.ts from the
// European Central Bank's list of 2-euro commemorative coins:
// ${ecb}/index.en.html
// Run the script again rather than editing by hand.

/** One 2-euro commemorative coin, as the ECB lists it. */
export type EuroCommemorativeCoin = {
  /** The Catalog id: country, year and the ECB's English feature. */
  key: string;
  /** The issuing country, ISO 3166-1 alpha-2. */
  country: string;
  year: number;
  /** The coin's feature, from the ECB's page in \`language\`. */
  title: string;
  /** The issuing country's language where the ECB publishes in it, otherwise English. */
  language: string;
  /** The ECB's description of the design, in English. */
  description: string;
  /** Issuing volume, as the ECB gives it. */
  volume: string;
  /** Issuing date, as the ECB gives it. */
  issued: string;
  /** Where the title comes from when the ECB's list gives none. */
  titleFrom?: { notice: string; link: string };
};

/** Every coin from ${years[0]} to ${years.at(-1)}: by year, then in the order they were issued. */
export const euroCommemorativeCoins: EuroCommemorativeCoin[] = [
${coins.map(literal).join("\n")}
];
`,
);
execFileSync("bunx", ["biome", "format", "--write", target], {
  stdio: "inherit",
});

const perYear = years.map(
  (year) => `${year}: ${coins.filter((coin) => coin.year === year).length}`,
);
console.info(`${coins.length} coins (${perYear.join(", ")})`);
for (const line of report) console.info(line);
