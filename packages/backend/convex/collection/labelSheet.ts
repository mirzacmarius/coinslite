import type { Locale } from "@coinslite/i18n";
import { type Infer, v } from "convex/values";
import { noMintMark } from "../catalog/fields";
import { bulkLimits } from "../items/bulkRules";
import { type Strike, gradeCode } from "../items/grades";
import { gradingScale, itemType, strike } from "../utils/validators";

/**
 * Labels to print for 2×2 flips, slab backs, boxes and envelopes (spec 7): a
 * PDF of label sheets with one label per Item, or per piece, of a Collection
 * view or of chosen Items. Pure: the label sizes and the sheets they come on,
 * the options, the limits, and what each label says. The drawing is in
 * pdf/labelSheet.ts and the file in labelSheetPdf.ts; the app's Labels
 * dialog shares these rules.
 */

/** The three label sizes; what each suits is in the app's dictionary. */
export const labelSizes = ["small", "medium", "large"] as const;
export type LabelSize = (typeof labelSizes)[number];
export const labelSize = v.union(
  v.literal("small"),
  v.literal("medium"),
  v.literal("large"),
);

export const papers = ["a4", "letter"] as const;
export type Paper = (typeof papers)[number];
export const paper = v.union(v.literal("a4"), v.literal("letter"));

export const labelOptions = v.object({
  size: labelSize,
  paper,
  /** The Purchase price, and its date where the label has room. */
  purchase: v.boolean(),
  marketValue: v.boolean(),
  /** A QR code that opens the Item in CoinsLite; the small label has no room for one. */
  qrCode: v.boolean(),
  /** One label per piece rather than one per Item. */
  perPiece: v.boolean(),
  /** How many labels of the first sheet are already used, so printing starts after them. */
  skip: v.number(),
});
export type LabelOptions = Infer<typeof labelOptions>;

export const defaultLabelOptions: LabelOptions = {
  size: "small",
  paper: "a4",
  purchase: false,
  marketValue: false,
  qrCode: true,
  perPiece: false,
  skip: 0,
};

/** A sheet of labels of one size: its page, and where each label is on it. */
export type LabelLayout = {
  /**
   * The label sheets the layout matches, named as on their box (equivalents
   * from other makers share the measurements); null for a grid printed on
   * plain or full-sheet label paper and cut along faint lines.
   */
  template: string | null;
  /** The sheet, in millimetres. */
  page: { width: number; height: number };
  /** One label, in millimetres. */
  label: { width: number; height: number };
  columns: number;
  rows: number;
  /** The first label's top-left corner from the sheet's, in millimetres. */
  margin: { top: number; left: number };
  /** From a label's top-left corner to the next one's, in millimetres. */
  pitch: { x: number; y: number };
};

const a4 = { width: 210, height: 297 };
const letter = { width: 215.9, height: 279.4 };
/** Millimetres to the inch, for the sheets measured in inches. */
const inch = 25.4;

/**
 * The sheets, by paper and label size. Small labels are the strip of a 2×2
 * flip (1¾ × ½ in, as Avery 5167 cuts them), medium ones fit a slab's back
 * or a 2×2 holder, large ones a box, tray or envelope. Where no common sheet
 * of the size exists for the paper, the labels are a grid to cut out.
 */
export const labelLayouts: Record<Paper, Record<LabelSize, LabelLayout>> = {
  a4: {
    small: {
      template: null,
      page: a4,
      label: { width: 44.45, height: 12.7 },
      columns: 4,
      rows: 20,
      margin: { top: 21.5, left: 11.6 },
      pitch: { x: 47.45, y: 12.7 },
    },
    medium: {
      template: "Avery L7651",
      page: a4,
      label: { width: 38.1, height: 21.2 },
      columns: 5,
      rows: 13,
      margin: { top: 10.7, left: 4.75 },
      pitch: { x: 40.6, y: 21.2 },
    },
    large: {
      template: "Avery L7160",
      page: a4,
      label: { width: 63.5, height: 38.1 },
      columns: 3,
      rows: 7,
      margin: { top: 15.1, left: 7.2 },
      pitch: { x: 66, y: 38.1 },
    },
  },
  letter: {
    small: {
      template: "Avery 5167",
      page: letter,
      label: { width: 1.75 * inch, height: 0.5 * inch },
      columns: 4,
      rows: 20,
      margin: { top: 0.5 * inch, left: 0.28125 * inch },
      pitch: { x: 2.0625 * inch, y: 0.5 * inch },
    },
    medium: {
      template: null,
      page: letter,
      label: { width: 38.1, height: 21.2 },
      columns: 5,
      rows: 12,
      margin: { top: 12.5, left: 7.7 },
      pitch: { x: 40.6, y: 21.2 },
    },
    large: {
      template: "Avery 5160",
      page: letter,
      label: { width: 2.625 * inch, height: 1 * inch },
      columns: 3,
      rows: 10,
      margin: { top: 0.5 * inch, left: 0.1875 * inch },
      pitch: { x: 2.75 * inch, y: 1 * inch },
    },
  },
};

