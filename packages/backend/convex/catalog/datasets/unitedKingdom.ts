import { formatCsvRecord } from "../csvText";
import { catalogCsvColumns, catalogLimits } from "../fields";
import {
  type ProclaimedPart,
  type UkCoinDesign,
  ukCoinDesigns,
} from "./unitedKingdomCoins";

/**
 * The United Kingdom's circulating coins, as a Catalog CSV file: country,
 * then each decimal denomination from 1 penny to 2 pounds, then its
 * definitive designs (one grouping per proclamation year) and its
 * commemorative designs, then one entry per design.
 *
 * Facts: the royal proclamations under the Coinage Act 1971 in The Gazette
 * (unitedKingdomCoins.ts, rebuilt by scripts/fetch-uk-coins.ts), each
 * giving its coins' metal, standard weight, diameter, composition, shape,
 * edge and design in words. Every coin made in base metal is included, as
 * the coin made to circulate; the proclamations don't say whether the Royal
 * Mint then released a design into circulation or only in collectors' packs,
 * nor how many it struck. Gold, silver and platinum coins and the five-pound
 * crowns and up are left out.
 *
 * An entry's year is the year its proclamation came into force, which can
 * be a year before the date on the coin (a proclamation of late 2017 for
 * coins dated 2018); the obverse in its details gives the date where the
 * proclamation fixes it. Its issue date is the day the proclamation was
 * given.
 *
 * Not yet: coins proclaimed before 1998, when The Gazette began publishing
 * notices as data; their proclamations are only scanned pages.
 *
 * No images: the designs of UK coins are Crown copyright and the Royal Mint
 * doesn't license them, and the Open Government Licence excludes design
 * rights (docs/research/catalog-expansion.md §3.9).
 */

const root = "gb";
const proclamations =
  "https://www.thegazette.co.uk/all-notices/notice?noticetypes=1101&text=coins&edition=London";

const gazette = (link: string) => ({
  source: "The Gazette (royal proclamation)",
  author: "The Crown",
  licence:
    "Contains public sector information licensed under the Open Government Licence v3.0.",
  link,
});
type Provenance = ReturnType<typeof gazette>;
const credit = (group: "facts" | "notes", from: Provenance) => ({
  [`${group}_source`]: from.source,
  [`${group}_author`]: from.author,
  [`${group}_licence`]: from.licence,
  [`${group}_link`]: from.link,
});
/** Facts and notes alike come from the proclamation. */
const proclaimedIn = (link: string) => ({
  ...credit("facts", gazette(link)),
  ...credit("notes", gazette(link)),
});

type Row = Record<string, string>;

const denominations: UkCoinDesign["denomination"][] = [
  "1 penny",
  "2 pence",
  "5 pence",
  "10 pence",
  "20 pence",
  "50 pence",
  "1 pound",
  "2 pounds",
];

/** The proclamations' metals, as Catalog materials. */
const materials: Record<string, string> = {
  bronze: "bronze",
  "cupro-nickel": "cupronickel",
  "nickel-brass": "nickelBrass",
  "cupro-nickel and nickel-brass": "bimetallic",
  "mild steel coated with copper": "steel",
  "mild steel coated with nickel": "steel",
  "nickel plated mild steel": "steel",
};

/** Metals the Catalog's compositions know; a plated steel coin's composition goes in its details instead. */
const alloyMetals = new Set(["copper", "nickel", "zinc", "tin", "aluminium"]);

const partsText = (parts: ProclaimedPart[], separator = ", ") =>
  parts.map(({ metal, percent }) => `${metal} ${percent}%`).join(separator);

function metalOf(design: UkCoinDesign) {
  if (design.sections)
    return `${design.metal}; inner section ${partsText(design.sections.inner)}; outer section ${partsText(design.sections.outer)}`;
  if (design.composition && !compositionOf(design))
    return `${design.metal}; ${partsText(design.composition)}`;
  return design.metal;
}

/** The composition in the Catalog's words, where every metal is one it knows. */
function compositionOf(design: UkCoinDesign) {
  const parts = design.composition;
  if (!parts?.every(({ metal }) => alloyMetals.has(metal))) return undefined;
  return partsText(parts, "; ");
}

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

