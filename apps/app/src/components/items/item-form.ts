import type { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import {
  type GradingScale,
  type Strike,
  defaultScale,
  hasStrike,
  isGrade,
  scalesFor,
} from "@coinslite/backend/convex/items/grades";
import type { BullionPreset } from "@coinslite/backend/convex/items/preciousMetal";
import {
  type Material,
  fieldSuits,
  type typeOnlyFields,
} from "@coinslite/backend/convex/items/rules";
import type { Metal } from "@coinslite/backend/convex/spotPrices/rates";
import {
  type CountryCode,
  type Locale,
  formatNumber,
  isCountryCode,
  parseMoney,
} from "@coinslite/i18n";
import type { ItemType } from "@coinslite/ui/item-type-icon";
import type { FunctionArgs } from "convex/server";

/** The Item form's fields as typed: numbers stay text until the form is sent. */
export type ItemFormValues = {
  title: string;
  notes: string;
  type: ItemType;
  country: CountryCode | undefined;
  grade: string | undefined;
  /** Picked by hand; until then the country's default scale applies. */
  gradingScale: GradingScale | undefined;
  gradeNote: string;
  strike: Strike | undefined;
  quantity: string;
  year: string;
  denomination: string;
  series: string;
  category: string;
  ruler: string;
  mintMark: string;
  mintage: string;
  numistaNumber: string;
  material: Material | undefined;
  materialNote: string;
  diameter: string;
  thickness: string;
  bullion: boolean;
  metal: Metal | undefined;
  /** Grams. */
  weight: string;
  purity: string;
  purchasePrice: string;
  marketValue: string;
  purchaseDate: string;
  source: string;
  albumId: Id<"albums"> | undefined;
};

export type ItemArgs = FunctionArgs<typeof api.items.add>;

export const blankItem = (): ItemFormValues => ({
  title: "",
  notes: "",
  type: "coin",
  country: undefined,
  grade: undefined,
  gradingScale: undefined,
  gradeNote: "",
  strike: undefined,
  quantity: "1",
  year: "",
  denomination: "",
  series: "",
  category: "",
  ruler: "",
  mintMark: "",
  mintage: "",
  numistaNumber: "",
  material: undefined,
  materialNote: "",
  diameter: "",
  thickness: "",
  bullion: false,
  metal: undefined,
  weight: "",
  purity: "",
  purchasePrice: "",
  marketValue: "",
  purchaseDate: "",
  source: "",
  albumId: undefined,
});

/** The fields under "More details": the group opens when any of them holds a value. */
export const detailFields = [
  "year",
  "denomination",
  "series",
  "category",
  "ruler",
  "mintMark",
  "mintage",
  "numistaNumber",
  "material",
  "materialNote",
  "diameter",
  "thickness",
  "bullion",
  "metal",
  "weight",
  "purity",
  "gradingScale",
  "gradeNote",
  "purchasePrice",
  "marketValue",
  "purchaseDate",
  "source",
] as const satisfies ReadonlyArray<keyof ItemFormValues>;

export const hasDetails = (values: ItemFormValues) =>
  detailFields.some((name) => Boolean(values[name]));

/** The scale an Item's Grade is on: the one picked, if it suits the type, or the country's default. */
export function scaleOf({
  type,
  country,
  gradingScale,
}: Pick<ItemFormValues, "type" | "country" | "gradingScale">) {
  return gradingScale && scalesFor(type).includes(gradingScale)
    ? gradingScale
    : defaultScale(type, country);
}

/** A count or catalogue number as typed, with any digit grouping ("12 760 000"). */
export function parseWholeNumber(text: string) {
  const digits = text.replace(/[\s.,']/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

/** A size as typed, with either decimal mark ("38,1" or "38.1"). */
export function parseDecimal(text: string) {
  const value = text.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;
}

/** An existing Item as form values, written the way the person's language writes numbers. */
export function valuesFromItem(
  item: Doc<"items">,
  locale: Locale,
): ItemFormValues {
  const whole = (value?: number) =>
    value === undefined ? "" : formatNumber(value, locale);
  const decimal = (value?: number, maximumFractionDigits = 2) =>
    value === undefined
      ? ""
      : formatNumber(value, locale, {
          useGrouping: false,
          maximumFractionDigits,
        });
  const money = (minor?: number) =>
    minor === undefined
      ? ""
      : formatNumber(minor / 100, locale, {
          useGrouping: false,
          minimumFractionDigits: 2,
        });
  return {
    title: item.title,
    notes: item.notes ?? "",
    type: item.type,
    country:
      item.country && isCountryCode(item.country) ? item.country : undefined,
    grade: item.grade,
    gradingScale: item.gradingScale,
    gradeNote: item.gradeNote ?? "",
    strike: item.strike,
    quantity: String(item.quantity),
    year: item.year === undefined ? "" : String(item.year),
    denomination: item.denomination ?? "",
    series: item.series ?? "",
    category: item.category ?? "",
    ruler: item.ruler ?? "",
    mintMark: item.mintMark ?? "",
    mintage: whole(item.mintage),
    numistaNumber:
      item.numistaNumber === undefined ? "" : String(item.numistaNumber),
    material: item.material,
    materialNote: item.materialNote ?? "",
    diameter: decimal(item.diameter),
    thickness: decimal(item.thickness),
    bullion: item.bullion ?? false,
    metal: item.metal,
    weight: decimal(item.weight, 3),
    purity: decimal(item.purity, 5),
    purchasePrice: money(item.purchasePrice),
    marketValue: money(item.marketValue),
    purchaseDate: item.purchaseDate ?? "",
    source: item.source ?? "",
    albumId: item.albumId,
  };
}

/**
 * What the form sends. Fields the Item type doesn't have are left out, so a
 * coin turned banknote drops its metal; a Grade from another scale is dropped too.
 */
export function argsFromValues(
  values: ItemFormValues,
  locale: Locale,
): ItemArgs {
  const { type } = values;
  const money = (text: string) =>
    text.trim() ? parseMoney(text, locale) ?? undefined : undefined;
  const whole = (text: string) =>
    text.trim() ? parseWholeNumber(text) ?? undefined : undefined;
  const decimal = (text: string) =>
    text.trim() ? parseDecimal(text) ?? undefined : undefined;
  const onlyFor = <T>(field: keyof typeof typeOnlyFields, value: T) =>
    fieldSuits(field, type) ? value : undefined;
  const scale = scaleOf(values);
  const grade =
    values.grade && isGrade(scale, values.grade) ? values.grade : undefined;
  return {
    type,
    title: values.title,
    notes: values.notes,
    country: values.country,
    quantity: Number(values.quantity),
    year: values.year.trim() ? Number(values.year) : undefined,
    denomination: values.denomination,
    series: values.series,
    category: values.category,
    ruler: onlyFor("ruler", values.ruler),
    mintMark: onlyFor("mintMark", values.mintMark),
    mintage: onlyFor("mintage", whole(values.mintage)),
    numistaNumber: onlyFor("numistaNumber", whole(values.numistaNumber)),
    material: onlyFor("material", values.material),
    materialNote: onlyFor("materialNote", values.materialNote),
    diameter: onlyFor("diameter", decimal(values.diameter)),
    thickness: onlyFor("thickness", decimal(values.thickness)),
    // Weight and purity are the metal's: without one they aren't sent.
    bullion: onlyFor("bullion", values.bullion || undefined),
    metal: onlyFor("metal", values.metal),
    weight: onlyFor("weight", values.metal && decimal(values.weight)),
    purity: onlyFor("purity", values.metal && decimal(values.purity)),
    grade,
    gradingScale: grade ? scale : undefined,
    gradeNote: values.gradeNote,
    strike: hasStrike(type) ? values.strike : undefined,
    purchasePrice: money(values.purchasePrice),
    marketValue: money(values.marketValue),
    purchaseDate: values.purchaseDate || undefined,
    source: values.source,
    albumId: values.albumId,
  };
}

/** A preset's figures as the form shows them, in the person's language. */
export function presetValues(
  { metal, weight, purity, country }: BullionPreset,
  locale: Locale,
) {
  const decimal = (value: number) =>
    formatNumber(value, locale, {
      useGrouping: false,
      maximumFractionDigits: 5,
    });
  return {
    metal,
    weight: decimal(weight),
    purity: decimal(purity),
    country,
  } satisfies Partial<ItemFormValues>;
}

/** The bullion preset the form's precious metal and country match, if any. */
export function matchingPreset<P extends BullionPreset>(
  presets: readonly P[],
  values: Pick<ItemFormValues, "metal" | "weight" | "purity" | "country">,
) {
  return presets.find(
    (preset) =>
      preset.metal === values.metal &&
      preset.country === values.country &&
      parseDecimal(values.weight) === preset.weight &&
      parseDecimal(values.purity) === preset.purity,
  );
}
