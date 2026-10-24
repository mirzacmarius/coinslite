import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import type {
  CatalogFactName,
  CatalogFacts,
} from "@coinslite/backend/convex/items/catalogFacts";
import {
  type GradingScale,
  type Strike,
  defaultScale,
  scalesFor,
} from "@coinslite/backend/convex/items/grades";
import type { BullionPreset } from "@coinslite/backend/convex/items/preciousMetal";
import type {
  Grader,
  StampCatalogue,
} from "@coinslite/backend/convex/items/references";
import type { Material } from "@coinslite/backend/convex/items/rules";
import type { Metal } from "@coinslite/backend/convex/spotPrices/rates";
import {
  type CountryCode,
  type HomeCurrency,
  type Locale,
  formatNumber,
  isCountryCode,
} from "@coinslite/i18n";
import type { ItemType } from "@coinslite/ui/item-type-icon";
import type {
  DeepKeys,
  DeepValue,
  UpdateMetaOptions,
  Updater,
} from "@tanstack/react-form";

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
  grader: Grader | undefined;
  graderName: string;
  certificateNumber: string;
  stampCatalogue: StampCatalogue | undefined;
  stampCatalogueName: string;
  stampCatalogueNumber: string;
  perforation: string;
  watermark: string;
  colour: string;
  serialNumber: string;
  signatures: string;
  printer: string;
  /** Typed in `purchaseCurrency`, or the Home currency without one. */
  purchasePrice: string;
  /**
   * The currency the Purchase price was paid in, when not the Home currency:
   * it's converted at the ECB rates of the purchase date (paid-in-currency.ts).
   */
  purchaseCurrency: HomeCurrency | undefined;
  marketValue: string;
  purchaseDate: string;
  source: string;
  /** Kept in: where the Item is. */
  storage: string;
  tags: string[];
  albumId: Id<"albums"> | undefined;
};

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
  grader: undefined,
  graderName: "",
  certificateNumber: "",
  stampCatalogue: undefined,
  stampCatalogueName: "",
  stampCatalogueNumber: "",
  perforation: "",
  watermark: "",
  colour: "",
  serialNumber: "",
  signatures: "",
  printer: "",
  purchasePrice: "",
  purchaseCurrency: undefined,
  marketValue: "",
  purchaseDate: "",
  source: "",
  storage: "",
  tags: [],
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
  "grader",
  "graderName",
  "certificateNumber",
  "stampCatalogue",
  "stampCatalogueName",
  "stampCatalogueNumber",
  "perforation",
  "watermark",
  "colour",
  "serialNumber",
  "signatures",
  "printer",
  "purchasePrice",
  "marketValue",
  "purchaseDate",
  "source",
  "storage",
] as const satisfies ReadonlyArray<keyof ItemFormValues>;

/** Whether a fact as typed says the same as the Catalog entry's. */
export const sameFact = (typed: unknown, fromEntry: unknown) => {
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : (value ?? "");
  return text(typed) === text(fromEntry);
};

/** Whether "More details" holds anything; with a Catalog entry, anything besides the entry's own facts. */
export const hasDetails = (
  values: ItemFormValues,
  fromEntry?: Partial<ItemFormValues>,
) =>
  detailFields.some(
    (name) =>
      Boolean(values[name]) &&
      !(
        fromEntry &&
        name in fromEntry &&
        sameFact(values[name], fromEntry[name])
      ),
  );

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

/** How the form writes numbers in the person's language. */
function numberText(locale: Locale) {
  return {
    whole: (value?: number) =>
      value === undefined ? "" : formatNumber(value, locale),
    decimal: (value?: number, maximumFractionDigits = 2) =>
      value === undefined
        ? ""
        : formatNumber(value, locale, {
            useGrouping: false,
            maximumFractionDigits,
          }),
  };
}

/** The form fields a Catalog entry can fill (items/catalogFacts.ts). */
export type FactValues = Pick<ItemFormValues, CatalogFactName>;

/**
 * Descriptive facts as form values: an Item's own, or a Catalog entry's.
 * Both are written the same way, so the form can tell which ones the person
 * changed.
 */
