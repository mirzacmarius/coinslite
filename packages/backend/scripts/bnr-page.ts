/**
 * Reading the National Bank of Romania's pages into Catalog facts. Pure: the
 * pages come in as HTML, as POST https://www.bnr.ro/blocks returns them.
 */

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  bdquo: "„",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  permil: "‰",
  deg: "°",
  times: "×",
  plusmn: "±",
};

/** A fragment's text, with tags dropped, entities decoded and spaces collapsed. */
export function clean(fragment: string) {
  return fragment
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match)
    .replace(/[   ]/g, " ")
    .replace(/​/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A paragraph-by-paragraph text: one line per paragraph, list item or line break. */
export function paragraphs(fragment: string) {
  return fragment
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .split(/<br\s*\/?>|<\/(?:p|div|li|h\d|tr)>/)
    .map(clean)
    .filter(Boolean);
}

/** "24.08.2026" as 2026-08-24. */
export function dateOf(text: string) {
  const match = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text);
  if (!match) return undefined;
  const [, day = "", month = "", year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** A page's heading. */
export const titleOf = (html: string) =>
  clean(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "");

/** One piece of a coin issue: the BNR's lines of facts and its descriptions of both sides. */
export type CoinPiece = {
  /** The metal heading the piece: "Argint". */
  heading: string;
  /** "Valoare nominală: 10 lei;" and so on, as the BNR writes them. */
  lines: string[];
  obverse?: string;
  reverse?: string;
};

export type CoinIssue = {
  title: string;
  /** YYYY-MM-DD */
  date?: string;
  pieces: CoinPiece[];
};

/**
 * A page of the numismatic catalogue (monede și medalii): the issue's title
 * and date, and each piece, headed by its metal, with its facts and its sides.
 */
export function parseCoinIssue(html: string): CoinIssue {
  const start = html.indexOf("<!--start-->");
  const body = html.slice(
    start >= 0 ? start : 0,
    html.includes("<!--stop-->") ? html.indexOf("<!--stop-->") : undefined,
  );
  const before = start >= 0 ? html.slice(0, start) : html;
  const pieces: CoinPiece[] = [];
  const parts = body.split(/<p>\s*<strong>/).slice(1);
  for (const part of parts) {
    const end = part.indexOf("</strong>");
    const heading = clean(part.slice(0, end));
    const rest = part.slice(end);
    const side = (label: string) => {
      const match = new RegExp(
        `<strong>\\s*${label}\\s*:?\\s*</strong>([\\s\\S]*?)</div>`,
      ).exec(rest);
      return match ? clean(`${label}: ${match[1]?.replace(/^\s*:/, "")}`) : "";
    };
    const factsEnd = rest.search(/<strong>\s*(Avers|Revers)/);
    const lines = paragraphs(
      rest.slice("</strong>".length, factsEnd >= 0 ? factsEnd : undefined),
    ).filter((line) => /^[^:]{2,40}:/.test(line));
    pieces.push({
      heading,
      lines,
      ...(side("Avers") && { obverse: side("Avers") }),
      ...(side("Revers") && { reverse: side("Revers") }),
    });
  }
  return {
    title: titleOf(html),
    ...(dateOf(
      /Data emisiunii:?\s*([\d.]+)/.exec(clean(before))?.[0] ?? "",
    ) && {
      date: dateOf(
        /Data emisiunii:?\s*([\d.]+)/.exec(clean(before))?.[0] ?? "",
      ),
    }),
    pieces,
  };
}

/** A label's value on a piece, without its closing punctuation. */
export function labelledValue(piece: CoinPiece, label: string) {
  const line = piece.lines.find((each) =>
    each.toLowerCase().startsWith(`${label.toLowerCase()}:`),
  );
  return line
    ?.slice(line.indexOf(":") + 1)
    .trim()
    .replace(/[;.,]+$/, "")
    .trim();
}

/** A value the BNR's page failed to fill in, such as "[##1106##]". */
export const isBroken = (value: string) => /##|\[|\]/.test(value);

/**
 * A value and its unit as the Catalog writes them: thousands with points, and
 * one leu or ban in the singular ("5000", "LEI" as "5.000 lei"; "1 LEI" as "1 leu").
 */
export function formatDenomination(value: string, unit: string) {
  const digits = value.replace(/\./g, "");
  const singular = { lei: "leu", leu: "leu", bani: "ban", ban: "ban" };
  const plural = { lei: "lei", leu: "lei", bani: "bani", ban: "bani" };
  const name = unit.toLowerCase() as keyof typeof singular;
  return `${digits.replace(/\B(?=(\d{3})+$)/g, ".")} ${(digits === "1" ? singular : plural)[name]}`;
}

/** "10 LEI" as "10 lei", "1 BAN" as "1 ban"; a broken value as nothing. */
export function denominationOf(value: string | undefined) {
  if (!value || isBroken(value)) return undefined;
  const match = /^(\d[\d.]*)\s*(?:de\s+)?(lei|leu|bani|ban)$/i.exec(
    value.trim(),
  );
  return match ? formatDenomination(match[1] ?? "", match[2] ?? "") : undefined;
}

type Material =
  | "gold"
  | "silver"
  | "platinum"
  | "palladium"
  | "copper"
  | "bronze"
  | "brass"
  | "cupronickel"
  | "nickelBrass"
  | "nickel"
  | "steel"
  | "aluminium"
  | "aluminiumBronze"
  | "zinc"
  | "bimetallic"
  | "other";

/** The metals the BNR names, as Catalog materials, with the precious ones' Spot metal. */
const metals: Array<{
  pattern: RegExp;
  material: Material;
  metal?: "gold" | "silver" | "platinum" | "palladium";
}> = [
  { pattern: /^aur\b/i, material: "gold", metal: "gold" },
  { pattern: /^argint\b/i, material: "silver", metal: "silver" },
  { pattern: /^platin/i, material: "platinum", metal: "platinum" },
  { pattern: /^paladiu/i, material: "palladium", metal: "palladium" },
  { pattern: /^o[țţt]el\b/i, material: "steel" },
  { pattern: /^cupronichel/i, material: "cupronickel" },
  { pattern: /^alam[ăa]/i, material: "brass" },
  { pattern: /^tombac/i, material: "brass" },
  { pattern: /^alpaca/i, material: "nickelBrass" },
  { pattern: /^bronz\s*(cu\s*)?alumin/i, material: "aluminiumBronze" },
  { pattern: /^bronz/i, material: "bronze" },
  { pattern: /^cupru\b/i, material: "copper" },
  { pattern: /^(aliaj de )?aluminiu\b/i, material: "aluminium" },
  { pattern: /^nichel\b/i, material: "nickel" },
  { pattern: /^metal comun\b/i, material: "other" },
];

/** "Argint 999/1000" as silver, 0.999 fine; "Oţel placat cu nichel -/1000" as steel. */
export function metalOf(value: string | undefined): {
  material?: Material;
  metal?: "gold" | "silver" | "platinum" | "palladium";
  fineness?: number;
} {
  if (!value || isBroken(value)) return {};
  const known = metals.find(({ pattern }) => pattern.test(value.trim()));
  if (!known) return {};
  const fineness = /(\d{3,4})\s*\/\s*1000/.exec(value)?.[1];
  // A fineness only belongs to a piece of one precious metal.
  const single = !/(^|\s)(și|şi)\s|cu inser|placat|bimetal/i.test(value);
  return {
    material: known.material,
    ...(known.metal && single && { metal: known.metal }),
    ...(known.metal &&
      single &&
      fineness &&
      Number(fineness) <= 1000 && { fineness: Number(fineness) / 1000 }),
  };
}

/** A decimal written with a point or a comma: "31.103 grame" as 31.103. */
const numberOf = (text: string | undefined) => {
  const match = /(\d+(?:[.,]\d+)?)/.exec(text ?? "");
  return match ? Number(match[1]?.replace(",", ".")) : undefined;
};

/** No BNR coin weighs a kilogram: a heavier weight has lost its decimal point ("31103 grame"). */
const heaviestCoin = 1000;

/** "31.103 grame" or "1,5 g" as grams. */
export function weightOf(value: string | undefined) {
  if (!value || isBroken(value) || !/\bg(rame?)?\b|\bg$/i.test(value))
    return undefined;
  const weight = numberOf(value);
  return weight && weight > 0 && weight < heaviestCoin ? weight : undefined;
}

/** "rotundă - diametru 37 mm" as 37; other shapes have no diameter. */
export function diameterOf(value: string | undefined) {
  if (!value || isBroken(value)) return undefined;
  const match = /diametru(?:l)?\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*mm/i.exec(
    value,
  );
  return match ? Number(match[1]?.replace(",", ".")) : undefined;
}

/** How the BNR words an edge, as the Catalog's edges. */
export function edgeOf(value: string | undefined) {
  if (!value || isBroken(value)) return undefined;
  const text = value.toLowerCase();
  if (/inscrip/.test(text)) return "lettered" as const;
  if (/(sector|grup|alternând|discontinu|întrerup)/.test(text))
    return "interruptedReeding" as const;
  if (/^(zim[țţt]at|zim[țţt]uit)/.test(text)) return "reeded" as const;
  if (/^neted|^neted[ăa]$/.test(text)) return "plain" as const;
  return undefined;
}

/** "proof" or "BU"; anything else, such as proof-like, isn't a Catalog strike. */
export function strikeOf(value: string | undefined) {
  const text = value?.trim().toLowerCase();
  if (text === "proof") return "proof" as const;
  if (text === "bu") return "bu" as const;
  return undefined;
}

/** Where a page's description stops: its list of security features, or its warning about copies. */
const securityHeading =
  /^(principalele\s+)?elemente(le)?\s+de\s+siguran[țţt][ăa]|^grafica acestei bancnote|^punerea [îi]n circula[țţ]ie a efectelor numismatice/i;

/**
 * A banknote's page, numismatic or withdrawn: its title, date, size, and its
 * description paragraph by paragraph, up to its security features.
 */
export function parseBanknotePage(html: string) {
  const heading = html.search(/<\/h1>/);
  const lines: string[] = [];
  for (const line of paragraphs(html.slice(heading >= 0 ? heading : 0))) {
    if (
      securityHeading.test(line) ||
      /elemente(le)?\s+de\s+siguran[țţt][ăa].*:$/i.test(line)
    )
      break;
    if (line !== "Caracteristici") lines.push(line);
  }
  const text = lines.join("\n");
  const size = /Dimensiuni\s*:?\s*(\d+)\s*[x×]\s*(\d+)\s*mm/i.exec(text);
  const date = dateOf(
    /Data (?:emisiunii|lansării)\s*:?\s*[\d.]+/.exec(text)?.[0] ?? "",
  );
  return {
    title: titleOf(html),
    ...(date && { date }),
    ...(size && { width: Number(size[1]), height: Number(size[2]) }),
    lines: lines.filter((line) => !/^Data (emisiunii|lansării)\s*:/.test(line)),
  };
}

const months = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
];

/** The day a circular puts its notes and coins into circulation: "începând cu data de 1 iulie 2005" as 2005-07-01. */
export function circulationDateOf(html: string) {
  const match = new RegExp(
    `[îi]ncep[âa]nd cu data de (\\d{1,2}) (${months.join("|")}) (\\d{4})`,
    "i",
  ).exec(clean(html));
  if (!match) return undefined;
  const [, day = "", month = "", year] = match;
  const mm = String(months.indexOf(month.toLowerCase()) + 1).padStart(2, "0");
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

/** The coins Circular 14/2005 issues, each article as it sets one out: "Moneda metalică cu valoarea nominală de 1 ban". */
export function parseCircularCoins(html: string) {
  const coins: Array<{ denomination: string; lines: string[] }> = [];
  let current: { denomination: string; lines: string[] } | undefined;
  for (const line of paragraphs(html)) {
    const start =
      /Moneda metalic[ăa] cu valoarea nominal[ăa] de (\d+) (bani|ban)\b/i.exec(
        line,
      );
    if (start) {
      current = { denomination: `${start[1]} ${start[2]}`, lines: [] };
      coins.push(current);
    } else if (/^Art\. \d+/.test(line)) {
      current = undefined;
    } else if (current) {
      current.lines.push(line.replace(/^-\s*/, ""));
    }
  }
  return coins.map(({ denomination, lines }) => {
    const value = (label: RegExp) => {
      const line = lines.find((each) => label.test(each));
      return line
        ?.slice(line.indexOf(":") + 1)
        .trim()
        .replace(/[;.]+$/, "");
    };
    return {
      denomination,
      lines,
      composition: value(/^compozi[țţ]ia:/i),
      weight: weightOf(value(/^greutatea:/i)),
      diameter: numberOf(value(/^diametrul:/i)),
      thickness: numberOf(value(/^grosimea la chenar:/i)),
      edge: edgeOf(value(/^cant:/i)),
    };
  });
}

/** The coins in circulation, as the BNR's page lists them: value, then its lines. */
export function parseCirculationCoins(html: string) {
  return html
    .split(/<div class="monede/)
    .slice(1)
    .map((section) => ({
      denomination: clean(
        /<div class="value">([\s\S]*?)<\/div>/.exec(section)?.[1] ?? "",
      ),
      lines: paragraphs(
        /fs-24 mb-50">([\s\S]*?)<\/div>/.exec(section)?.[1] ?? "",
      ),
    }));
}

/**
 * The banknotes in circulation, as the BNR's page describes them: value,
 * size, colour and printing, and what each side shows.
 */
export function parseCirculationBanknotes(html: string) {
  return html
    .split(/<div class="bancnote/)
    .slice(1)
    .map((section) => {
      const end = section.indexOf('id="elemente"');
      const description = section.slice(0, end >= 0 ? end : undefined);
      const facts = paragraphs(
        /fs-24 mb-50">([\s\S]*?)<\/div>\s*<\/div>/.exec(description)?.[1] ?? "",
      );
      const side = (name: string) => {
        const start = description.indexOf(`<p class="fs-30">${name}</p>`);
        if (start < 0) return [];
        const stop = description.indexOf('<div class="row mb-50">', start);
        return [
          ...description
            .slice(start, stop >= 0 ? stop : undefined)
            .matchAll(/mb-md-20">([\s\S]*?)<\/div>/g),
        ]
          .map(([, item]) => clean(item ?? ""))
          .filter(Boolean);
      };
      const size = /Dimensiuni\s*:?\s*(\d+)\s*[x×]\s*(\d+)\s*mm/i.exec(
        facts.join(" "),
      );
      return {
        denomination: clean(
          /<div class="value">([\s\S]*?)<\/div>/.exec(description)?.[1] ?? "",
        ),
        facts,
        obverse: side("Avers"),
        reverse: side("Revers"),
        ...(size && { width: Number(size[1]), height: Number(size[2]) }),
      };
    });
}

/**
 * A piece's nominal value. Some pages give only the number ("Valoare
 * nominală: 10"); the unit is then the one the obverse's inscription gives
 * that number ("valoarea nominală „10 LEI”"), and otherwise there is none.
 */
export function nominalValueOf(piece: CoinPiece) {
  const value = labelledValue(piece, "Valoare nominală");
  if (!value || !/^\d[\d.]*$/.test(value)) return value;
  const inscription = new RegExp(
    `[„"]${value.replace(/\./g, "\\.")}\\s+(LEI|LEU|BANI|BAN)\\b`,
    "i",
  ).exec(`${piece.obverse ?? ""} ${piece.reverse ?? ""}`);
  return inscription ? `${value} ${inscription[1]}` : value;
}

/** A coin's facts in the Catalog's terms, leaving out what is broken or unclear. */
export function coinFacts(piece: CoinPiece) {
  const denomination = denominationOf(nominalValueOf(piece));
  const weight = weightOf(labelledValue(piece, "Greutate"));
  const diameter = diameterOf(labelledValue(piece, "Dimensiune"));
  const edge = edgeOf(labelledValue(piece, "Margine"));
  const strike = strikeOf(labelledValue(piece, "Calitate"));
  return {
    ...(denomination && { denomination }),
    ...metalOf(labelledValue(piece, "Metal")),
    ...(weight !== undefined && { weight }),
    ...(diameter !== undefined && { diameter }),
    ...(edge && { edge }),
    ...(strike && { strike }),
  };
}