export const labelsPerSheet = (layout: LabelLayout) =>
  layout.columns * layout.rows;

/**
 * Where label `index` goes, counting from 0 across the sheets row by row:
 * its sheet, and its top-left corner in millimetres from the sheet's.
 */
export function labelPlace(layout: LabelLayout, index: number) {
  const perSheet = labelsPerSheet(layout);
  const sheet = Math.floor(index / perSheet);
  const onSheet = index - sheet * perSheet;
  const row = Math.floor(onSheet / layout.columns);
  const column = onSheet % layout.columns;
  return {
    sheet,
    x: layout.margin.left + column * layout.pitch.x,
    y: layout.margin.top + row * layout.pitch.y,
  };
}

/** The used labels to skip, as a count the first sheet has. */
export const clampSkip = (layout: LabelLayout, skip: number) =>
  Math.min(Math.max(0, Math.floor(skip) || 0), labelsPerSheet(layout) - 1);

export const labelSheetLimits = {
  /** How many labels one PDF holds, counting pieces when printing per piece. */
  labels: 1_000,
  /** How many chosen Items one PDF is asked for at once: as many as select mode selects. */
  items: bulkLimits.items,
} as const;

export const labelSheetErrors = {
  /** More labels than one PDF holds. */
  tooManyLabels: "TOO_MANY_LABELS",
} as const;

/** What a label can say about an Item; the amounts are for one piece, in minor units. */
export const labelItem = v.object({
  id: v.id("items"),
  type: itemType,
  title: v.string(),
  country: v.optional(v.string()),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  mintMark: v.optional(v.string()),
  gradingScale: v.optional(gradingScale),
  grade: v.optional(v.string()),
  strike: v.optional(strike),
  numistaNumber: v.optional(v.number()),
  quantity: v.number(),
  purchasePrice: v.optional(v.number()),
  purchaseDate: v.optional(v.string()),
  marketValue: v.optional(v.number()),
});
export type LabelItem = Infer<typeof labelItem>;

/** The words a label needs in its language, and how it writes amounts, dates and countries. */
export type LabelWords = {
  /** The language, which writes some Grades its own way ("vz", "TTB"). */
  locale: Locale;
  country: (code: string) => string;
  money: (amountMinor: number) => string;
  date: (date: string) => string;
  /** A stamp's Grade in words. */
  stampGrade: (grade: string) => string;
  paid: string;
  value: string;
};

/** The Strikes a label notes beside a Grade, as collectors abbreviate them in every language. */
const strikeCodes: Partial<Record<Strike, string>> = {
  bu: "BU",
  proof: "Proof",
};

export type LabelText = {
  title: string;
  /** Under the title, most telling first, for when the label runs out of room. */
  lines: string[];
};

/**
 * What a label says: the Item's title; the facts the title doesn't already
 * hold (country, denomination, year, mint mark); its Grade with the Strike,
 * the Numista number (not on small labels) and the number of pieces it
 * stands for; then the amounts asked for, the Purchase price with its date
 * on large labels, together on one line on small ones.
 */
