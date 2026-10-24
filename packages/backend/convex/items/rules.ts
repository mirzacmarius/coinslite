import { isCountryCode } from "@coinslite/i18n";
import { ConvexError } from "convex/values";
import type { Metal } from "../spotPrices/rates";
import {
  type GradingScale,
  type ItemType,
  type Strike,
  hasStrike,
  suitsGrade,
} from "./grades";
import type { Grader, StampCatalogue } from "./references";
import { checkTags } from "./tags";

/**
 * What an Item may hold. Pure, so the add form checks the same limits before
 * sending; the backend checks them again on every write.
 */

export const itemErrors = {
  titleRequired: "TITLE_REQUIRED",
  tooLong: "TOO_LONG",
  invalidQuantity: "INVALID_QUANTITY",
  invalidYear: "INVALID_YEAR",
  invalidCountry: "INVALID_COUNTRY",
  invalidAmount: "INVALID_AMOUNT",
  invalidDate: "INVALID_DATE",
  soldBeforePurchase: "SOLD_BEFORE_PURCHASE",
  invalidGrade: "INVALID_GRADE",
  invalidStrike: "INVALID_STRIKE",
  invalidNumber: "INVALID_NUMBER",
  notForType: "FIELD_NOT_FOR_TYPE",
  metalRequired: "METAL_REQUIRED",
} as const;

/** What a coin is made of. */
export const materials = [
  "gold",
  "silver",
  "platinum",
  "palladium",
  "copper",
  "bronze",
  "brass",
  "cupronickel",
  "nickelBrass",
  "nickel",
  "iron",
  "steel",
  "aluminium",
  "aluminiumBronze",
  "zinc",
  "tin",
  "bimetallic",
  "other",
] as const;
export type Material = (typeof materials)[number];

/**
 * Fields only some Item types have; every other field suits all three.
 * Metal and size are a coin's; banknotes share ruler, mintage, Numista and
 * a Certification. The stamp catalogue's number and the printing facts are
 * a stamp's or a banknote's own.
 */
export const typeOnlyFields = {
  material: ["coin"],
  materialNote: ["coin"],
  mintMark: ["coin"],
  diameter: ["coin"],
  thickness: ["coin"],
  ruler: ["coin", "banknote"],
  mintage: ["coin", "banknote"],
  numistaNumber: ["coin", "banknote"],
  bullion: ["coin"],
  metal: ["coin"],
  weight: ["coin"],
  purity: ["coin"],
  grader: ["coin", "banknote"],
  graderName: ["coin", "banknote"],
  certificateNumber: ["coin", "banknote"],
  stampCatalogue: ["stamp"],
  stampCatalogueName: ["stamp"],
  stampCatalogueNumber: ["stamp"],
  perforation: ["stamp"],
  watermark: ["stamp"],
  colour: ["stamp"],
  serialNumber: ["banknote"],
  signatures: ["banknote"],
  printer: ["banknote"],
} as const satisfies Record<string, readonly ItemType[]>;

export const fieldSuits = (
  field: keyof typeof typeOnlyFields,
  type: ItemType,
) => (typeOnlyFields[field] as readonly ItemType[]).includes(type);

export const itemLimits = {
  title: 200,
  denomination: 100,
  series: 100,
  category: 100,
  materialNote: 100,
  mintMark: 20,
  ruler: 100,
  mintage: 1_000_000_000_000,
  /** Millimetres. */
  diameter: 500,
  thickness: 100,
  gradeNote: 200,
  /** Each text under "Catalogue and certification" (references.ts). */
  reference: 100,
  source: 200,
  /** Kept in: where the Item is, as the person describes it. */
  storage: 100,
  notes: 5000,
  saleNote: 500,
  quantity: 1_000_000,
  /** Ancient coins are welcome; years are whole numbers, BC as negatives. */
  earliestYear: -3000,
  /** Amounts in minor units: up to a hundred billion in any Home currency. */
  amount: 10_000_000_000_000,
  /** Grams, kept to milligrams: up to 100 kg, for the largest bullion coins. */
  weight: 100_000,
  /** The precious metal's share of the weight; 0.9999 is "four nines" fine. */
  purity: 1,
} as const;

/** The fields a person types for an Item, as sent by the add form. */
export type ItemInput = {
  type: ItemType;
  title: string;
  country?: string;
  year?: number;
  denomination?: string;
  series?: string;
  category?: string;
  material?: Material;
  materialNote?: string;
  mintMark?: string;
  ruler?: string;
  mintage?: number;
  diameter?: number;
  thickness?: number;
  numistaNumber?: number;
  bullion?: boolean;
  metal?: Metal;
  /** Grams. */
  weight?: number;
  /** Above 0 and at most 1. */
  purity?: number;
  grade?: string;
  gradingScale?: GradingScale;
  gradeNote?: string;
  strike?: Strike;
  grader?: Grader;
  /** The grader's name, when it's "other". */
  graderName?: string;
  certificateNumber?: string;
  stampCatalogue?: StampCatalogue;
  /** The catalogue's name, when it's "other". */
  stampCatalogueName?: string;
  stampCatalogueNumber?: string;
  perforation?: string;
  watermark?: string;
  colour?: string;
  serialNumber?: string;
  signatures?: string;
  printer?: string;
  quantity?: number;
  purchasePrice?: number;
  marketValue?: number;
  purchaseDate?: string;
  source?: string;
  /** Kept in: where the Item is physically kept. */
  storage?: string;
  notes?: string;
  tags?: string[];
};

