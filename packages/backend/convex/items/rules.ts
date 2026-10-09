import { isCountryCode } from "@coinslite/i18n";
import { ConvexError } from "convex/values";
import {
  type GradingScale,
  type ItemType,
  type Strike,
  gradingScales,
  hasStrike,
  isGrade,
} from "./grades";

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
  invalidGrade: "INVALID_GRADE",
  invalidStrike: "INVALID_STRIKE",
  invalidNumber: "INVALID_NUMBER",
  notForType: "FIELD_NOT_FOR_TYPE",
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
 * Metal and size are a coin's; banknotes share ruler, mintage and Numista.
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
  source: 200,
  notes: 5000,
  quantity: 1_000_000,
  /** Ancient coins are welcome; years are whole numbers, BC as negatives. */
  earliestYear: -3000,
  /** Amounts in minor units: up to a hundred billion in any Home currency. */
  amount: 10_000_000_000_000,
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
  grade?: string;
  gradingScale?: GradingScale;
  gradeNote?: string;
  strike?: Strike;
  quantity?: number;
  purchasePrice?: number;
  marketValue?: number;
  purchaseDate?: string;
  source?: string;
  notes?: string;
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
  const purchaseDate = input.purchaseDate?.trim() || undefined;
  if (purchaseDate !== undefined && !isPastOrToday(purchaseDate, today))
    fail(itemErrors.invalidDate);

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
    ...checkGrade(input),
    ...(country && { country }),
    ...(input.year !== undefined && { year: input.year }),
    ...withText(
      "denomination",
      text(input.denomination, itemLimits.denomination),
    ),
    ...withNumber("purchasePrice", amount(input.purchasePrice)),
    ...withNumber("marketValue", amount(input.marketValue)),
    ...(purchaseDate && { purchaseDate }),
    ...withText("source", text(input.source, itemLimits.source)),
    ...withText("notes", text(input.notes, itemLimits.notes)),
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
      gradingScale !== undefined &&
      (gradingScales[gradingScale].itemTypes as readonly ItemType[]).includes(
        type,
      ) &&
      isGrade(gradingScale, grade);
    if (!fits) fail(itemErrors.invalidGrade);
  }
  if (strike !== undefined && !hasStrike(type)) fail(itemErrors.invalidStrike);
  return {
    ...(grade !== undefined && { grade, gradingScale }),
    ...withText("gradeNote", text(gradeNote, itemLimits.gradeNote)),
    ...(strike && { strike }),
  };
}

const withText = <K extends string>(key: K, value: string | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, string>>;
const withNumber = <K extends string>(key: K, value: number | undefined) =>
  (value === undefined ? {} : { [key]: value }) as Partial<Record<K, number>>;
