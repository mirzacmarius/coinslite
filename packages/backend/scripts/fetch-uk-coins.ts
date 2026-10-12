// Rebuilds convex/catalog/datasets/unitedKingdomCoins.ts from the royal
// proclamations under the Coinage Act 1971 that The Gazette publishes: one
// record per design of each base-metal coin of a circulating denomination
// (1 penny to 2 pounds) that a proclamation makes.
//
// The Gazette lists its notices through its search API; every proclamation
// mentioning coins is listed from The London Gazette (the Edinburgh and
// Belfast Gazettes reprint the same proclamations), and each notice is read
// as data.xml. The Gazette's notices as data begin in 1998; earlier
// proclamations are only scanned pages, which this doesn't read.
//
// Left out, and listed when the script ends: proclamations that make no
// base-metal coin of 1 penny to 2 pounds (gold, silver and platinum coins,
// five-pound crowns and up, alterations and calling-in notices), and any
// reverse a proclamation allows only on precious-metal coins.
//
// Nothing here runs on a deployment; run it by hand, then review the diff.
// Usage: bun scripts/fetch-uk-coins.ts [cache-dir]
// With a cache directory, the lists and notices saved there are read instead
// of fetched.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Edge,
  type Part,
  type Proclamation,
  type ProclaimedCoin,
  parseNotice,
} from "./gazette-proclamation";

const target = new URL(
  "../convex/catalog/datasets/unitedKingdomCoins.ts",
  import.meta.url,
).pathname;
const cacheDir = process.argv[2];
const gazette = "https://www.thegazette.co.uk";

/** The circulating denominations, in Catalog order. */
const denominations = [
  "1 penny",
  "2 pence",
  "5 pence",
  "10 pence",
  "20 pence",
  "50 pence",
  "1 pound",
  "2 pounds",
] as const;
type Denomination = (typeof denominations)[number];
const isDenomination = (text: string): text is Denomination =>
  (denominations as readonly string[]).includes(text);

