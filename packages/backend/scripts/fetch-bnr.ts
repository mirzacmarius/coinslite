// Rebuilds convex/catalog/datasets/romaniaBnr.ts from the National Bank of
// Romania's website: its numismatic catalogue (coins, banknotes and mint
// sets), the coins and banknotes in circulation with the circulars that issued
// them, and the 2000–2003 polymer banknotes.
// Nothing here runs on a deployment; run it by hand when the BNR adds issues,
// then review the diff.
// Usage: bun scripts/fetch-bnr.ts [cache-dir]
// With a cache directory, pages already saved there are read instead of fetched.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  circulationDateOf,
  clean,
  coinFacts,
  formatDenomination,
  isBroken,
  metalOf,
  parseBanknotePage,
  parseCircularCoins,
  parseCirculationBanknotes,
  parseCirculationCoins,
  parseCoinIssue,
  labelledValue,
} from "./bnr-page";

const site = "https://www.bnr.ro";
const cacheDir = process.argv[2];
const target = new URL(
  "../convex/catalog/datasets/romaniaBnr.ts",
  import.meta.url,
).pathname;

/** A coin as the Catalog will hold it, in the BNR's words where it has no field. */
type Coin = {
  key: string;
  title: string;
  denomination: string;
  year: number;
  /** YYYY-MM-DD */
  issueDate?: string;
  material?: string;
  metal?: string;
  fineness?: number;
  weight?: number;
  diameter?: number;
  thickness?: number;
  composition?: string;
  edge?: string;
  strike?: string;
  /** The BNR's own description, in Romanian. */
  details: string;
  link: string;
};
type Banknote = Pick<
  Coin,
  "key" | "title" | "denomination" | "year" | "issueDate" | "details" | "link"
> & { width?: number; height?: number };
/** An issue of several coins, or a mint set. */
type Issue = {
  key: string;
  title: string;
  year: number;
  issueDate?: string;
  link: string;
  details?: string;
  pieces: Coin[];
};

/** The labels of a numismatic coin's facts. */
const knownLabels = new Set([
  "Valoare nominală",
  "Metal",
  "Greutate",
  "Dimensiune",
  "Margine",
  "Calitate",
  "Tiraj maxim",
]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One request a second, as the BNR's own pages load, identifying the script. */
async function request(name: string, url: string, form?: URLSearchParams) {
  const cached = cacheDir && join(cacheDir, name);
  if (cached && existsSync(cached)) return readFileSync(cached, "utf8");
  await delay(1000);
  const response = await fetch(url, {
    method: form ? "POST" : "GET",
    headers: {
      "User-Agent":
        "CoinsLite catalog builder (https://github.com/mirzacmarius/coinslite)",
    },
    ...(form && { body: form }),
  });
  if (!response.ok) throw new Error(`${url} ${name}: HTTP ${response.status}`);
  const text = await response.text();
  if (cached) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cached, text);
  }
  return text;
}

/** A page's number, the start of its slug: "25745" for "25745-pictori-romani-nicolae-tonitza". */
const pageId = (slug: string) => slug.split("-")[0] as string;

/**
 * A page's content. bnr.ro renders client-side: the page is a shell of
 * numbered blocks, and POST /blocks returns each block's HTML.
 */
export async function pageOf(slug: string) {
  const shell = await request(`${pageId(slug)}.html`, `${site}/${slug}`);
  const blocks: string[] = [];
  for (const [, bid = ""] of shell.matchAll(
    /class="block-wrapper" id="(\d+)"/g,
  )) {
    blocks.push(
      await request(
        `${pageId(slug)}.${bid}.html`,
        `${site}/blocks`,
        new URLSearchParams({ bid, currentSlug: slug, cat_id: "" }),
      ),
    );
  }
  return blocks.join("\n");
}

/** Every page of a paged list: POST /getpaginare returns each page's HTML. */
export async function listOf(slug: string) {
  const first = await pageOf(slug);
  const controls = /class="pagination-controls[^>]*>/.exec(first)?.[0] ?? "";
  const pages = Number(/data-total-pages="(\d+)"/.exec(controls)?.[1] ?? 1);
  const bid = /data-bid="(\d+)"/.exec(controls)?.[1];
  if (!bid) return [first];
  const all: string[] = [];
  for (let page = 1; page <= pages; page++) {
    const json = await request(
      `${pageId(slug)}.list.${page}.json`,
      `${site}/getpaginare`,
      new URLSearchParams({ bid, pagina: String(page) }),
    );
    all.push((JSON.parse(json) as { data: { content: string } }).data.content);
  }
  return all;
}