const fail = (code: string): never => {
  throw new ConvexError(code);
};

/** Trimmed text, or undefined when empty; too long is refused. */
function text(value: string | undefined, limit: number) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > limit) fail(itemErrors.tooLong);
  return trimmed;
}

function amount(value: number | undefined) {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 0 || value > itemLimits.amount) {
    fail(itemErrors.invalidAmount);
  }
  return value;
}

/** Whether a "YYYY-MM-DD" date exists and isn't after `today`. */
export function isPastOrToday(date: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().startsWith(date) &&
    date <= today
  );
}

/**
 * Checks and tidies an Item's fields. `today` is the latest allowed purchase
 * date ("YYYY-MM-DD"); the caller passes it so the rule stays pure.
 */
export function checkItem(input: ItemInput, today: string) {
  const title =
    text(input.title, itemLimits.title) ?? fail(itemErrors.titleRequired);
  const quantity = input.quantity ?? 1;
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > itemLimits.quantity
  ) {
    fail(itemErrors.invalidQuantity);
  }
  const country = input.country?.trim().toUpperCase() || undefined;
  if (country !== undefined && !isCountryCode(country))
    fail(itemErrors.invalidCountry);
  const latestYear = Number(today.slice(0, 4)) + 1;
  if (
    input.year !== undefined &&
    (!Number.isSafeInteger(input.year) ||
      input.year < itemLimits.earliestYear ||
      input.year > latestYear)
  ) {
    fail(itemErrors.invalidYear);
  }
  const purchase = checkPurchase(input, today);

  for (const field of Object.keys(typeOnlyFields) as Array<
    keyof typeof typeOnlyFields
  >) {
    if (input[field] !== undefined && !fieldSuits(field, input.type))
      fail(itemErrors.notForType);
  }

  return {
    type: input.type,
    title,
    quantity,
    ...withText("series", text(input.series, itemLimits.series)),
    ...withText("category", text(input.category, itemLimits.category)),
    ...(input.material && { material: input.material }),
    ...withText(
      "materialNote",
      text(input.materialNote, itemLimits.materialNote),
    ),
    ...withText("mintMark", text(input.mintMark, itemLimits.mintMark)),
    ...withText("ruler", text(input.ruler, itemLimits.ruler)),
    ...withNumber("mintage", wholeNumber(input.mintage, itemLimits.mintage)),
    ...withNumber("diameter", millimetres(input.diameter, itemLimits.diameter)),
    ...withNumber(
      "thickness",
      millimetres(input.thickness, itemLimits.thickness),
    ),
    ...withNumber(
      "numistaNumber",
      wholeNumber(input.numistaNumber, Number.MAX_SAFE_INTEGER),
    ),
    ...checkPreciousMetal(input),
    ...checkGrade(input),
    ...checkReferences(input),
    ...(country && { country }),
    ...(input.year !== undefined && { year: input.year }),
    ...withText(
      "denomination",
      text(input.denomination, itemLimits.denomination),
    ),
    ...purchase,
    ...withNumber("marketValue", amount(input.marketValue)),
    ...withText("storage", text(input.storage, itemLimits.storage)),
    ...withText("notes", text(input.notes, itemLimits.notes)),
    ...withTags(checkTags(input.tags)),
  };
}

/** The tags field, left out when there are none. */
const withTags = (tags: string[] | undefined) => (tags ? { tags } : {});

/** The fields of an Item's purchase: Purchase price per piece, purchase date and source. */
export const purchaseFields = [
  "purchasePrice",
  "purchaseDate",
  "source",
] as const satisfies ReadonlyArray<keyof ItemInput>;

/** An Item's purchase as typed, or as stored. */
export type PurchaseInput = Pick<ItemInput, (typeof purchaseFields)[number]>;

/**
 * Checks and tidies an Item's purchase, as `checkItem` does: a field left
 * empty is left out, never written as empty. `today` is the latest allowed
 * purchase date ("YYYY-MM-DD").
 */
export function checkPurchase(input: PurchaseInput, today: string) {
  const purchaseDate = input.purchaseDate?.trim() || undefined;
  if (purchaseDate !== undefined && !isPastOrToday(purchaseDate, today))
    fail(itemErrors.invalidDate);
  return {
    ...withNumber("purchasePrice", amount(input.purchasePrice)),
    ...(purchaseDate && { purchaseDate }),
    ...withText("source", text(input.source, itemLimits.source)),
  };
}