/** Coins of these are precious-metal issues, never circulating ones. */
const preciousMetal = /^(gold|silver|platinum|palladium)\b/;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A response from The Gazette, retried while it is busy. */
async function fetched(url: string) {
  for (let attempt = 1; ; attempt += 1) {
    await delay(700);
    const response = await fetch(url, {
      headers: { "User-Agent": "CoinsLite catalog builder" },
    }).catch(() => undefined);
    if (response?.ok) return await response.text();
    if (attempt === 5)
      throw new Error(`${url}: HTTP ${response?.status ?? "failed"}`);
    await delay(attempt * 5_000);
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

/** Every proclamation notice in The London Gazette that mentions coins. */
async function noticeIds() {
  const ids: string[] = [];
  for (let page = 1; ; page += 1) {
    const text = await cached(`list-${page}.json`, () =>
      fetched(
        `${gazette}/all-notices/notice/data.json?noticetypes=1101&text=coins&edition=London&results-page-size=100&results-page=${page}`,
      ),
    );
    const entries =
      (JSON.parse(text) as { entry?: Array<{ id: string }> }).entry ?? [];
    ids.push(...entries.map((entry) => entry.id.replace(/^.*\//, "")));
    if (entries.length < 100) return ids;
  }
}

type Design = {
  /** The Gazette's notice ID. */
  notice: string;
  link: string;
  /** The proclamation's heading. */
  proclamation: string;
  given?: string;
  inForce: string;
  /** Why the coins are made, where the recital says. */
  purpose?: string;
  series: "definitive" | "commemorative";
  denomination: Denomination;
  year: number;
  metal: string;
  weight?: number;
  diameter?: number;
  composition?: Part[];
  sections?: { inner: Part[]; outer: Part[] };
  shape?: string;
  obverse?: string;
  reverse: string;
  edge?: Edge;
};

/**
 * Definitive or commemorative. A proclamation making base-metal coins of
 * three or more denominations at once is a new definitive series. Otherwise
 * its designs are commemorative when its heading or recital commemorates or
 * celebrates something, when they are 50 pence or 2 pounds designs (since
 * 1998 every 50 pence and 2 pounds proclamation outside the definitive series
 * has made commemorative designs), or when it gives a coin of 1 penny to 20
 * pence several reverses at once (the 2018 alphabet of ten pence designs).
 * The one pound designs of a single proclamation, such as its bridges or
 * capital cities, are definitive: they circulated in turn for years.
 */
function seriesOf(
  proclamation: Proclamation,
  baseMetal: ProclaimedCoin[],
): Design["series"] {
  const denominationsMade = new Set(baseMetal.map((coin) => coin.denomination));
  if (denominationsMade.size >= 3) return "definitive";
  if (proclamation.commemorative) return "commemorative";
  if (denominationsMade.has("50 pence") || denominationsMade.has("2 pounds"))
    return "commemorative";
  const several = baseMetal.some(
    (coin) =>
      coin.denomination !== "1 pound" &&
      (designOf(proclamation, coin)?.reverses.length ?? 0) > 1,
  );
  return several ? "commemorative" : "definitive";
}

/** The design a proclamation gives a coin. */
const designOf = (proclamation: Proclamation, coin: ProclaimedCoin) =>
  coin.design === undefined ? undefined : proclamation.designs[coin.design];

const designs: Design[] = [];
const used: string[] = [];
const leftOut: string[] = [];
/** Proclamations that alter earlier ones; their changes aren't applied. */
const alterations: string[] = [];
const reversesLeftOut: string[] = [];
const problems: string[] = [];
const seen = new Set<string>();

/** A Markdown list item: "- 2017-02-16 [2712446](…/notice/2712446) DETERMINING …". */
const listItem = (proclamation: Proclamation) => {
  const title =
    proclamation.title.length > 110
      ? `${proclamation.title.slice(0, 110).replace(/\s\S*$/, "")}…`
      : proclamation.title;
  return `- ${proclamation.inForce ?? proclamation.published ?? "?"} [${proclamation.notice}](${gazette}/notice/${proclamation.notice}) ${title}`;
};

for (const id of await noticeIds()) {
  const xml = await cached(`notice-${id}.xml`, () =>
    fetched(`${gazette}/notice/${id}/data.xml`),
  );
  for (const proclamation of parseNotice(xml)) {
    const baseMetal = proclamation.coins.filter(
      (coin) =>
        isDenomination(coin.denomination) && !preciousMetal.test(coin.metal),
    );
    if (baseMetal.length === 0) {
      (/^ALTERING\b/i.test(proclamation.title) ? alterations : leftOut).push(
        listItem(proclamation),
      );
      continue;
    }
    if (!proclamation.inForce) {
      problems.push(`${listItem(proclamation)}: no date it came into force`);
      continue;
    }
    used.push(listItem(proclamation));
    const series = seriesOf(proclamation, baseMetal);
    for (const coin of baseMetal) {
      const design = designOf(proclamation, coin);
      if (!design || design.reverses.length === 0) {
        problems.push(
          `${listItem(proclamation)}: no design for ${coin.denomination}`,
        );
        continue;
      }
      for (const reverse of design.reverses) {
        if (reverse.onlyFor && !reverse.onlyFor.includes(coin.metal)) {
          reversesLeftOut.push(
            `${listItem(proclamation)}: “${reverse.description}”, only for ${reverse.onlyFor}`,
          );
          continue;
        }
        const year = Number(proclamation.inForce.slice(0, 4));
        // A reverse proclaimed again for the same year, alone or with another obverse, is the same design.
        const same = [
          coin.denomination,
          year,
          reverse.description.toLowerCase(),
        ].join("|");
        if (seen.has(same)) continue;
        seen.add(same);
        const edge = reverse.edge ?? design.edge;
        designs.push({
          notice: proclamation.notice,
          link: `${gazette}/notice/${proclamation.notice}`,
          proclamation: proclamation.title,
          ...(proclamation.given && { given: proclamation.given }),
          inForce: proclamation.inForce,
          ...(proclamation.occasion && { purpose: proclamation.occasion }),
          series,
          denomination: coin.denomination as Denomination,
          year,
          metal: coin.metal,
          ...(coin.weight && { weight: coin.weight }),
          ...(coin.diameter && { diameter: coin.diameter }),
          ...(coin.composition && { composition: coin.composition }),
          ...(coin.sections && { sections: coin.sections }),
          ...(coin.shape && { shape: coin.shape }),
          ...(design.obverse && { obverse: design.obverse }),
          reverse: reverse.description,
          ...(edge && { edge }),
        });
      }
    }
  }
}

// By denomination, then the date each came into force, then the order the proclamation gives.
designs.sort(
  (a, b) =>
    denominations.indexOf(a.denomination) -
      denominations.indexOf(b.denomination) ||
    a.inForce.localeCompare(b.inForce),
);

const literal = (design: Design) =>
  `  {\n${Object.entries(design)
    .map(([name, value]) => `    ${name}: ${JSON.stringify(value)},`)
    .join("\n")}\n  },`;

writeFileSync(
  target,
  `// Generated by packages/backend/scripts/fetch-uk-coins.ts from the royal
// proclamations The Gazette publishes. Run the script again rather than
// editing by hand.
// Contains public sector information licensed under the Open Government
// Licence v3.0.

/** A metal and its share of a coin, as the proclamation gives it. */
export type ProclaimedPart = { metal: string; percent: number };

/** One design of a base-metal circulating coin, as its royal proclamation gives it. */
export type UkCoinDesign = {
  /** The Gazette's notice ID of the proclamation. */
  notice: string;
  /** The notice on The Gazette. */
  link: string;
  /** The proclamation's heading, as The Gazette prints it. */
  proclamation: string;
  /** YYYY-MM-DD, the day the proclamation was given at Court. */
  given?: string;
  /** YYYY-MM-DD, the day it came into force. */
  inForce: string;
  /** Why the coins are made, in the recital's words: "to commemorate …". */
  purpose?: string;
  series: "definitive" | "commemorative";
  denomination:
    | "1 penny"
    | "2 pence"
    | "5 pence"
    | "10 pence"
    | "20 pence"
    | "50 pence"
    | "1 pound"
    | "2 pounds";
  /** The year the proclamation came into force. */
  year: number;
  /** The coin's metal, in the proclamation's words: "cupro-nickel". */
  metal: string;
  /** Standard weight, grams. */
  weight?: number;
  /** Standard diameter, millimetres. */
  diameter?: number;
  composition?: ProclaimedPart[];
  /** The inner and outer sections of a coin of two alloys. */
  sections?: { inner: ProclaimedPart[]; outer: ProclaimedPart[] };
  /** "circular", "equilateral curve heptagon", "twelve sided". */
  shape?: string;
  /** The obverse, in the proclamation's words. */
  obverse?: string;
  /** This design's reverse, in the proclamation's words. */
  reverse: string;
  edge?:
    | { edge: "plain" | "reeded" | "interruptedReeding" }
    | { edge: "lettered"; lettering: string };
};

/** Every design, by denomination, then the date its proclamation came into force. */
export const ukCoinDesigns: UkCoinDesign[] = [
${designs.map(literal).join("\n")}
];
`,
);
execFileSync("bunx", ["biome", "format", "--write", target], {
  stdio: "inherit",
});

const counts = denominations.map(
  (denomination) =>
    `${denomination}: ${designs.filter((design) => design.denomination === denomination).length}`,
);
for (const line of [
  `${designs.length} designs (${counts.join(", ")})`,
  "",
  `Proclamations used (${used.length}):`,
  ...used.sort(),
  "",
  `Left out, no base-metal coin of 1 penny to 2 pounds (${leftOut.length}):`,
  ...leftOut.sort(),
  "",
  `Left out, altering an earlier proclamation (${alterations.length}):`,
  ...alterations.sort(),
  "",
  `Reverses left out (${reversesLeftOut.length}):`,
  ...reversesLeftOut,
  "",
  `Problems (${problems.length}):`,
  ...problems,
])
  console.info(line);
