// Rebuilds convex/catalog/datasets/usCoinProgrammeCoins.ts from the US Mint's
// coin pages for its circulating coin programmes: the 50 State Quarters, DC
// and U.S. Territories, America the Beautiful and American Women quarters,
// and the Presidential and Native American $1 coins.
//
// usmint.gov answers automated requests, headless browsers included, with a
// 403 or a Cloudflare challenge, so every page is read from its latest
// Wayback Machine capture, found through the Wayback CDX API. The American
// Women Quarters pages are those of the Mint's former site, which it took
// down; the others are on its current site.
//
// Nothing here runs on a deployment; run it by hand, then review the diff.
// Usage: bun scripts/fetch-us-coin-programmes.ts [cache-dir]
// With a cache directory, capture lists and pages saved there are read
// instead of fetched.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCoinPage } from "./usMintPage";

const target = new URL(
  "../convex/catalog/datasets/usCoinProgrammeCoins.ts",
  import.meta.url,
).pathname;
const cacheDir = process.argv[2];

const site = "https://www.usmint.gov";
const learn = `${site}/learn/coins-and-medals`;

/** The programmes, in Catalog order, and where the Mint keeps their coin pages. */
const programmes = [
  {
    key: "stateQuarters",
    denomination: "quarter",
    pages: `${learn}/circulating-coins/quarter/50-state-quarters/`,
    removed: false,
  },
  {
    key: "dcTerritoriesQuarters",
    denomination: "quarter",
    pages: `${learn}/circulating-coins/quarter/dc-and-us-territories-quarters/`,
    removed: false,
  },
  {
    key: "americaTheBeautifulQuarters",
    denomination: "quarter",
    pages: `${learn}/circulating-coins/quarter/america-the-beautiful-quarters/`,
    removed: false,
  },
  {
    key: "americanWomenQuarters",
    denomination: "quarter",
    pages: `${site}/coins/coin-medal-programs/american-women-quarters/`,
    removed: true,
  },
  {
    key: "presidentialDollars",
    denomination: "dollar",
    pages: `${learn}/collectible-coins/presidential-dollar-coins/`,
    removed: false,
  },
  {
    key: "nativeAmericanDollars",
    denomination: "dollar",
    pages: `${learn}/collectible-coins/native-american-dollar-coins/`,
    removed: false,
  },
] as const;
type Programme = (typeof programmes)[number];

/**
 * The Native American $1 pages are headed only "2009 Native American $1
 * Coin"; each design is named here after the theme its page gives, by the
 * page's address.
 */
const nativeAmericanDesigns: Record<string, string> = {
  "2009-three-sisters-agriculture": "Three Sisters Agriculture",
  "2010-great-tree-of-peace": "Great Tree of Peace",
  "2011-wampanoag-nation-alliance-with-plymouth-bay":
    "Wampanoag Alliance at Plymouth Bay",
  "2012-trade-routes-17th-century": "Trade Routes in the 17th Century",
  "2013-delaware-treaty-of-1778": "Delaware Treaty of 1778",
  "2014-native-american-hospitality-to-lewis-clark-expedition":
    "Native American Hospitality to the Lewis and Clark Expedition",
  "2015-mohawk-ironworkers": "Mohawk Ironworkers",
  "2016-native-american-code-talkers": "Native American Code Talkers",
  "2017-sequoyah": "Sequoyah",
  "2018-jim-thorpe": "Jim Thorpe",
  "2019-american-indians-in-space": "American Indians in the Space Program",
  "2020-elizabeth-peratrovich": "Elizabeth Peratrovich",
  "2021-military-service": "Native Americans in the U.S. Military",
  "2022-ely-parker": "Ely Samuel Parker",
  "2023-maria-tallchief": "Maria Tallchief",
  "2024-indian-citizenship-act-of-1924": "Indian Citizenship Act of 1924",
};

/** Page headings that don't end in the usual "Quarter" or "Presidential $1 Coin". */
const designNames: Record<string, string> = {
  "grover-cleveland": "Grover Cleveland (first term)",
  "grover-cleveland-second-term": "Grover Cleveland (second term)",
};