/** A sale as the Sell dialog sends it; the price is per piece. */
export type SaleInput = {
  soldOn: string;
  salePrice?: number;
  saleNote?: string;
};

/**
 * Checks and tidies a sale. The sold-on date is required and, like a
 * purchase date, may be at most `today`; nor can it come before the Item's
 * `purchaseDate`.
 */
export function checkSale(
  input: SaleInput,
  today: string,
  purchaseDate?: string,
) {
  const soldOn = input.soldOn.trim();
  if (!isPastOrToday(soldOn, today)) fail(itemErrors.invalidDate);
  if (purchaseDate !== undefined && soldOn < purchaseDate)
    fail(itemErrors.soldBeforePurchase);
  return {
    soldOn,
    salePrice: amount(input.salePrice),
    saleNote: text(input.saleNote, itemLimits.saleNote),
  };
}

/** A count or catalogue number: a whole number from 1 to `max`. */
function wholeNumber(value: number | undefined, max: number) {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 1 || value > max)
    fail(itemErrors.invalidNumber);
  return value;
}

/** A size in millimetres, above zero, kept to hundredths. */
function millimetres(value: number | undefined, max: number) {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value <= 0 || value > max)
    fail(itemErrors.invalidNumber);
  return Math.round(value * 100) / 100;
}

/** A measure above zero and at most `max`, kept to `decimals` places. */
function positive(value: number | undefined, max: number, decimals: number) {
  if (value === undefined) return undefined;
  const scale = 10 ** decimals;
  const kept = Math.round(value * scale) / scale;
  if (!Number.isFinite(kept) || kept <= 0 || kept > max)
    fail(itemErrors.invalidNumber);
  return kept;
}

/** A coin's precious metal. Weight and purity are the metal's, so they need one. */
function checkPreciousMetal({ bullion, metal, weight, purity }: ItemInput) {
  if ((weight !== undefined || purity !== undefined) && metal === undefined)
    fail(itemErrors.metalRequired);
  return {
    ...(bullion && { bullion }),
    ...(metal && { metal }),
    ...withNumber("weight", positive(weight, itemLimits.weight, 3)),
    ...withNumber("purity", positive(purity, itemLimits.purity, 5)),
  };
}

/**
 * A Grade comes with the scale it's on, and that scale must suit the Item
 * type; a scale without a Grade isn't kept. Strike is for coins and banknotes.
 */
function checkGrade({
  type,
  grade,
  gradingScale,
  gradeNote,
  strike,
}: ItemInput) {
  if (grade !== undefined) {
    const fits =
      gradingScale !== undefined && suitsGrade(type, gradingScale, grade);
    if (!fits) fail(itemErrors.invalidGrade);
  }
  if (strike !== undefined && !hasStrike(type)) fail(itemErrors.invalidStrike);
  return {
    ...(grade !== undefined && { grade, gradingScale }),
    ...withText("gradeNote", text(gradeNote, itemLimits.gradeNote)),
    ...(strike && { strike }),
  };
}

/**
 * The facts under "Catalogue and certification" (references.ts), each a
 * short text.
 * A name typed for the grader or catalogue is kept only when it's "other".
 */
function checkReferences(input: ItemInput) {
  const short = (value: string | undefined) =>
    text(value, itemLimits.reference);
  return {
    ...(input.grader && { grader: input.grader }),
    ...withText(
      "graderName",
      input.grader === "other" ? short(input.graderName) : undefined,
    ),
    ...withText("certificateNumber", short(input.certificateNumber)),
    ...(input.stampCatalogue && { stampCatalogue: input.stampCatalogue }),
    ...withText(
      "stampCatalogueName",
      input.stampCatalogue === "other"
        ? short(input.stampCatalogueName)
        : undefined,
    ),
    ...withText("stampCatalogueNumber", short(input.stampCatalogueNumber)),
    ...withText("perforation", short(input.perforation)),
    ...withText("watermark", short(input.watermark)),
    ...withText("colour", short(input.colour)),
    ...withText("serialNumber", short(input.serialNumber)),
    ...withText("signatures", short(input.signatures)),
    ...withText("printer", short(input.printer)),
  };
}

const withText = <K extends string>(key: K, value: string | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, string>>;
const withNumber = <K extends string>(key: K, value: number | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, number>>;

/**
 * Every Item field that holds money, in minor units of the owner's Home
 * currency. Changing the Home currency converts exactly these, so a new money
 * field on Items belongs here too.
 */
export const itemMoneyFields = [
  "purchasePrice",
  "marketValue",
  "salePrice",
] as const satisfies ReadonlyArray<keyof ItemInput | keyof SaleInput>;
export type ItemMoneyField = (typeof itemMoneyFields)[number];