/** The detail pages a list links to, in its order. */
const linksOf = (html: string) => [
  ...new Set(
    [...html.matchAll(/href="\/?(\d+-[a-z0-9-]+)"/g)].map(
      ([, slug]) => slug as string,
    ),
  ),
];

const link = (slug: string) => `${site}/${slug}`;
/** What the run read and left out, printed at the end for the pull request. */
const report: string[] = [];
const read = { listPages: 0, detailPages: 0 };

/** Each list's detail pages, after reading every page of the list. */
async function detailPagesOf(slug: string) {
  const pages = await listOf(slug);
  read.listPages += pages.length;
  const links = pages.flatMap(linksOf);
  report.push(`${slug}: ${pages.length} pages, ${links.length} issues`);
  const details: Array<{ slug: string; html: string }> = [];
  for (const each of links) {
    details.push({ slug: each, html: await pageOf(each) });
    read.detailPages += 1;
  }
  return details;
}

/** "10 lei" as "10-lei", "1.000.000 lei" as "1000000-lei". */
const keyOf = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const yearOf = (date: string | undefined) =>
  date ? Number(date.slice(0, 4)) : undefined;

/** Notes are 5000 characters at most: whole paragraphs up to that, saying so when some are left out. */
function detailsOf(lines: string[], where: string) {
  const kept: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length + 1 > 5000) {
      report.push(`${where}: description cut to 5000 characters`);
      break;
    }
    kept.push(line);
    length += line.length + 1;
  }
  return kept.join("\n");
}

// The numismatic catalogue: coins (and medals, which aren't money, so left out).
const numismaticCoins: Issue[] = [];
for (const { slug, html } of await detailPagesOf("2271-monede-si-medalii")) {
  const issue = parseCoinIssue(html);
  if (issue.pieces.length === 0) {
    // One issue links to its press release, a table rather than the catalogue's page.
    report.push(`${slug}: not a catalogue page, left out (${issue.title})`);
    continue;
  }
  const year = yearOf(issue.date);
  if (!year) throw new Error(`${slug}: no date of issue`);
  const pieces: Coin[] = [];
  for (const piece of issue.pieces) {
    const facts = coinFacts(piece);
    const value = labelledValue(piece, "Valoare nominală");
    if (!facts.denomination) {
      report.push(
        `${slug}: left out "${piece.heading}" (nominal value ${JSON.stringify(value ?? null)})`,
      );
      continue;
    }
    for (const line of piece.lines) {
      const [label = ""] = line.split(":");
      if (!knownLabels.has(label.trim()))
        report.push(`${slug}: unknown label "${label}"`);
    }
    const metal = labelledValue(piece, "Metal");
    if (metal && !facts.material)
      report.push(`${slug}: unknown metal "${metal}"`);
    for (const [label, known] of [
      ["Margine", facts.edge],
      ["Calitate", facts.strike],
      ["Greutate", facts.weight],
    ] as const) {
      const text = labelledValue(piece, label);
      if (text && known === undefined)
        report.push(`${slug}: ${label} "${text}" left out`);
    }
    pieces.push({
      key: "",
      title: piece.heading
        ? `${facts.denomination}, ${piece.heading.toLocaleLowerCase("ro")}`
        : facts.denomination,
      year,
      ...(issue.date && { issueDate: issue.date }),
      ...facts,
      strike: facts.strike,
      details: [
        // Values the BNR's page failed to fill in are left out.
        piece.lines
          .filter((line) => !isBroken(line))
          .join(" "),
        piece.obverse,
        piece.reverse,
      ]
        .filter(Boolean)
        .join("\n"),
      link: link(slug),
    } as Coin);
  }
  if (pieces.length === 0) {
    report.push(`${slug}: no coin, left out (${issue.title})`);
    continue;
  }
  const id = `ro-bnr-${pageId(slug)}`;
  // A piece's id is its issue's and its value: then its metal, where the
  // issue has several of that value, and its place, where they share the metal.
  const sameValue = (piece: Coin) =>
    pieces.filter((other) => other.denomination === piece.denomination);
  for (const piece of pieces) {
    const base = `${id}-${keyOf(piece.denomination)}`;
    const value = sameValue(piece);
    const sameTitle = value.filter((other) => other.title === piece.title);
    piece.key =
      value.length === 1
        ? base
        : sameTitle.length === 1
          ? keyOf(`${base}-${piece.title.split(", ")[1] ?? ""}`)
          : `${base}-${value.indexOf(piece) + 1}`;
  }
  const titles = pieces.map((piece) => {
    const sameTitle = pieces.filter((other) => other.title === piece.title);
    return sameTitle.length > 1
      ? `${piece.title} (${sameTitle.indexOf(piece) + 1})`
      : piece.title;
  });
  pieces.forEach((piece, index) => {
    piece.title = titles[index] ?? piece.title;
  });
  if (new Set(pieces.map((piece) => piece.key)).size !== pieces.length)
    throw new Error(`${slug}: two coins share an id`);
  numismaticCoins.push({
    key: id,
    title: issue.title,
    year,
    ...(issue.date && { issueDate: issue.date }),
    link: link(slug),
    pieces,
  });
}