export function labelText(
  item: LabelItem,
  options: Pick<LabelOptions, "size" | "purchase" | "marketValue" | "perPiece">,
  words: LabelWords,
): LabelText {
  const title = item.title.trim();
  const inTitle = (text: string) =>
    title.toLowerCase().includes(text.toLowerCase());
  const facts = [
    item.country && words.country(item.country),
    item.denomination,
    item.year === undefined ? undefined : String(item.year),
    item.mintMark && item.mintMark !== noMintMark ? item.mintMark : undefined,
  ].filter(
    (fact): fact is string =>
      typeof fact === "string" && fact !== "" && !inTitle(fact),
  );
  const grade =
    item.gradingScale && item.grade !== undefined
      ? item.gradingScale === "stamp"
        ? words.stampGrade(item.grade)
        : gradeCode(item.gradingScale, item.grade, item.strike, words.locale)
      : undefined;
  // A Sheldon code already says MS or PF.
  const strikeCode =
    item.gradingScale === "sheldon" || !item.strike
      ? undefined
      : strikeCodes[item.strike];
  const condition = [
    [grade, strikeCode].filter(Boolean).join(" "),
    options.size !== "small" && item.numistaNumber !== undefined
      ? `N# ${item.numistaNumber}`
      : undefined,
    !options.perPiece && item.quantity > 1 ? `×${item.quantity}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const paid =
    options.purchase && item.purchasePrice !== undefined
      ? [
          words.paid,
          words.money(item.purchasePrice),
          options.size === "large" && item.purchaseDate
            ? `(${words.date(item.purchaseDate)})`
            : undefined,
        ]
          .filter(Boolean)
          .join(" ")
      : undefined;
  const value =
    options.marketValue && item.marketValue !== undefined
      ? `${words.value} ${words.money(item.marketValue)}`
      : undefined;
  const amounts = [paid, value].filter((line): line is string => Boolean(line));
  return {
    title,
    lines: [
      facts.join(" · "),
      condition,
      ...(options.size === "small" ? [amounts.join(" · ")] : amounts),
    ].filter(Boolean),
  };
}

/** How many labels the Items take: one each, or one per piece. */
export const labelCount = (
  items: readonly { quantity: number }[],
  perPiece: boolean,
) =>
  perPiece
    ? items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0)
    : items.length;

/** The Item's page in the app, for a QR code. */
export const itemLink = (appUrl: string, itemId: string) =>
  `${appUrl.replace(/\/$/, "")}/collection/${itemId}`;

export type SheetLabel = LabelText & {
  /** What the label's QR code opens; null for no QR code. */
  link: string | null;
};

/**
 * The labels in print order: each Item's, repeated per piece when asked for.
 * A label links to its Item when QR codes are asked for, the label has room
 * for one and the app's address is known.
 */
export function labelsOf(
  items: readonly LabelItem[],
  options: LabelOptions,
  words: LabelWords,
  appUrl: string | null,
): SheetLabel[] {
  const linkedTo = options.qrCode && options.size !== "small" ? appUrl : null;
  return items.flatMap((item) => {
    const label: SheetLabel = {
      ...labelText(item, options, words),
      link: linkedTo === null ? null : itemLink(linkedTo, item.id),
    };
    const copies = options.perPiece ? Math.max(1, item.quantity) : 1;
    return Array.from({ length: copies }, () => label);
  });
}

/** The label sheets' own words, in each launch language. */
export type LabelSheetMessages = {
  /** The document's title, in its properties. */
  title: string;
  /** The downloaded file's name, before the date: ASCII, lower case. */
  fileName: string;
  /** Before the Purchase price. */
  paid: string;
  /** Before the Market value. */
  value: string;
};

export const labelSheetMessages: Record<Locale, LabelSheetMessages> = {
  en: {
    title: "Labels",
    fileName: "coinslite-labels",
    paid: "Paid",
    value: "Value",
  },
  nb: {
    title: "Etiketter",
    fileName: "coinslite-etiketter",
    paid: "Betalt",
    value: "Verdi",
  },
  de: {
    title: "Etiketten",
    fileName: "coinslite-etiketten",
    paid: "Bezahlt",
    value: "Wert",
  },
  fr: {
    title: "Étiquettes",
    fileName: "coinslite-etiquettes",
    paid: "Payé",
    value: "Valeur",
  },
  ro: {
    title: "Etichete",
    fileName: "coinslite-etichete",
    paid: "Plătit",
    value: "Valoare",
  },
};
