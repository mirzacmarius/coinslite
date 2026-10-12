/**
 * Reads one of the US Mint's coin pages, as saved from usmint.gov or a
 * Wayback Machine copy of it, into the facts the Catalog keeps: the design
 * described, the release date where the page states it, the mints and the
 * artists. Pure, so scripts/fetch-us-coin-programmes.ts can be checked
 * against saved pages. Reads both the Mint's current page layout and the
 * one it used until 2024.
 */

export type CoinPage = {
  /** The page's heading: "Delaware State Quarter". */
  title: string;
  /** The year of issue. */
  year: number;
  /** The obverse and reverse described, in the Mint's words. */
  design: string;
  /** YYYY-MM-DD, where the page says when the Mint released the coin. */
  releaseDate?: string;
  /** The mints the page lists, as it names them: "Denver", "Philadelphia". */
  mints: string[];
  /** The page's artist credits, each with the role it gives. */
  artists: Array<{ name: string; role: string }>;
  /** What the edge says, where the page lists it. */
  edgeInscriptions: string[];
};

type Block = { kind: string; text: string };

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  reg: "®",
  trade: "™",
};

/** A tag, whose quoted attribute values may hold ">" (the current layout's data layer does). */
const tag = `<(?:"[^"]*"|'[^']*'|[^'">])*>`;

function clean(fragment: string) {
  return fragment
    .replace(new RegExp(tag, "g"), " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match)
    .replace(/[ ​]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .trim();
}

/**
 * The page's content in order: headings, paragraphs, list items, the
 * current layout's artist cards and the former layout's side labels.
 */
function blocks(html: string): Block[] {
  const start = html.search(/<h1[\s>]/);
  const ends = [
    html.indexOf("Back to top", start),
    html.indexOf("</article>", start),
  ].filter((end) => end > start);
  const main = html
    .slice(
      Math.max(0, start),
      ends.length > 0 ? Math.min(...ends) : html.length,
    )
    // An artist card is a list item; read its name and role, not the item.
    .replace(/<li class="cmp-image-grid__item\b[^"]*"[^>]*>/g, "<div>");
  const open = (name: string) => `<${name}(?:\\s(?:"[^"]*"|'[^']*'|[^'">])*)?>`;
  const pattern = new RegExp(
    [
      `${open("(h[1-6]|p|li|th|td)")}([\\s\\S]*?)<\\/\\1>`,
      `<div class="cmp-image-grid__item-(name|job-title|location)">([\\s\\S]*?)<\\/div>`,
      "<strong>\\s*(Obverse|Reverse)\\s*<\\/strong>",
    ].join("|"),
    "g",
  );
  const found: Block[] = [];
  for (const match of main.matchAll(pattern)) {
    if (match[1]) found.push({ kind: match[1], text: clean(match[2] ?? "") });
    else if (match[3])
      found.push({ kind: `artist-${match[3]}`, text: clean(match[4] ?? "") });
    else found.push({ kind: "side", text: match[5] as string });
  }
  return found.filter((block) => block.text !== "");
}

const isHeading = (block: Block) => /^h[1-6]$/.test(block.kind);

/** The blocks after the heading with this text, up to the next heading of its level or above. */
function section(all: Block[], heading: string) {
  const at = all.findIndex(
    (block) => isHeading(block) && block.text === heading,
  );
  if (at < 0) return [];
  const level = Number((all[at] as Block).kind.slice(1));
  const rest = all.slice(at + 1);
  const end = rest.findIndex(
    (block) =>
      isHeading(block) &&
      (Number(block.kind.slice(1)) <= level || block.kind === "h3"),
  );
  return end < 0 ? rest : rest.slice(0, end);
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
const datePattern = new RegExp(
  `\\b(${months.join("|")})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`,
);

/** The date in a sentence that says the coin was released, if one does. */
function releaseDateOf(paragraphs: string[], year: number) {
  for (const paragraph of paragraphs) {
    for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
      if (!/\breleas/i.test(sentence)) continue;
      const match = datePattern.exec(sentence);
      if (!match) continue;
      const [, month, day, dateYear] = match;
      // A coin is released in its year of issue, or late in the year before.
      if (Number(dateYear) !== year && Number(dateYear) !== year - 1) continue;
      const monthNumber = months.indexOf(month as string) + 1;
      return `${dateYear}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return undefined;
}

/** "Sculptor: Craig Campbell, Medallic Artist" under Reverse: Craig Campbell, Reverse Sculptor. */
function formerArtist(side: string, text: string) {
  const labelled =
    /^(Designer|Sculptor|Designer and Sculptor|Sculptor and Designer):\s*(.*)$/i.exec(
      text,
    );
  const name = (labelled ? (labelled[2] as string) : text)
    .split(",")[0]
    ?.replace(/\s*\(\d{4}\s*[-–]\s*\d{4}\)\s*$/, "")
    .trim() as string;
  return { name, role: labelled ? `${side} ${labelled[1]}` : side };
}

export function parseCoinPage(html: string): CoinPage {
  const all = blocks(html);
  const title = all.find((block) => block.kind === "h1")?.text;
  if (!title) throw new Error("No page heading");

  const yearHeading = all.findIndex(
    (block) => block.kind === "h5" && block.text === "Year of Issue",
  );
  const paragraphs = (heading: string) =>
    section(all, heading)
      .filter((block) => block.kind === "p")
      .map((block) => block.text);

  // Some pages leave out the year of issue but open their background with
  // it: "The 2014 Arches National Park Quarter is the 23rd coin…".
  const yearText =
    yearHeading >= 0
      ? all[yearHeading + 1]?.text
      : (all
          .find((block) => /^Year of Issue:/.test(block.text))
          ?.text.replace(/^Year of Issue:\s*/, "") ??
        /^The (\d{4}) /.exec(paragraphs("Background")[0] ?? "")?.[1]);
  const year = Number(yearText);
  if (!/^\d{4}$/.test(yearText ?? ""))
    throw new Error(`${title}: no year of issue`);
  const items = (heading: string) =>
    section(all, heading)
      .filter((block) => block.kind === "li")
      .map((block) => block.text);

  const artists: CoinPage["artists"] = [];
  const credits = section(all, "Artist Credits");
  for (const [index, block] of credits.entries()) {
    if (block.kind !== "artist-name") continue;
    const role = credits
      .slice(index + 1)
      .find(
        (next) =>
          next.kind === "artist-location" || next.kind === "artist-name",
      );
    artists.push({
      name: block.text,
      role: role?.kind === "artist-location" ? role.text : "",
    });
  }
  let side = "";
  for (const block of section(all, "Artist Information")) {
    if (block.kind === "side") side = block.text;
    else if (block.kind === "li" && side)
      artists.push(formerArtist(side, block.text));
  }

  return {
    title,
    year,
    design: paragraphs("Characteristics").join(" "),
    releaseDate: releaseDateOf(
      all.filter((block) => block.kind === "p").map((block) => block.text),
      year,
    ),
    mints: items("Mint and Mint Mark"),
    artists,
    edgeInscriptions: items("Edge Inscriptions"),
  };
}
