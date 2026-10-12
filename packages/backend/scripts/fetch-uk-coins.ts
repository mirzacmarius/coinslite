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
// Proclamations altering earlier ones are applied where they change the
// words of a base-metal coin's design ("for ‘2018’ there shall be substituted
// ‘and the date of the year’") or substitute its design whole.
//
// Left out, and listed when the script ends: proclamations that make no
// base-metal coin of 1 penny to 2 pounds (gold, silver and platinum coins,
// five-pound crowns and up, calling-in notices), alterations that change no
// fact the Catalog keeps of one, and any reverse a proclamation allows only
// on precious-metal coins. The applied alterations are listed too.
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
  coinDate?: number;
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

/**
 * The year a design puts on the coin, where the proclamation fixes it: in
 * the obverse's inscription, unless it says "the date of the year", or as
 * "the date “2015”" or "the date 31 January 2020" in the reverse, in the
 * year the proclamation came into force or the next. Undefined where it
 * gives none, or several.
 */
function coinDateOf(inForce: string, obverse: string, reverse: string) {
  const years = (text: string) =>
    new Set(
      [...text.matchAll(/(?<![\d.])((?:19|20)\d\d)(?![\d])/g)].map((match) =>
        Number(match[1]),
      ),
    );
  if (!/date of the year/i.test(obverse)) {
    const stated = years(obverse);
    if (stated.size === 1) return [...stated][0];
    if (stated.size > 1) return undefined;
  }
  const from = Number(inForce.slice(0, 4));
  const dated = new Set(
    [
      ...reverse.matchAll(
        /\b(?:the date|bear(?:ing)? the date)\s+(?:“([^”]*)”|"([^"]*)"|((?:\d{1,2}(?:st|nd|rd|th)? [A-Z][a-z]+ )?(?:19|20)\d\d))/g,
      ),
    ]
      .flatMap((match) => [...years(match[1] ?? match[2] ?? match[3] ?? "")])
      .filter((year) => year === from || year === from + 1),
  );
  return dated.size === 1 ? [...dated][0] : undefined;
}

/** The design a proclamation gives a coin. */
const designOf = (proclamation: Proclamation, coin: ProclaimedCoin) =>
  coin.design === undefined ? undefined : proclamation.designs[coin.design];

const baseMetalOf = (proclamation: Proclamation) =>
  proclamation.coins.filter(
    (coin) =>
      isDenomination(coin.denomination) && !preciousMetal.test(coin.metal),
  );

const used: Proclamation[] = [];
const leftOut: string[] = [];
/** Proclamations that alter earlier ones, and what came of each. */
const altering: Proclamation[] = [];
const alterationsApplied: string[] = [];
const alterationsNotApplying: string[] = [];
const reversesLeftOut: string[] = [];
const problems: string[] = [];

/** A Markdown list item: "- 2017-02-16 [2712446](…/notice/2712446) DETERMINING …". */
const listItem = (proclamation: Proclamation) => {
  const title =
    proclamation.title.length > 110
      ? `${proclamation.title.slice(0, 110).replace(/\s\S*$/, "")}…`
      : proclamation.title;
  return `- ${proclamation.inForce ?? proclamation.published ?? "?"} [${proclamation.notice}](${gazette}/notice/${proclamation.notice}) ${title}`;
};
const noticeLink = (proclamation: Proclamation) =>
  `[${proclamation.notice}](${gazette}/notice/${proclamation.notice})`;

for (const id of await noticeIds()) {
  const xml = await cached(`notice-${id}.xml`, () =>
    fetched(`${gazette}/notice/${id}/data.xml`),
  );
  for (const proclamation of parseNotice(xml)) {
    if (proclamation.alters) altering.push(proclamation);
    else if (baseMetalOf(proclamation).length === 0)
      leftOut.push(listItem(proclamation));
    else if (!proclamation.inForce)
      problems.push(`${listItem(proclamation)}: no date it came into force`);
    else used.push(proclamation);
  }
}

/** Metals of base-metal coins and of precious ones, as headings name them. */
const baseMetalWords = /cupro-nickel|nickel-brass|steel|bronze/i;
const preciousWords = /\b(?:gold|silver|platinum)\b/i;
const words = (text: string) =>
  new Set(text.toLowerCase().match(/[a-z]{4,}/g) ?? []);

/**
 * Applies an altering proclamation to the base-metal coins of those it
 * alters, where it changes the words of their designs ("for ‘2018’ there
 * shall be substituted ‘and the date of the year’") or substitutes a whole
 * design. One whose heading names only gold, silver or platinum coins
 * changes none of them; nor do changes of remedy or of precious coins'
 * specifications, which the Catalog doesn't keep.
 */
