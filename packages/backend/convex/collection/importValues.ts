import {
  type HomeCurrency,
  type Locale,
  countryCodes,
  formatCountry,
  locales,
  parseMoney,
} from "@coinslite/i18n";
import {
  type GradingScale,
  type ItemType,
  type Strike,
  defaultScale,
  gradingScaleIds,
  gradingScales,
  isGrade,
  scalesFor,
} from "../items/grades";
import { type Material, materials } from "../items/rules";
import { exportLabels } from "./exportLabels";

/**
 * Reading the cells of a file being imported (importRows.ts): names of Item
 * types, Grading scales, Strikes, materials and countries in any of the five
 * languages, and amounts, dates, years and Grades as the Collection export
 * writes them or as other apps and spreadsheets do. Pure.
 */

/** Lower case without accents or extra spaces, so headings and names match loosely. */
export const folded = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Looks a folded text up among every language's words for the same things,
 * the raw keys, and further names other apps use (`more`).
 */
export function lookup<K extends string>(
  words: (locale: Locale) => Record<K, string>,
  raw: readonly K[],
  more: Partial<Record<K, readonly string[]>> = {},
) {
  const found = new Map<string, K>();
  for (const key of raw) found.set(folded(key), key);
  for (const [key, names] of Object.entries(more) as [K, string[]][])
    for (const name of names) found.set(folded(name), key);
  for (const locale of locales)
    for (const [key, word] of Object.entries(words(locale)) as [K, string][])
      found.set(folded(word), key);
  return (text: string) => found.get(folded(text));
}

export const typeOf = lookup<ItemType>(
  (locale) => exportLabels[locale].types,
  ["coin", "banknote", "stamp"],
  {
    coin: ["coins", "münzen", "pièces", "mynter", "monede"],
    banknote: [
      "banknotes",
      "bank note",
      "note",
      "paper money",
      "bill",
      "billets",
      "sedler",
      "geldschein",
      "bancnote",
    ],
    stamp: ["stamps", "briefmarken", "timbres", "frimerker", "timbre"],
  },
);
export const scaleOf = lookup<GradingScale>(
  (locale) => exportLabels[locale].scales,
  gradingScaleIds,
);
export const strikeOf = lookup<Strike>(
  (locale) => exportLabels[locale].strikes,
  ["circulation", "bu", "proof"],
  {
    circulation: ["business strike", "circulated", "regular", "normal"],
    bu: ["brilliant uncirculated", "stempelglanz", "stgl"],
    proof: ["pf", "pr", "pp", "polierte platte", "be", "belle epreuve"],
  },
);
export const materialOf = lookup<Material>(
  (locale) => exportLabels[locale].materials,
  materials,
  {
    gold: ["au"],
    silver: ["ag"],
    platinum: ["pt"],
    palladium: ["pd"],
    copper: ["cu"],
    cupronickel: [
      "copper-nickel",
      "copper nickel",
      "cupro-nickel",
      "cuni",
      "cu-ni",
    ],
    nickelBrass: ["nickel brass"],
    nickel: ["ni"],
    iron: ["fe"],
    aluminium: ["aluminum", "al"],
    aluminiumBronze: ["aluminum-bronze", "aluminum bronze", "aluminium bronze"],
    zinc: ["zn"],
    tin: ["sn"],
    bimetallic: ["bi-metallic", "bimetal"],
  },
);
const stampGradeOf = lookup<string>(
  (locale) => exportLabels[locale].stampGrades,
  gradingScales.stamp.grades,
  { mnh: ["**", "postfrisch"], mh: ["*", "ungebraucht"], used: ["o"] },
);

let countryNames: Map<string, string> | undefined;
/** A country's code from its code or its name in any of the five languages. */
export function countryOf(text: string) {
  if (!countryNames) {
    countryNames = new Map();
    for (const code of countryCodes) {
      countryNames.set(folded(code), code);
      for (const locale of locales)
        countryNames.set(folded(formatCountry(code, locale)), code);
    }
  }
  return countryNames.get(folded(text));
}

/**
 * A material as written: one of CoinsLite's, with what follows it as the
 * note ("Silver · 0.800 fine", "Silver (.925)"), or only a note when the
 * material isn't one it knows.
 */
