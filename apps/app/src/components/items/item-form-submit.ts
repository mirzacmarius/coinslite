import type { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { catalogFactNames } from "@coinslite/backend/convex/items/catalogFacts";
import type { CatalogFacts } from "@coinslite/backend/convex/items/catalogFacts";
import { hasStrike, isGrade } from "@coinslite/backend/convex/items/grades";
import {
  fieldSuits,
  itemLimits,
  type typeOnlyFields,
} from "@coinslite/backend/convex/items/rules";
import { type HomeCurrency, type Locale, parseMoney } from "@coinslite/i18n";
import type { FunctionArgs } from "convex/server";
import { z } from "zod";
import { localToday } from "./item-fields";
import {
  type FactValues,
  type ItemFormValues,
  factValues,
  parseDecimal,
  parseWholeNumber,
  sameFact,
  scaleOf,
} from "./item-form";

/** What adding an Item sends (items.ts). */
export type ItemArgs = FunctionArgs<typeof api.items.add>;

/** The Catalog entry an Item is (or is about to be) linked to. */
export type LinkedEntry = { key: string; title: string; facts: CatalogFacts };

/** The messages the Item form's rules show, by translation key. */
type RuleMessage =
  | "items.errors.titleRequired"
  | "items.errors.quantity"
  | "items.errors.year"
  | "items.errors.amount"
  | "items.errors.wholeNumber"
  | "items.errors.number"
  | "items.errors.date"
  | "preciousMetal.errors.weight"
  | "preciousMetal.errors.purity";

/**
 * What the Item form's fields accept, as typed in the person's language, each
 * rule with the message `t` gives its translation key. Optional fields accept
 * nothing at all.
 */
export function itemFormRules(t: (key: RuleMessage) => string, locale: Locale) {
  const optional = (check: (text: string) => boolean, message: string) =>
    z.string().refine((text) => !text.trim() || check(text), message);
  return {
    title: z
      .string()
      .trim()
      .min(1, t("items.errors.titleRequired"))
      .max(itemLimits.title),
    quantity: z
      .string()
      .refine(
        (text) =>
          /^\d+$/.test(text.trim()) &&
          Number(text) >= 1 &&
          Number(text) <= itemLimits.quantity,
        t("items.errors.quantity"),
      ),
    year: optional(
      (text) => /^-?\d{1,4}$/.test(text.trim()),
      t("items.errors.year"),
    ),
    money: optional(
      (text) => parseMoney(text, locale) !== null,
      t("items.errors.amount"),
    ),
    whole: optional(
      (text) => (parseWholeNumber(text) ?? 0) >= 1,
      t("items.errors.wholeNumber"),
    ),
    size: optional(
      (text) => (parseDecimal(text) ?? 0) > 0,
      t("items.errors.number"),
    ),
    weight: optional((text) => {
      const grams = parseDecimal(text) ?? 0;
      return grams > 0 && grams <= itemLimits.weight;
    }, t("preciousMetal.errors.weight")),
    purity: optional((text) => {
      const purity = parseDecimal(text) ?? 0;
      return purity > 0 && purity <= itemLimits.purity;
    }, t("preciousMetal.errors.purity")),
    purchaseDate: z
      .string()
      .refine((date) => !date || date <= localToday(), t("items.errors.date")),
  };
}

/** The Item form's rules, one per kind of field. */
export type ItemFormRules = ReturnType<typeof itemFormRules>;

/**
 * What a form linked to a Catalog entry sends: only the facts the person
 * changed. A fact left as the entry has it, or cleared, isn't sent, so the
 * Item keeps following the entry (ADR 0001).
 */
export function changedFactsOnly(
  args: ItemArgs,
  values: ItemFormValues,
  fromEntry: FactValues,
): ItemArgs {
  const changed = { ...args };
  for (const name of catalogFactNames) {
    if (sameFact(values[name], fromEntry[name])) changed[name] = undefined;
  }
  return changed;
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
    // A grader's or catalogue's name is typed only for "other".
    grader: onlyFor("grader", values.grader),
    graderName: onlyFor(
      "graderName",
      values.grader === "other" ? values.graderName : undefined,
    ),
    certificateNumber: onlyFor("certificateNumber", values.certificateNumber),
    stampCatalogue: onlyFor("stampCatalogue", values.stampCatalogue),
    stampCatalogueName: onlyFor(
      "stampCatalogueName",
      values.stampCatalogue === "other" ? values.stampCatalogueName : undefined,
    ),
    stampCatalogueNumber: onlyFor(
      "stampCatalogueNumber",
      values.stampCatalogueNumber,
    ),
    perforation: onlyFor("perforation", values.perforation),
    watermark: onlyFor("watermark", values.watermark),
    colour: onlyFor("colour", values.colour),
    serialNumber: onlyFor("serialNumber", values.serialNumber),
    signatures: onlyFor("signatures", values.signatures),
    printer: onlyFor("printer", values.printer),
    purchasePrice: money(values.purchasePrice),
    marketValue: money(values.marketValue),
    purchaseDate: values.purchaseDate || undefined,
    source: values.source,
    albumId: values.albumId,
  };
}

