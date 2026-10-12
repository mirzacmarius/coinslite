"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { Field } from "@coinslite/ui/field";
import { Input } from "@coinslite/ui/input";
import { MoneyInput } from "@coinslite/ui/money-input";
import type * as React from "react";
import { createContext, useContext, useId, useMemo } from "react";
import { type FactValues, scaleOf } from "./item-form";
import { type ItemFormRules, itemFormRules } from "./item-form-submit";
import type { ItemForm } from "./use-item-form";

/** What every field of the Item form reads. */
type ItemFields = {
  form: ItemForm;
  /** Prefixes the fields' ids. */
  baseId: string;
  /** The linked Catalog entry's facts as the form writes them. */
  fromEntry: FactValues | undefined;
  rules: ItemFormRules;
  /** A field's errors to show: none until the person first tries to save. */
  errorOf: (errors: unknown[]) => string | undefined;
};

const ItemFieldsContext = createContext<ItemFields | null>(null);

/** The Item form's fields, for the sections inside `ItemFieldsProvider`. */
export function useItemFields() {
  const fields = useContext(ItemFieldsContext);
  if (!fields) throw new Error("useItemFields outside ItemFieldsProvider");
  return fields;
}

/** Gives the Item form's sections its form, rules and the linked entry's facts. */
export function ItemFieldsProvider({
  form,
  fromEntry,
  children,
}: {
  form: ItemForm;
  fromEntry: FactValues | undefined;
  children: React.ReactNode;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const baseId = useId();
  const rules = useMemo(
    () => itemFormRules((key) => t(key), locale),
    [t, locale],
  );
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;
  return (
    <ItemFieldsContext.Provider
      value={{ form, baseId, fromEntry, rules, errorOf }}
    >
      {children}
    </ItemFieldsContext.Provider>
  );
}

/**
 * What the form holds that decides which fields show: the Item type, the
 * picked strike, grader and stamp catalogue, and the scale its Grade is on.
 * A linked Item's cleared country is its Catalog entry's.
 */
export function useItemKind() {
  const { form, fromEntry } = useItemFields();
  const values = form.useStore(
    ({
      values: { type, country, gradingScale, strike, grader, stampCatalogue },
    }) => ({
      type,
      country,
      gradingScale,
      strike,
      grader,
      stampCatalogue,
    }),
  );
  const scale = scaleOf({
    ...values,
    country: values.country ?? fromEntry?.country,
  });
  return { ...values, scale };
}

/** Fields typed as plain text in "More details". */
export type TextFieldName =
  | "year"
  | "denomination"
  | "series"
  | "category"
  | "ruler"
  | "mintMark"
  | "mintage"
  | "numistaNumber"
  | "materialNote"
  | "diameter"
  | "thickness"
  | "weight"
  | "purity"
  | "gradeNote"
  | "graderName"
  | "certificateNumber"
  | "stampCatalogueName"
  | "stampCatalogueNumber"
  | "perforation"
  | "watermark"
  | "colour"
  | "serialNumber"
  | "signatures"
  | "printer"
  | "purchaseDate"
  | "source";

/**
 * A labelled text field of the Item form. A linked Item shows its Catalog
 * entry's fact where the person cleared it.
 */
export function TextField({
  name,
  label,
  rule,
  hint,
  placeholder,
  maxLength,
  inputMode,
  type,
  max,
  disabled,
}: {
  name: TextFieldName;
  label: string;
  /** The rule that checks it, if any (item-form-submit.ts). */
  rule?: Exclude<keyof ItemFormRules, "title" | "quantity" | "money">;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "numeric" | "decimal";
  type?: "date";
  max?: string;
  disabled?: boolean;
}) {
  const { form, baseId, fromEntry, rules, errorOf } = useItemFields();
  const fact = fromEntry?.[name as keyof FactValues];
  const entryText = typeof fact === "string" ? fact : undefined;
  return (
    <form.Field
      name={name}
      validators={rule ? { onChange: rules[rule] } : undefined}
    >
      {(field) => (
        <Field
          id={`${baseId}-${name}`}
          label={label}
          hint={hint}
          error={errorOf(field.state.meta.errors)}
        >
          {(control) => (
            <Input
              {...control}
              type={type}
              max={max}
              inputMode={inputMode}
              placeholder={entryText || placeholder}
              maxLength={maxLength}
              disabled={disabled}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </Field>
      )}
    </form.Field>
  );
}

/** An amount per piece, in the currency amounts are typed in. */
export function MoneyField({
  name,
  label,
  currency,
  locked,
}: {
  name: "purchasePrice" | "marketValue";
  label: string;
  currency: string;
  /** Why amounts can't be typed now (a Home currency change), if so. */
  locked: string | undefined;
}) {
  const t = useI18n();
  const { form, baseId, rules, errorOf } = useItemFields();
  return (
    <form.Field name={name} validators={{ onChange: rules.money }}>
      {(field) => (
        <Field
          id={`${baseId}-${name}`}
          label={label}
          hint={locked ?? t("items.perPiece")}
          error={errorOf(field.state.meta.errors)}
        >
          {(control) => (
            <MoneyInput
              {...control}
              currency={currency}
              disabled={locked !== undefined}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </Field>
      )}
    </form.Field>
  );
}

/** A titled block of fields under "More details". */
export function DetailGroup({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}
