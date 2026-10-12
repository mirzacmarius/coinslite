// Rebuilds convex/catalog/datasets/finlandCollectorCoins.ts from Finland's
// collector and commemorative coin decrees, read from the Finlex open data
// API (https://www.finlex.fi/fi/avoin-data), whose material is licensed
// CC BY 4.0.
//
// It lists every statute whose Finnish title contains "juhlaraha" or
// "keräilyraha" (the list endpoint returns at most 10 a call), reads each in
// Akoma Ntoso XML, applies the decrees that amend them, and reads each coin
// with scripts/finlex-decree.ts. The Act on the Independence Jubilee Fund
// ("juhlarahasto") matches the search and is left out.
//
// Not read yet: decrees titled in the plural, "… juhlarahoista", which issue
// several coins of different designs (the 5 euro provinces, the 1 000
// markkaa gold coins). Their titles contain neither search word; the script
// lists them at the end so they stay in view.
//
// Nothing here runs on a deployment; run it by hand, then review the diff.
// Usage: bun scripts/fetch-finlex-coins.ts [cache-dir]
// With a cache directory, lists and decrees saved there are read instead of
// fetched.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  amended,
  coinsOf,
  type Decree,
  type DecreeCoin,
  designOf,
  readDecree,
} from "./finlex-decree";

const target = new URL(
  "../convex/catalog/datasets/finlandCollectorCoins.ts",
  import.meta.url,
).pathname;
const cacheDir = process.argv[2];
const api = "https://opendata.finlex.fi/finlex/avoindata/v1/akn/fi/act";
const searches = ["juhlaraha", "keräilyraha"];

/**
 * Years of issue for decrees that neither state one nor date the design in
 * a way the parser reads, taken from the decree's own words.
 */
const issueYears: Record<string, number> = {
  // The design splits the date: "vuosiluvun alkuosa "19"" and "vuosiluvun
  // loppuosa "98"".
  "1177/1997": 1998,
  // The design isn't dated; the coin marks the 200th anniversary of Fredrik
  // Pacius's birth (1809), and the decree came into force on 29 January 2009.
  "27/2009": 2009,
};

/**
 * 1265/1995 issues the EU 10 markkaa in two alloys: aluminium bronze and
 * cupronickel for the circulating series, and gold and silver. Read by hand
 * from its 2 and 3 §, which the checks below hold the decree to.
 */
function euCoins(decree: Decree): DecreeCoin[] {
  const text = decree.sections.flatMap((s) => s.paragraphs).join(" ");
  for (const words of [
    "lyödään käyttörahasarjaan 10 markan juhlaraha",
    "valmistetaan sekä alumiinipronssi- ja nikkelikupariseoksesta että kulta- ja hopeaseoksesta",
    "Alumiinipronssista ja nikkelikupariseoksesta valmistetun juhlarahan paino on 8,8 + 0,30 grammaa ja kulta- ja hopeaseoksesta valmistetun juhlarahan paino 12,2 + 0,30 grammaa",
    "Juhlarahan halkaisija on 27,25 + 0,05 millimetriä",
    "Osa lyöntimäärästä voidaan lyödä erikoislyöntinä",
    "Rahapaja Oy:n hallussa",
  ])
    if (!text.includes(words))
      throw new Error(`1265/1995 no longer says "${words}"`);
  const shared = {
    subject: "EU-juhlaraha",
    denomination: "10 markkaa",
    year: 1995,
    material: "bimetallic",
    diameter: 27.25,
    mint: "Rahapaja Oy",
    design: designOf(decree),
  } as const;
  return [
    { ...shared, weight: 8.8 },
    { ...shared, variant: "goldAndSilver", weight: 12.2 },
  ];
}
const handRead: Record<string, (decree: Decree) => DecreeCoin[]> = {
  "1265/1995": euCoins,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A Finlex response, retried while the API asks callers to slow down. */
async function finlex(url: string) {
  for (let attempt = 1; ; attempt += 1) {
    await delay(1000);
    const response = await fetch(url, {
      headers: { "User-Agent": "CoinsLite catalog builder" },
    }).catch(() => undefined);
    // The list endpoint answers 404 for a page past the last.
    if (response?.ok || response?.status === 404)
      return { found: response.ok, text: await response.text() };
    if (attempt === 8)
      throw new Error(`${url}: HTTP ${response?.status ?? "failed"}`);
    await delay(attempt * 15_000);
  }
}

async function cached(name: string, read: () => Promise<string>) {
  const file = cacheDir && join(cacheDir, name);
  if (file && existsSync(file)) return readFileSync(file, "utf8");
  const text = await read();
  if (file) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, text);
  }
  return text;
}