/**
 * Edge inscriptions a page lists wrongly, corrected: the Thomas Jefferson
 * page breaks "IN GOD WE TRUST" across two lines, as "E PLURIBUS UNUMIN" and
 * "GOD WE TRUST"; the other 2007 pages read as corrected here.
 */
const edgeCorrections: Record<string, Record<string, string>> = {
  "thomas-jefferson": {
    "E PLURIBUS UNUMIN": "E PLURIBUS UNUM",
    "GOD WE TRUST": "IN GOD WE TRUST",
  },
};

/**
 * Circulation mints, by the names the pages give them. San Francisco, which
 * many pages list too, strikes the proofs ("The Denver and Philadelphia Mint
 * facilities make the circulating and uncirculated coins, and the San
 * Francisco Mint makes the proof coins", the Mint's quarter page), so it has
 * no circulation entry.
 */
const mintMarks: Record<string, "P" | "D" | "W"> = {
  Philadelphia: "P",
  Denver: "D",
  "West Point": "W",
};

const report: string[] = [];
const summary: string[] = [];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A Wayback Machine response, retried while the archive is busy. */
async function archived(url: string) {
  for (let attempt = 1; ; attempt += 1) {
    await delay(1500);
    const response = await fetch(url).catch(() => undefined);
    if (response?.ok) return await response.text();
    if (attempt === 6)
      throw new Error(`${url}: HTTP ${response?.status ?? "failed"}`);
    await delay(attempt * 10_000);
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

/** Each coin page of a programme, with its latest capture the archive holds as it was served. */
async function capturesOf(programme: Programme) {
  const pages = programme.pages.replace(/^https:\/\/www\./, "");
  const list = await cached(`${programme.key}.cdx.txt`, () =>
    archived(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(pages)}&matchType=prefix&fl=original,timestamp&filter=statuscode:200&limit=100000`,
    ),
  );
  const latest = new Map<string, string>();
  for (const line of list.trim().split("\n")) {
    const [original = "", timestamp = ""] = line.split(" ");
    const slug = original
      .replace(/^https?:\/\/(www\.)?usmint\.gov(:80)?/, site)
      .replace(/[?#].*$/, "")
      .replace(/\.html$/, "")
      .replace(/\/$/, "")
      .slice(programme.pages.length);
    if (!/^[a-z0-9-]+$/.test(slug)) continue;
    if (timestamp > (latest.get(slug) ?? "")) latest.set(slug, timestamp);
  }
  return [...latest].map(([slug, timestamp]) => ({ slug, timestamp }));
}

function designName(programme: Programme, slug: string, title: string) {
  if (programme.key === "nativeAmericanDollars") {
    const name = nativeAmericanDesigns[slug];
    if (!name) throw new Error(`No design name for ${slug}`);
    return name;
  }
  return (
    designNames[slug] ??
    title.replace(/\s+(State Quarter|Quarter|Presidential \$1 Coin)$/, "")
  );
}

/** "Sculptor & Reverse Designer" reads "sculptor and reverse designer". */
const roleText = (role: string) =>
  role.replace(/\s*&\s*/g, " and ").toLowerCase();

type Coin = {
  programme: Programme["key"];
  slug: string;
  year: number;
  name: string;
  page: string;
  capture: string;
  releaseDate?: string;
  mints: Array<"P" | "D" | "W">;
  designers: string[];
  artistCredits: string;
  design: string;
  edgeInscriptions?: string[];
};
const coins: Coin[] = [];

for (const programme of programmes) {
  const found: Coin[] = [];
  for (const { slug, timestamp } of await capturesOf(programme)) {
    const page = `${programme.pages}${slug}`;
    const capture = `https://web.archive.org/web/${timestamp}/${page}`;
    const html = await cached(
      `${programme.key}--${slug}--${timestamp}.html`,
      () => archived(`https://web.archive.org/web/${timestamp}id_/${page}`),
    );
    const parsed = parseCoinPage(html);
    const mints = parsed.mints.flatMap((mint) => {
      const mark = mintMarks[mint];
      // West Point struck circulating quarters only in 2019 and 2020.
      const circulates =
        mark &&
        (mark !== "W" ||
          (programme.denomination === "quarter" &&
            (parsed.year === 2019 || parsed.year === 2020)));
      if (!circulates && mint !== "San Francisco")
        report.push(`${parsed.year} ${slug}: left out ${mint}`);
      return circulates ? [mark] : [];
    });
    if (mints.length === 0)
      throw new Error(`${slug}: mints ${parsed.mints.join(", ")}`);
    if (!mints.includes("P") || !mints.includes("D"))
      report.push(`${parsed.year} ${slug}: struck at ${mints.join(", ")} only`);
    if (!parsed.design) throw new Error(`${slug}: no design described`);
    if (parsed.artists.length === 0) throw new Error(`${slug}: no artists`);
    found.push({
      programme: programme.key,
      slug,
      year: parsed.year,
      name: designName(programme, slug, parsed.title),
      page: programme.removed ? capture : page,
      capture,
      ...(parsed.releaseDate && { releaseDate: parsed.releaseDate }),
      mints: (["P", "D", "W"] as const).filter((mark) => mints.includes(mark)),
      designers: [...new Set(parsed.artists.map(({ name }) => name))],
      artistCredits: parsed.artists
        .map(({ name, role }) => (role ? `${name}, ${roleText(role)}` : name))
        .join("; "),
      design: parsed.design,
      ...(parsed.edgeInscriptions.length > 0 && {
        edgeInscriptions: parsed.edgeInscriptions.map(
          (inscription) => edgeCorrections[slug]?.[inscription] ?? inscription,
        ),
      }),
    });
  }
  // By year, then in the order they were released, as far as the pages say.
  found.sort(
    (a, b) =>
      a.year - b.year ||
      (a.releaseDate ?? "9999").localeCompare(b.releaseDate ?? "9999") ||
      a.name.localeCompare(b.name),
  );
  coins.push(...found);
  const dated = found.filter((coin) => coin.releaseDate).length;
  summary.push(
    `${programme.key}: ${found.length} designs, ${dated} with a release date`,
  );
}

const literal = (coin: Coin) =>
  `  {\n${Object.entries(coin)
    .map(([name, value]) => `    ${name}: ${JSON.stringify(value)},`)
    .join("\n")}\n  },`;

writeFileSync(
  target,
  `// Generated by packages/backend/scripts/fetch-us-coin-programmes.ts from the
// US Mint's coin pages, read from their Wayback Machine captures.
// Run the script again rather than editing by hand.

/** One coin design of a US Mint circulating coin programme, as its page gives it. */
export type UsProgrammeCoin = {
  programme:
    | "stateQuarters"
    | "dcTerritoriesQuarters"
    | "americaTheBeautifulQuarters"
    | "americanWomenQuarters"
    | "presidentialDollars"
    | "nativeAmericanDollars";
  /** The last part of the page's address, unique within the programme. */
  slug: string;
  year: number;
  /** The design's name, from the page's heading: "Delaware". */
  name: string;
  /** The coin's page: on usmint.gov, or its capture where the Mint took the page down. */
  page: string;
  /** The Wayback Machine capture the facts were read from. */
  capture: string;
  /** YYYY-MM-DD, where the page says when the Mint released the coin. */
  releaseDate?: string;
  /** The mints that struck it for circulation. */
  mints: Array<"P" | "D" | "W">;
  /** The artists the page credits, in its order. */
  designers: string[];
  /** The page's artist credits with their roles. */
  artistCredits: string;
  /** The obverse and reverse described, in the Mint's words. */
  design: string;
  /** What the edge says, where the page lists it. */
  edgeInscriptions?: string[];
};

/** Every design, by programme, then year and release. */
export const usProgrammeCoins: UsProgrammeCoin[] = [
${coins.map(literal).join("\n")}
];
`,
);
execFileSync("bunx", ["biome", "format", "--write", target], {
  stdio: "inherit",
});

for (const line of [...summary, ...report]) console.info(line);