function detailsOf(design: UkCoinDesign) {
  return [
    design.obverse && `Obverse: ${sentence(design.obverse)}`,
    `Reverse: ${sentence(design.reverse)}`,
    `Metal: ${sentence(metalOf(design))}`,
    design.shape && `Shape: ${sentence(design.shape)}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * What a design shows, from the start of its reverse: "a portrait of
 * Benjamin Bunny with the inscription …" reads "Benjamin Bunny".
 */
function subjectOf(reverse: string) {
  const inscription = /“([^”]+)”/.exec(reverse)?.[1];
  const denomination = /^(?:\d+|[A-Z]+) (?:PENCE|PENNY|POUNDS?)$/;
  if (
    inscription &&
    /^the inscriptions? “/i.test(reverse) &&
    !denomination.test(inscription)
  )
    return `“${inscription}”`;
  const head = reverse
    .replace(
      /^(?:an?|the)\s+(?:(?:stylis|styliz)ed\s+)?(?:design|depiction|representation|portrait|image|interpretation|view)\s+(?:which (?:depicts|features|shows)|depicting|showing|featuring|representing|that shows|of)\s+/i,
      "",
    )
    .replace(/^an?\s+/i, "")
    .split(
      /;|\s(?:with|accompanied|surrounded|encircled|set against|together with|beneath|above|below|in the midst)\b/i,
    )[0] as string;
  // A list stays whole, "a lion, unicorn, stag and a dragon"; otherwise the
  // subject ends at the first comma.
  const [first = "", ...rest] = head.split(/,\s*/);
  const words = (text: string) => text.split(" ").length;
  const list =
    rest.length > 0 &&
    words(first) <= 3 &&
    / and /.test(rest.join(", ")) &&
    rest.slice(0, -1).every((part) => words(part) <= 3);
  const subject = (list ? head : first)
    .replace(/[\s,]+$/, "")
    .replace(/\s+(?:and|or)$/i, "")
    .trim();
  // "a design with the inscription “BENJAMIN BRITTEN” …" shows its inscription.
  if (/^design$/i.test(subject) && inscription) return `“${inscription}”`;
  let title = "";
  for (const word of subject.split(" ")) {
    const next = title ? `${title} ${word}` : word;
    if (next.length > 80) {
      title = `${title}…`;
      break;
    }
    title = next;
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

const slug = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const keys = new Set<string>([root]);
/** A key within the limit, made unique with a number where two designs read alike. */
function uniqueKey(prefix: string, words: string) {
  const room = catalogLimits.key - prefix.length - 3;
  let tail = "";
  for (const word of slug(words).split("-")) {
    const next = tail ? `${tail}-${word}` : word;
    if (next.length > room) break;
    tail = next;
  }
  const base = tail ? `${prefix}${tail}` : prefix.replace(/-$/, "");
  let key = base;
  for (let n = 2; keys.has(key); n += 1) key = `${base}-${n}`;
  keys.add(key);
  return key;
}

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const shared = (denomination: string) => ({
  item_type: "coin",
  country: "GB",
  denomination,
});

/**
 * What tells a design from the others of its proclamation that read alike:
 * the first part of its reverse that differs, "with the badge of Edinburgh
 * being the principal focus" reading "badge of Edinburgh".
 */
function differenceOf(design: UkCoinDesign, alike: UkCoinDesign[]) {
  const parts = (reverse: string) => reverse.split(/,\s*/);
  const index = parts(design.reverse).findIndex((part, at) =>
    alike.some(
      (other) => other !== design && parts(other.reverse)[at] !== part,
    ),
  );
  return parts(design.reverse)
    [index]?.replace(/^with\s+(?:the|an?)\s+/i, "")
    .replace(/\s+being the princip(?:al|le) focus\b/i, "")
    .trim();
}

function titlesOf(designs: UkCoinDesign[]) {
  const plain = designs.map(
    (design) =>
      `${design.denomination} ${design.year} – ${subjectOf(design.reverse)}`,
  );
  return designs.map((design, index) => {
    const title = plain[index] as string;
    const alike = designs.filter((_, other) => plain[other] === title);
    if (alike.length === 1) return title;
    // Designs of one proclamation that read alike are told apart by what
    // differs; the same design proclaimed again, by the day it was.
    const own = alike.filter((other) => other.notice === design.notice);
    const difference = own.length > 1 && differenceOf(design, own);
    if (difference) return `${title}: ${difference}`;
    return design.given
      ? `${title} (proclaimed ${longDate(design.given)})`
      : title;
  });
}

function entries(
  designs: UkCoinDesign[],
  parent: string,
  series: string,
): Row[] {
  const titles = titlesOf(designs);
  return designs.map((design, index) => {
    const material = materials[design.metal];
    const composition = compositionOf(design);
    const edge = design.edge;
    return {
      id: uniqueKey(
        `${root}-${slug(design.denomination)}-${design.year}-`,
        subjectOf(design.reverse),
      ),
      parent_id: parent,
      title: titles[index] as string,
      ...shared(design.denomination),
      series,
      strike: "circulation",
      year_from: String(design.year),
      is_addable: "true",
      sort_order: String(index + 1),
      ...(material && { material }),
      ...(composition && { composition }),
      ...(design.weight && { weight_g: String(design.weight) }),
      ...(design.diameter && { diameter_mm: String(design.diameter) }),
      ...(edge && { edge: edge.edge }),
      ...(edge?.edge === "lettered" && { edge_lettering: edge.lettering }),
      issue_date: design.given ?? design.inForce,
      technical_details: detailsOf(design),
      ...(design.purpose && {
        historical_notes: `Made ${sentence(design.purpose)}`,
      }),
      ...proclaimedIn(design.link),
    };
  });
}

function denominationRows(
  denomination: UkCoinDesign["denomination"],
  sortOrder: number,
): Row[] {
  const designs = ukCoinDesigns.filter(
    (design) => design.denomination === denomination,
  );
  const key = `${root}-${slug(denomination)}`;
  const years = designs.map((design) => design.year);
  const groups = new Map<string, { title: string; designs: UkCoinDesign[] }>();
  for (const design of designs) {
    const from = design.inForce.slice(0, 4);
    const [id, title] =
      design.series === "definitive"
        ? [`${key}-definitive-${from}`, `Definitive designs from ${from}`]
        : [`${key}-commemorative`, "Commemorative designs"];
    const group = groups.get(id) ?? { title, designs: [] };
    group.designs.push(design);
    groups.set(id, group);
  }
  // The definitive designs by year, then the commemoratives.
  const ordered = [...groups].sort(
    ([a], [b]) =>
      Number(a.endsWith("commemorative")) -
        Number(b.endsWith("commemorative")) || a.localeCompare(b),
  );
  return [
    {
      id: key,
      parent_id: root,
      title: `${denomination} coins`,
      sort_order: String(sortOrder),
      is_addable: "false",
      ...shared(denomination),
      year_from: String(Math.min(...years)),
      ...proclaimedIn(designs[0]?.link ?? proclamations),
    },
    ...ordered.flatMap(([id, group], index) => {
      keys.add(id);
      return [
        {
          id,
          parent_id: key,
          title: group.title,
          series: group.title,
          sort_order: String(index + 1),
          is_addable: "false",
          ...shared(denomination),
          year_from: String(
            Math.min(...group.designs.map((design) => design.year)),
          ),
          ...proclaimedIn(group.designs[0]?.link ?? proclamations),
        },
        ...entries(group.designs, id, group.title),
      ];
    }),
  ];
}

const rows: Row[] = [
  {
    id: root,
    title: "United Kingdom",
    country: "GB",
    // After the United States, the euro, Norway and Romania.
    sort_order: "4",
    ...proclaimedIn(proclamations),
  },
  ...denominations.flatMap((denomination, index) =>
    denominationRows(denomination, index + 1),
  ),
];

export const unitedKingdom = [
  formatCsvRecord(catalogCsvColumns),
  ...rows.map((row) =>
    formatCsvRecord(catalogCsvColumns.map((column) => row[column] ?? "")),
  ),
].join("");