/** "10 lei", "1.000.000 de lei" or "1 leu" in a text, as the Catalog writes it. */
function denominationIn(text: string) {
  const match = /(\d[\d.]*)\s*(?:de\s+)?(lei|leu)\b/i.exec(text);
  return match ? formatDenomination(match[1] ?? "", match[2] ?? "") : undefined;
}

// Numismatic banknotes: notes and special sheets issued for collectors.
const numismaticBanknotes: Banknote[] = [];
for (const { slug, html } of await detailPagesOf("1066-bancnote")) {
  const page = parseBanknotePage(html);
  const text = page.lines.join(" ");
  const denomination =
    denominationIn(
      /valoare(?:a)? nominal[ăa][^.;]{0,30}?\d[\d.]*\s*(?:de\s+)?lei/i.exec(
        text,
      )?.[0] ?? "",
    ) ??
    denominationIn(page.title) ??
    denominationIn(text) ??
    // "Valoarea nominală este înscrisă de patru ori: … în cifre „100”; … „LEI UNA SUTĂ”"
    denominationIn(
      `${/valoarea nominal[ăa] este [îi]nscris[ăa][^„]*„(\d[\d.]*)”/i.exec(text)?.[1]} ${/„LEI [A-ZĂÂÎȘŞȚŢ ]+”/.test(text) ? "lei" : ""}`,
    );
  const year = yearOf(page.date);
  if (!denomination || !year) {
    report.push(`${slug}: no nominal value or date, left out`);
    continue;
  }
  numismaticBanknotes.push({
    key: `ro-bnr-${pageId(slug)}`,
    title: page.title,
    denomination,
    year,
    ...(page.date && { issueDate: page.date }),
    ...(page.width && { width: page.width, height: page.height }),
    details: detailsOf(page.lines, slug),
    link: link(slug),
  });
}

// Mint sets: the coins of the year, with a medal, which isn't money.
const mintSets: Issue[] = [];
for (const { slug, html } of await detailPagesOf("1069-seturi-de-monetarie")) {
  const page = parseBanknotePage(html);
  // The set's page says it once for small screens and once for large ones.
  const lines = [...new Set(page.lines)];
  const text = lines.join(" ");
  const year = yearOf(page.date);
  const coins = [
    ...new Set(
      [
        ...(text.split(/medali/i)[0] ?? "").matchAll(
          /(\d[\d.]*)\s*(?:de\s+)?(bani|ban|lei|leu)\b/gi,
        ),
      ].map(([, value, unit]) => formatDenomination(value ?? "", unit ?? "")),
    ),
  ];
  if (!year || coins.length === 0) {
    report.push(`${slug}: no coins or date, left out`);
    continue;
  }
  const key = `ro-bnr-${pageId(slug)}`;
  mintSets.push({
    key,
    title: page.title,
    year,
    ...(page.date && { issueDate: page.date }),
    link: link(slug),
    details: detailsOf(lines, slug),
    pieces: coins.map((denomination) => ({
      key: `${key}-${keyOf(denomination)}`,
      title: denomination,
      denomination,
      year,
      ...(page.date && { issueDate: page.date }),
      details: "",
      link: link(slug),
    })),
  });
}