export function factValues(facts: CatalogFacts, locale: Locale): FactValues {
  const { whole, decimal } = numberText(locale);
  return {
    country:
      facts.country && isCountryCode(facts.country) ? facts.country : undefined,
    year: facts.year === undefined ? "" : String(facts.year),
    denomination: facts.denomination ?? "",
    series: facts.series ?? "",
    material: facts.material,
    strike: facts.strike,
    diameter: decimal(facts.diameter),
    thickness: decimal(facts.thickness),
    mintMark: facts.mintMark ?? "",
    mintage: whole(facts.mintage),
    numistaNumber:
      facts.numistaNumber === undefined ? "" : String(facts.numistaNumber),
    metal: facts.metal,
    weight: decimal(facts.weight, 3),
    purity: decimal(facts.purity, 5),
  };
}

/** An existing Item as form values, written the way the person's language writes numbers. */
export function valuesFromItem(
  item: Doc<"items">,
  locale: Locale,
): ItemFormValues {
  const money = (minor?: number) =>
    minor === undefined
      ? ""
      : formatNumber(minor / 100, locale, {
          useGrouping: false,
          minimumFractionDigits: 2,
        });
  return {
    ...factValues(item, locale),
    title: item.title,
    notes: item.notes ?? "",
    type: item.type,
    grade: item.grade,
    gradingScale: item.gradingScale,
    gradeNote: item.gradeNote ?? "",
    quantity: String(item.quantity),
    category: item.category ?? "",
    ruler: item.ruler ?? "",
    materialNote: item.materialNote ?? "",
    bullion: item.bullion ?? false,
    grader: item.grader,
    graderName: item.graderName ?? "",
    certificateNumber: item.certificateNumber ?? "",
    stampCatalogue: item.stampCatalogue,
    stampCatalogueName: item.stampCatalogueName ?? "",
    stampCatalogueNumber: item.stampCatalogueNumber ?? "",
    perforation: item.perforation ?? "",
    watermark: item.watermark ?? "",
    colour: item.colour ?? "",
    serialNumber: item.serialNumber ?? "",
    signatures: item.signatures ?? "",
    printer: item.printer ?? "",
    // Bought in another currency: as paid, in that currency.
    purchasePrice: money(item.purchasePaid?.amount ?? item.purchasePrice),
    purchaseCurrency: item.purchasePaid?.currency,
    marketValue: money(item.marketValue),
    purchaseDate: item.purchaseDate ?? "",
    source: item.source ?? "",
    storage: item.storage ?? "",
    tags: item.tags ?? [],
    albumId: item.albumId,
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

/** The parts of the Item form that filling it uses. */
type FillableForm = {
  getFieldMeta: (name: keyof ItemFormValues) => object | undefined;
  setFieldValue: <Name extends DeepKeys<ItemFormValues>>(
    name: Name,
    value: Updater<DeepValue<ItemFormValues, Name>>,
    options?: UpdateMetaOptions,
  ) => void;
};

/**
 * Writes values the app supplies (a Catalog entry's facts, a scan's
 * suggestion, a bullion preset) into the Item form.
 *
 * A field that hasn't shown yet, such as one under a closed "More details",
 * gets only its value: TanStack would otherwise give it a partial state that
 * makes validating the form throw once the field shows (MUS-734). A field
 * that has shown is written as if typed, so it counts as unsaved input.
 */
export function fillForm(form: FillableForm, values: Partial<ItemFormValues>) {
  for (const name of Object.keys(values) as (keyof ItemFormValues)[]) {
    const value = values[name] as ItemFormValues[typeof name];
    form.setFieldValue(name, value, {
      dontUpdateMeta: form.getFieldMeta(name) === undefined,
    });
  }
}

/**
 * Writes values filled in for the person into the Item form: a preset Item
 * type, the only Album, the pills "Create more" carries over. Only their
 * values: they count neither as a change nor as a draft to keep.
 */
export function prefillForm(
  form: FillableForm,
  values: Partial<ItemFormValues>,
) {
  for (const name of Object.keys(values) as (keyof ItemFormValues)[]) {
    const value = values[name] as ItemFormValues[typeof name];
    form.setFieldValue(name, value, {
      dontUpdateMeta: true,
      dontValidate: true,
    });
  }
}