/** Every statute whose Finnish title contains `words`, by its open data address. */
async function statutesTitled(words: string) {
  const found: string[] = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(`${api}/statute/list`);
    url.search = new URLSearchParams({
      format: "json",
      limit: "10",
      page: String(page),
      titleContains: words,
      langAndVersion: "fin@",
    }).toString();
    const text = await cached(`list-${words}-${page}.json`, async () => {
      const { found, text } = await finlex(url.href);
      return found ? text : "[]";
    });
    const list = JSON.parse(text) as Array<{ akn_uri: string }>;
    found.push(...list.map((statute) => statute.akn_uri));
    if (list.length < 10) return found;
  }
}

const report: string[] = [];
const addresses = [
  ...new Set((await Promise.all(searches.map(statutesTitled))).flat()),
];
const decrees: Decree[] = [];
for (const address of addresses) {
  const [, year, number] = /\/statute\/(\d{4})\/(\d+)\//.exec(address) ?? [];
  if (!year || !number) throw new Error(`Not a statute address: ${address}`);
  const xml = await cached(`${year}-${number}.xml`, async () => {
    const { found, text } = await finlex(address);
    if (!found) throw new Error(`${address}: not found`);
    return text;
  });
  const decree = readDecree(xml);
  if (/juhlarahasto/.test(decree.title)) {
    report.push(`Left out ${number}/${year}: ${decree.title}`);
    continue;
  }
  decrees.push(decree);
}

const citation = (decree: { year: number; number: number }) =>
  `${decree.number}/${decree.year}`;
const amendments = decrees.filter((decree) => decree.amends);
const bases = decrees
  .filter((decree) => !decree.amends)
  .sort((a, b) => a.year - b.year || a.number - b.number);
for (const amendment of amendments) {
  const base = amendment.amends;
  if (!base || !bases.some((decree) => citation(decree) === citation(base)))
    throw new Error(`${citation(amendment)} amends a decree not found`);
}

type Coin = DecreeCoin & { decreeYear: number; decreeNumber: number };
const coins: Coin[] = [];
for (const decree of bases) {
  const changes = amendments.filter(
    (amendment) =>
      amendment.amends && citation(amendment.amends) === citation(decree),
  );
  const read = (one: Decree) =>
    handRead[citation(one)]?.(one) ??
    coinsOf(one, { year: issueYears[citation(one)] });
  const found = read(amended(decree, changes));
  // Each entry links its decree alone, so an amendment may change no fact.
  if (
    changes.length > 0 &&
    JSON.stringify(found) !== JSON.stringify(read(decree))
  )
    throw new Error(
      `${changes.map(citation).join(", ")} change the facts of ${citation(decree)}; credit the amendment too`,
    );
  if (changes.length > 0)
    report.push(
      `${citation(decree)}: applied ${changes.map(citation).join(", ")}, no fact changed`,
    );
  coins.push(
    ...found.map((coin) => ({
      decreeYear: decree.year,
      decreeNumber: decree.number,
      ...coin,
    })),
  );
}

const literal = (coin: Coin) =>
  `  {\n${Object.entries(coin)
    .map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`)
    .join("\n")}\n  },`;

writeFileSync(
  target,
  `// Generated by packages/backend/scripts/fetch-finlex-coins.ts from Finland's
// coin decrees in the Finlex open data API (CC BY 4.0).
// Run the script again rather than editing by hand.

/** One coin a Finnish collector or commemorative coin decree issues, as the decree gives it. */
export type FinlandCollectorCoin = {
  /** The decree's year and number in the Statute Book: 288/2025. */
  decreeYear: number;
  decreeNumber: number;
  /** The coin's subject in Finnish, as the decree names it. */
  subject: string;
  /** "20 euro", "100 markkaa" */
  denomination: string;
  /** A second coin of the same denomination: a proof in an alloy of its own, or the one in gold and silver. */
  variant?: "proof" | "goldAndSilver";
  year: number;
  /** Set where every coin is struck as a proof. */
  strike?: "proof";
  material: "silver" | "gold" | "aluminiumBronze" | "bimetallic";
  metal?: "silver" | "gold";
  fineness?: number;
  composition?: string;
  weight: number;
  diameter: number;
  edge?: "plain" | "reeded" | "lettered";
  edgeLettering?: string;
  mint?: string;
  /** The mint master's initial. */
  mintMark?: string;
  /** The obverse and reverse described, in the decree's Finnish. */
  design: string;
};

/** Every coin, by decree. */
export const finlandCollectorCoins: FinlandCollectorCoin[] = [
${coins.map(literal).join("\n")}
];
`,
);
execFileSync("bunx", ["biome", "format", "--write", target], {
  stdio: "inherit",
});

const issued = coins.map((coin) => coin.year);
console.info(
  `${addresses.length} statutes found, ${bases.length} coin decrees (${bases[0]?.year}–${bases.at(-1)?.year}), ${amendments.length} amendments, ${coins.length} coins issued ${Math.min(...issued)}–${Math.max(...issued)}`,
);
for (const line of report) console.info(line);

const plural = await statutesTitled("juhlarahoista");
console.info(
  `Not read yet: ${plural.length} statutes titled "… juhlarahoista":\n${plural.join("\n")}`,
);