// Circulation coins: the page lists them, Circular 14/2005 sets them out.
const coinsCircular = "21033-circulara-14-2005";
const coinsPage = "2267-monede-in-circulatie";
const circularHtml = await pageOf(coinsCircular);
const issued2005 = circulationDateOf(circularHtml);
const listed = parseCirculationCoins(await pageOf(coinsPage));
const circulationCoins: Coin[] = parseCircularCoins(circularHtml).map(
  (coin) => {
    const shown = listed.find(
      (each) => each.denomination === coin.denomination,
    );
    if (!shown || !issued2005)
      throw new Error(`${coin.denomination} isn't on ${coinsPage}`);
    const { material } = metalOf(shown.lines[0]);
    return {
      key: `ro-coin-2005-${keyOf(coin.denomination)}`,
      title: coin.denomination,
      denomination: coin.denomination,
      year: 2005,
      issueDate: issued2005,
      ...(material && { material }),
      ...(coin.weight && { weight: coin.weight }),
      ...(coin.diameter && { diameter: coin.diameter }),
      ...(coin.thickness && { thickness: coin.thickness }),
      ...(compositionOf(coin.composition) && {
        composition: compositionOf(coin.composition),
      }),
      ...(coin.edge && { edge: coin.edge }),
      strike: "circulation",
      details: coin.lines.join("\n"),
      link: link(coinsCircular),
    };
  },
);
if (circulationCoins.length !== listed.length)
  throw new Error(`${coinsPage} lists coins Circular 14/2005 doesn't`);

/** "Cu800Zn150Ni50", in thousandths, as "copper 80%; zinc 15%; nickel 5%". */
function compositionOf(text: string | undefined) {
  const symbols: Record<string, string> = {
    Cu: "copper",
    Zn: "zinc",
    Ni: "nickel",
    Sn: "tin",
    Al: "aluminium",
    Fe: "iron",
  };
  const parts = [...(text ?? "").matchAll(/([A-Z][a-z]?)\s*(\d+)/g)];
  if (parts.length < 2) return undefined;
  const named = parts.map(([, symbol = "", thousandths]) => {
    const metal = symbols[symbol];
    return metal && `${metal} ${Number(thousandths) / 10}%`;
  });
  return named.every(Boolean) ? named.join("; ") : undefined;
}

// Circulation banknotes: the page describes them, a circular issued each.
const notesPage = "764-bancnote-in-circulatie";
const notesHtml = await pageOf(notesPage);
const circularTitles = new Map(
  [
    ...notesHtml.matchAll(
      /href="(?:https:\/\/www\.bnr\.ro\/)?(\d+-circulara-[\d-]+)">([^<]+)</g,
    ),
  ].map(([, slug = "", title = ""]) => [slug, clean(title)]),
);
/** The circular that put each note into circulation, as the BNR's page names them. */
const noteCirculars: Record<string, string> = {
  "200 lei": "21274-circulara-23-2006",
  "10 lei 2008": "21172-circulara-37-2008",
  "20 lei": "19274-circulara-28-2021",
};
const circulationBanknotes: Banknote[] = [];
for (const note of parseCirculationBanknotes(notesHtml)) {
  // The redesigned 10 lei of 2008 is the one whose page notes how the 2005 note differs.
  const redesigned =
    note.denomination === "10 lei" &&
    note.facts.some((line) => /emis[ăa] [îi]n 2005/.test(line));
  const circular =
    noteCirculars[redesigned ? "10 lei 2008" : note.denomination] ??
    coinsCircular;
  const circularPage = await pageOf(circular);
  const issueDate = circulationDateOf(circularPage);
  const year = yearOf(issueDate);
  if (!issueDate || !year || !clean(circularPage).includes(note.denomination))
    throw new Error(`${note.denomination}: ${circular} doesn't issue it`);
  const title = circularTitles.get(circular);
  circulationBanknotes.push({
    key: `ro-banknote-${year}-${keyOf(note.denomination)}`,
    title:
      note.denomination === "10 lei"
        ? `${note.denomination} (${year})`
        : note.denomination,
    denomination: note.denomination,
    year,
    issueDate,
    ...(note.width && { width: note.width, height: note.height }),
    details: [
      ...note.facts,
      `Avers: ${note.obverse.join("; ")}.`,
      `Revers: ${note.reverse.join("; ")}.`,
      ...(title ? [title] : []),
    ].join("\n"),
    link: link(notesPage),
  });
}
const value = (denomination: string) =>
  Number(denomination.replace(/\D+$/, "").replace(/\./g, "").trim());
circulationBanknotes.sort(
  (a, b) => value(a.denomination) - value(b.denomination) || a.year - b.year,
);
circulationCoins.sort((a, b) => value(a.denomination) - value(b.denomination));