export function readMaterial(text: string): {
  material?: Material;
  materialNote?: string;
} {
  const whole = materialOf(text);
  if (whole) return { material: whole };
  // As the export writes it: the material, then " · " and the note about it.
  const [first = "", ...rest] = text.split(" · ");
  const exported = materialOf(first);
  if (exported)
    return { material: exported, materialNote: rest.join(" · ").trim() };
  const word = /^([^\s(,;/]+)\s*[,;/]?\s*(.+)$/u.exec(text);
  const leading = word?.[1] && materialOf(word[1]);
  if (leading && word)
    return { material: leading, materialNote: word[2]?.trim() || undefined };
  return { materialNote: text };
}

/** How a date with the year last puts its day and month. */
export const dateOrders = ["dmy", "mdy"] as const;
export type DateOrder = (typeof dateOrders)[number];

const pad = (part: string) => part.padStart(2, "0");

/**
 * A date as YYYY-MM-DD: written so ("2024-03-05", also with a time after
 * it), year first with slashes or dots, day first with dots ("5.3.2024"),
 * or with slashes or dashes and the year last, read in `order`. Anything
 * else is returned as written, for the rules to refuse.
 */
export function readDate(text: string, order: DateOrder) {
  const date =
    /^(\S+?)(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      text.trim(),
    )?.[1] ?? text;
  const yearFirst = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(date);
  if (yearFirst) {
    const [, year = "", month = "", day = ""] = yearFirst;
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date);
  if (dotted) {
    const [, day = "", month = "", year = ""] = dotted;
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  const yearLast = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(date);
  if (yearLast) {
    const [, first = "", second = "", year = ""] = yearLast;
    const [day, month] = order === "dmy" ? [first, second] : [second, first];
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  return text;
}

/** Whether a text reads as a date (`readDate`), in either order. */
export const isDate = (text: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(readDate(text, "dmy"));

/**
 * How dates with the year last are written in these cells: day first when
 * one of them has a day above 12, month first when one has a month above
 * 12, and null when none says (or there are no such dates).
 */
export function dateOrderOf(texts: Iterable<string>): DateOrder | null {
  for (const text of texts) {
    const match = /^(\d{1,2})[/-](\d{1,2})[/-]\d{4}\b/.exec(text.trim());
    if (!match) continue;
    if (Number(match[1]) > 12) return "dmy";
    if (Number(match[2]) > 12) return "mdy";
  }
  return null;
}

/** The currencies a symbol or word written with an amount can stand for. */
const currencyMarks: Record<string, readonly HomeCurrency[]> = {
  "€": ["EUR"],
  "£": ["GBP"],
  $: ["USD"],
  US$: ["USD"],
  KR: ["NOK", "SEK", "DKK"],
  "KR.": ["NOK", "SEK", "DKK"],
  NKR: ["NOK"],
  SKR: ["SEK"],
  DKR: ["DKK"],
  LEI: ["RON"],
  LEU: ["RON"],
  FR: ["CHF"],
  "FR.": ["CHF"],
  SFR: ["CHF"],
  "SFR.": ["CHF"],
};

/** The currencies a currency cell or an amount's mark can stand for. */
export function currenciesOf(written: string): readonly string[] {
  const mark = written.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(mark)) return [mark];
  return currencyMarks[mark] ?? [];
}

/** Whether the currency as written can be this Home currency. */
export const meansCurrency = (written: string, currency: string) =>
  currenciesOf(written).includes(currency);

/**
 * An amount in minor units, and the currency written with it if any:
 * plain ("1250.50"), grouped either way ("1.250,50"), with a currency
 * before or after it ("€12.50", "12,50 €", "kr 1 250", "12.50 USD").
 * Undefined when it isn't an amount.
 */
export function readAmount(
  text: string,
): { amount: number; currency?: string } | undefined {
  const parts =
    /^([^\d\s.,-]*)[\s  ]*(\d[\d\s  .,]*?)[\s  ]*([^\d\s.,-]*)$/u.exec(
      text.trim(),
    );
  if (!parts) return undefined;
  const [, before = "", number = "", after = ""] = parts;
  if (before && after) return undefined;
  const mark = before || after;
  if (mark && currenciesOf(mark).length === 0) return undefined;
  const amount = parseMoney(number, "en") ?? parseMoney(number, "de");
  if (amount === null) return undefined;
  return { amount, ...(mark && { currency: mark.toUpperCase() }) };
}

/** Year cells that mean the piece has no date. */
const noDate = new Set(
  ["nd", "n.d.", "n/d", "o.j.", "o. j.", "s.d.", "s. d.", "u.å.", "-", "?"].map(
    folded,
  ),
);

/** A year: a whole number; undefined for "ND" and the like; null when it's neither. */
export function readYear(text: string): number | undefined | null {
  if (/^-?\d+$/.test(text)) return Number(text);
  return noDate.has(folded(text)) ? undefined : null;
}

/** A Numista number: "1234", "N# 1234" or "N#1234"; null when it's neither. */
export function readNumistaNumber(text: string): number | null {
  const digits = /^(?:N\s*#?\s*)?(\d{1,9})$/i.exec(text.trim())?.[1];
  return digits === undefined ? null : Number(digits);
}

/** Grades written in words or their usual letters, on the lettered scales. */
const gradeWords = new Map<string, string>(
  (
    [
      ["UNC", ["unc", "uncirculated", "ms", "mint state", "bu"]],
      ["AU", ["au", "about uncirculated", "almost uncirculated"]],
      ["XF", ["xf", "ef", "extremely fine"]],
      ["VF", ["vf", "very fine"]],
      ["F", ["f", "fine"]],
      ["VG", ["vg", "very good"]],
      ["G", ["g", "good"]],
      ["FR", ["fr", "fair"]],
      ["PR", ["pr", "po", "p", "poor"]],
    ] as const
  ).flatMap(([code, words]) => words.map((word) => [folded(word), code])),
);

type ReadGrade = {
  gradingScale: GradingScale;
  grade: string;
  strike?: Strike;
  gradeNote?: string;
};

/** A Grade on one scale, as the export or another app writes it. */
function gradeOn(scale: GradingScale, text: string): ReadGrade | undefined {
  const written = text.trim();
  if (scale === "stamp") {
    const grade = stampGradeOf(written);
    return grade === undefined ? undefined : { gradingScale: scale, grade };
  }
  if (scale === "sheldon") {
    // "MS-65", "PF 70 UCAM", "PR69DCAM", "65+", "AU58": the number is the
    // Grade, a proof's letters its Strike, what follows a note.
    const parts = /^(?:([A-Z]{1,3})[\s-]*)?(\d{1,2})(?![\d])\s*(.*)$/i.exec(
      written,
    );
    if (!parts) return undefined;
    const [, letters = "", number = "", rest = ""] = parts;
    if (
      letters &&
      !/^(?:MS|PF|PR|SP|AU|EF|XF|VF|F|VG|G|AG|FR|PO|P)$/i.test(letters)
    )
      return undefined;
    if (!isGrade(scale, number)) return undefined;
    return {
      gradingScale: scale,
      grade: number,
      ...(/^(?:PF|PR)$/i.test(letters) && { strike: "proof" as const }),
      ...(rest.trim() && { gradeNote: rest.trim() }),
    };
  }
  if (scale === "norwegian") {
    const grade = written.toUpperCase().replace(/−/g, "-");
    return isGrade(scale, grade) ? { gradingScale: scale, grade } : undefined;
  }
  const code = gradeWords.get(folded(written)) ?? written.toUpperCase();
  if (!isGrade(scale, code)) return undefined;
  const bu = /^(?:bu|brilliant uncirculated)$/i.test(written);
  return { gradingScale: scale, grade: code, ...(bu && { strike: "bu" }) };
}

/**
 * A Grade as written: on the scale given, or else on the scale the Item
 * would start on (`defaultScale`) or another that suits its type, the
 * first that reads it. "Proof" alone is a Strike with no Grade. A Grade no
 * scale reads is kept as the Grade's note, so the row isn't lost.
 */
export function readGrade(
  type: ItemType,
  country: string | undefined,
  scale: GradingScale | undefined,
  text: string,
): Partial<ReadGrade> {
  // Not "PR" or "PF": on the lettered scales "PR" is Poor.
  if (
    type !== "stamp" &&
    strikeOf(text) === "proof" &&
    !/^P[FR]$/i.test(text.trim())
  )
    return { strike: "proof" };
  const first = scale ?? defaultScale(type, country);
  const scales = scale
    ? [scale]
    : [first, ...scalesFor(type).filter((other) => other !== first)];
  for (const candidate of scales) {
    const grade = gradeOn(candidate, text);
    if (grade) return grade;
  }
  return { gradeNote: text };
}