/**
 * What the form sends for its values: everything, or for a form linked to a
 * Catalog entry (`fromEntry`), only the facts that differ from the entry's.
 * A linked Item's cleared country or metal is the entry's again.
 */
export function formArgs(
  values: ItemFormValues,
  fromEntry: FactValues | undefined,
  locale: Locale,
): ItemArgs {
  if (!fromEntry) return argsFromValues(values, locale);
  return changedFactsOnly(
    argsFromValues(
      {
        ...values,
        country: values.country ?? fromEntry.country,
        metal: values.metal ?? fromEntry.metal,
      },
      locale,
    ),
    values,
    fromEntry,
  );
}

/** What saving the Item form calls: `add` for a new Item, `update` for one being edited. */
export type ItemSave =
  | { mutation: "add"; args: ItemArgs }
  | { mutation: "update"; args: FunctionArgs<typeof api.items.update> };

/**
 * What saving the Item form does with its values: the mutation it calls and
 * its arguments, and whether that clears a want.
 *
 * - `itemId`: the Item being edited; without one a new Item is added.
 * - `linked`: the Catalog entry the form is linked to. The Item stores only
 *   the facts changed from it (`formArgs`). A copy of a linked Item, made
 *   while the Catalog is hidden (`catalogVisible` false), becomes the
 *   person's own: only an existing link stays.
 * - `albumIds`: the person's Albums, once loaded. An Album deleted since the
 *   form opened can't take the Item.
 * - `wantedKeys`: the wanted Catalog entries. Adding from one clears the want
 *   (wants.ts), which `wanted` says.
 * - `amountsIn`: the Home currency the amounts were typed in (COIN-125).
 */
export function itemSave({
  values,
  itemId,
  linked,
  catalogVisible,
  albumIds,
  wantedKeys,
  amountsIn,
  locale,
}: {
  values: ItemFormValues;
  itemId?: Id<"items">;
  linked: LinkedEntry | undefined;
  catalogVisible: boolean | undefined;
  albumIds: readonly string[] | undefined;
  wantedKeys: ReadonlySet<string> | undefined;
  amountsIn: HomeCurrency | undefined;
  locale: Locale;
}): { save: ItemSave; wanted: boolean } {
  const link = itemId || catalogVisible !== false ? linked : undefined;
  const args = formArgs(values, link && factValues(link.facts, locale), locale);
  if (albumIds && !albumIds.some((albumId) => albumId === args.albumId))
    args.albumId = undefined;
  if (itemId)
    return {
      save: { mutation: "update", args: { itemId, ...args, amountsIn } },
      wanted: false,
    };
  return {
    save: {
      mutation: "add",
      args: { ...args, ...(link && { catalogEntryKey: link.key }), amountsIn },
    },
    wanted: link !== undefined && wantedKeys?.has(link.key) === true,
  };
}