function applyAlteration(alteration: Proclamation) {
  const targets = used.filter(
    (proclamation) =>
      proclamation.given && alteration.alters?.includes(proclamation.given),
  );
  const forBaseMetal =
    baseMetalWords.test(alteration.title) ||
    !preciousWords.test(alteration.title);
  const changes: string[] = [];
  if (targets.length > 0 && forBaseMetal) {
    for (const target of targets) {
      const designs = new Set(
        baseMetalOf(target).flatMap((coin) => designOf(target, coin) ?? []),
      );
      for (const { from, to } of alteration.substitutions ?? []) {
        const swap = (text: string) => text.split(from).join(to);
        let changed = false;
        for (const design of designs) {
          const before = JSON.stringify(design);
          if (design.obverse) design.obverse = swap(design.obverse);
          for (const reverse of design.reverses) {
            reverse.description = swap(reverse.description);
            if (reverse.obverse) reverse.obverse = swap(reverse.obverse);
            if (reverse.edge?.edge === "lettered")
              reverse.edge.lettering = swap(reverse.edge.lettering);
          }
          if (design.edge?.edge === "lettered")
            design.edge.lettering = swap(design.edge.lettering);
          changed ||= JSON.stringify(design) !== before;
        }
        if (changed)
          changes.push(`${noticeLink(target)}: “${from}” became “${to}”`);
      }
    }
    // A whole design substituted, for the proclamation it alters most alike.
    const [substituted] = alteration.designs;
    if (substituted && alteration.designs.length === 1) {
      const heading = words(alteration.title);
      const [target] = targets
        .map((proclamation) => ({
          proclamation,
          alike: [...words(proclamation.title)].filter((word) =>
            heading.has(word),
          ).length,
        }))
        .sort((a, b) => b.alike - a.alike)
        .map(({ proclamation }) => proclamation);
      if (target) {
        target.designs.push(substituted);
        for (const coin of baseMetalOf(target))
          coin.design = target.designs.length - 1;
        changes.push(`${noticeLink(target)}: its design substituted`);
      }
    }
  }
  if (changes.length > 0)
    alterationsApplied.push(`${listItem(alteration)}: ${changes.join("; ")}`);
  else alterationsNotApplying.push(listItem(alteration));
}

for (const alteration of altering.sort((a, b) =>
  (a.given ?? "").localeCompare(b.given ?? ""),
))
  applyAlteration(alteration);

const designs: Design[] = [];
const seen = new Set<string>();
for (const proclamation of used) {
  const inForce = proclamation.inForce as string;
  const baseMetal = baseMetalOf(proclamation);
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
      const obverse = reverse.obverse ?? design.obverse;
      const coinDate = coinDateOf(inForce, obverse ?? "", reverse.description);
      const year = coinDate ?? Number(inForce.slice(0, 4));
      // A reverse proclaimed again for the same year, alone or with another
      // obverse, is the same design.
      const same = [
        coin.denomination,
        coinDate ?? `in force ${year}`,
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
        inForce,
        ...(proclamation.occasion && { purpose: proclamation.occasion }),
        series,
        denomination: coin.denomination as Denomination,
        year,
        ...(coinDate && { coinDate }),
        metal: coin.metal,
        ...(coin.weight && { weight: coin.weight }),
        ...(coin.diameter && { diameter: coin.diameter }),
        ...(coin.composition && { composition: coin.composition }),
        ...(coin.sections && { sections: coin.sections }),
        ...(coin.shape && { shape: coin.shape }),
        ...(obverse && { obverse }),
        reverse: reverse.description,
        ...(edge && { edge }),
      });
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
  /** The year on the coin where the proclamation fixes it, else the year it came into force. */
  year: number;
  /** The year on the coin, where the proclamation fixes it. */
  coinDate?: number;
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
  ...used.map(listItem).sort(),
  "",
  `Left out, no base-metal coin of 1 penny to 2 pounds (${leftOut.length}):`,
  ...leftOut.sort(),
  "",
  `Alterations applied (${alterationsApplied.length}):`,
  ...alterationsApplied.sort(),
  "",
  `Alterations changing no base-metal coin's facts the Catalog keeps (${alterationsNotApplying.length}):`,
  ...alterationsNotApplying.sort(),
  "",
  `Reverses left out (${reversesLeftOut.length}):`,
  ...reversesLeftOut,
  "",
  `Problems (${problems.length}):`,
  ...problems,
])
  console.info(line);