// The 2000–2003 polymer notes, withdrawn when the leu was redenominated.
const polymerPage = "2275-prima-emisiune-bnr-realizata-din-polimer-2000-2003";
const polymerBanknotes: Banknote[] = [];
for (const slug of linksOf(await pageOf(polymerPage)).filter((each) =>
  each.endsWith("-de-lei"),
)) {
  const page = parseBanknotePage(await pageOf(slug));
  read.detailPages += 1;
  const denomination = denominationIn(page.title);
  const year = Number(
    /anul emisiunii\s*["„“]?(\d{4})/i.exec(page.lines.join(" "))?.[1],
  );
  if (!denomination || !year)
    throw new Error(`${slug}: no nominal value or year`);
  polymerBanknotes.push({
    key: `ro-banknote-2000-${keyOf(denomination)}`,
    title: denomination,
    denomination,
    year,
    ...(page.width && { width: page.width, height: page.height }),
    details: detailsOf(page.lines, slug),
    link: link(slug),
  });
}
polymerBanknotes.sort((a, b) => value(a.denomination) - value(b.denomination));

const header = `// Generated by packages/backend/scripts/fetch-bnr.ts from the National Bank of
// Romania's website, ${site}. Run the script again rather than editing by hand.
`;
const list = (name: string, type: string, items: unknown[]) =>
  `export const ${name}: ${type}[] = ${JSON.stringify(items, null, 2)};\n`;
writeFileSync(
  target,
  `${header}
/** A coin as the BNR describes it; the facts it has no field for stay in its words. */
export type BnrCoin = {
  /** The Catalog id. */
  key: string;
  title: string;
  denomination: string;
  year: number;
  /** YYYY-MM-DD */
  issueDate?: string;
  material?: string;
  metal?: string;
  fineness?: number;
  weight?: number;
  diameter?: number;
  thickness?: number;
  composition?: string;
  edge?: string;
  strike?: string;
  /** The BNR's description, in Romanian. */
  details: string;
  /** The BNR's page the facts come from. */
  link: string;
};

/** A banknote as the BNR describes it. */
export type BnrBanknote = Pick<
  BnrCoin,
  "key" | "title" | "denomination" | "year" | "issueDate" | "details" | "link"
> & { width?: number; height?: number };

/** An issue of several coins, or a mint set. */
export type BnrIssue = {
  key: string;
  title: string;
  year: number;
  issueDate?: string;
  link: string;
  details?: string;
  pieces: BnrCoin[];
};

/** The coins in circulation since the 2005 redenomination: ${link(coinsPage)} */
${list("circulationCoins", "BnrCoin", circulationCoins)}
/** The banknotes in circulation since 2005: ${link(notesPage)} */
${list("circulationBanknotes", "BnrBanknote", circulationBanknotes)}
/** The 2000–2003 polymer banknotes: ${link(polymerPage)} */
${list("polymerBanknotes", "BnrBanknote", polymerBanknotes)}
/** Numismatic banknotes: ${link("1066-bancnote")} */
${list("numismaticBanknotes", "BnrBanknote", numismaticBanknotes)}
/** Mint sets, without their medals: ${link("1069-seturi-de-monetarie")} */
${list("mintSets", "BnrIssue", mintSets)}
`,
);
/** The numismatic coins in a file of their own, as one file would be too large to format. */
const coinsTarget = target.replace(/\.ts$/, "Coins.ts");
writeFileSync(
  coinsTarget,
  `${header}
import type { BnrIssue } from "./romaniaBnr";

/** The numismatic catalogue's coins, without its medals, newest first: ${link("2271-monede-si-medalii")} */
${list("numismaticCoins", "BnrIssue", numismaticCoins)}`,
);
execFileSync("bunx", ["biome", "format", "--write", target, coinsTarget], {
  stdio: "inherit",
});

const pieces = numismaticCoins.reduce(
  (sum, issue) => sum + issue.pieces.length,
  0,
);
console.info(
  `Read ${read.listPages} list pages and ${read.detailPages} detail pages.`,
);
console.info(
  `${numismaticCoins.length} coin issues (${pieces} coins), ${numismaticBanknotes.length} numismatic banknotes, ${mintSets.length} mint sets, ${circulationCoins.length} circulation coins, ${circulationBanknotes.length} circulation banknotes, ${polymerBanknotes.length} polymer banknotes`,
);
for (const line of report) console.info(line);
