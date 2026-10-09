"use client";

import { AlbumPicker } from "@/components/albums/album-picker";
import { useAlbums } from "@/components/albums/use-albums";
import { submitForm } from "@/lib/submit-form";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { hasStrike, isGrade } from "@coinslite/backend/convex/items/grades";
import {
  fieldSuits,
  itemLimits,
  materials,
} from "@coinslite/backend/convex/items/rules";
import { countryCodes, formatCountry, parseMoney } from "@coinslite/i18n";
import { Button } from "@coinslite/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coinslite/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { Field } from "@coinslite/ui/field";
import { Input } from "@coinslite/ui/input";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { MoneyInput } from "@coinslite/ui/money-input";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { Switch } from "@coinslite/ui/switch";
import { toast } from "@coinslite/ui/toaster";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  ChevronRight,
  Gem,
  Globe,
  Hammer,
  Library,
  Loader2,
  Ruler,
  X,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useGradeLabels } from "./grade-labels";
import { itemTypeIcons, itemTypes, localToday } from "./item-fields";
import {
  type ItemFormValues,
  argsFromValues,
  blankItem,
  detailFields,
  hasDetails,
  parseDecimal,
  parseWholeNumber,
  scaleOf,
  valuesFromItem,
} from "./item-form";

const titleInput =
  "w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none";
const notesInput =
  "w-full resize-none bg-transparent px-0 text-sm placeholder:text-muted-foreground focus:outline-none";

/** Fields typed as plain text in "More details". */
type TextField =
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
  | "gradeNote"
  | "purchaseDate"
  | "source";

/**
 * The one form for an Item's every field: "New Item" in a compact dialog, or
 * "Edit Item" when given an `item`. Basic fields stay in view; the rest sit
 * under "More details", which opens by itself when it holds values or errors.
 */
export function ItemFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The Item being edited; without one the dialog adds a new Item. */
  item?: Doc<"items">;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const mod = useModifierKey();
  const addItem = useMutation(api.items.add);
  const updateItem = useMutation(api.items.update);
  const user = useQuery(api.users.getUser);
  const currency = user?.homeCurrency ?? "";
  const titleRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const labels = useGradeLabels();
  // Only while open: the "New Item" dialog is mounted on every page.
  const albums = useAlbums(open);
  // One object for the dialog's life: the form resets when it sees new defaults.
  const [defaults] = useState(() =>
    item ? valuesFromItem(item, locale) : blankItem(),
  );
  const [createMore, setCreateMore] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(() => hasDetails(defaults));
  const [failed, setFailed] = useState<string>();

  const rules = useMemo(() => {
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
      purchaseDate: z
        .string()
        .refine(
          (date) => !date || date <= localToday(),
          t("items.errors.date"),
        ),
    };
  }, [t, locale]);

  const countryOptions = useMemo(
    () =>
      countryCodes
        .map((code) => ({ value: code, label: formatCountry(code, locale) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [locale],
  );
  const typeOptions = itemTypes.map((type) => {
    const Icon = itemTypeIcons[type];
    return {
      value: type,
      label: t(`items.types.${type}`),
      icon: <Icon strokeWidth={1.75} />,
    };
  });
  const materialOptions = materials.map((material) => ({
    value: material,
    label: t(`items.materials.${material}`),
  }));

  const form = useForm({
    defaultValues: defaults,
    validatorAdapter: zodValidator(),
    onSubmitInvalid: ({ formApi }) => {
      if (
        detailFields.some((name) => formApi.getFieldMeta(name)?.errors.length)
      )
        setDetailsOpen(true);
    },
    onSubmit: async ({ value }) => {
      setFailed(undefined);
      const args = argsFromValues(value, locale);
      // An Album deleted since the form opened can't take the Item.
      if (albums && !albums.some((album) => album._id === args.albumId))
        args.albumId = undefined;
      try {
        if (item) await updateItem({ itemId: item._id, ...args });
        else await addItem(args);
      } catch {
        setFailed(t(item ? "items.errors.saveFailed" : "items.errors.failed"));
        return;
      }
      toast.success(t(item ? "items.saved" : "items.added"));
      if (item) {
        onOpenChange(false);
        return;
      }
      form.reset();
      setDetailsOpen(false);
      if (createMore) {
        // "Create more" keeps the pills for the next Item.
        form.setFieldValue("type", value.type);
        form.setFieldValue("country", value.country);
        form.setFieldValue("albumId", value.albumId);
        titleRef.current?.focus();
      } else {
        onOpenChange(false);
      }
    },
  });
  // With exactly one Album, a new Item goes into it unless the person picks otherwise.
  const onlyAlbum = !item && albums?.length === 1 ? albums[0]?._id : undefined;
  useEffect(() => {
    if (
      open &&
      onlyAlbum &&
      form.getFieldValue("albumId") === undefined &&
      !form.getFieldMeta("albumId")?.isTouched
    )
      form.setFieldValue("albumId", onlyAlbum, { dontUpdateMeta: true });
  }, [open, onlyAlbum, form]);
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  const isDirty = form.useStore((state) => state.isDirty);
  // A new deployment waits while an Item is half entered.
  useUnsavedInput(open && isDirty);
  const values = form.useStore(
    ({ values: { type, country, gradingScale, strike } }) => ({
      type,
      country,
      gradingScale,
      strike,
    }),
  );
  const scale = scaleOf(values);
  const isCoin = values.type === "coin";
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;

  const textField = (
    name: TextField,
    label: string,
    options: {
      rule?: z.ZodType<string>;
      hint?: string;
      placeholder?: string;
      maxLength?: number;
      inputMode?: "numeric" | "decimal";
      type?: "date";
      max?: string;
    } = {},
  ) => (
    <form.Field
      name={name}
      validators={options.rule ? { onChange: options.rule } : undefined}
    >
      {(field) => (
        <Field
          id={`${baseId}-${name}`}
          label={label}
          hint={options.hint}
          error={errorOf(field.state.meta.errors)}
        >
          {(control) => (
            <Input
              {...control}
              type={options.type}
              max={options.max}
              inputMode={options.inputMode}
              placeholder={options.placeholder}
              maxLength={options.maxLength}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </Field>
      )}
    </form.Field>
  );
  const moneyField = (name: "purchasePrice" | "marketValue", label: string) => (
    <form.Field name={name} validators={{ onChange: rules.money }}>
      {(field) => (
        <Field
          id={`${baseId}-${name}`}
          label={label}
          hint={t("items.perPiece")}
          error={errorOf(field.state.meta.errors)}
        >
          {(control) => (
            <MoneyInput
              {...control}
              currency={currency}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
          )}
        </Field>
      )}
    </form.Field>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submitForm(form);
          }
        }}
      >
        <form
          method="post"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitForm(form);
          }}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader>
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <Library
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{t("nav.collection")}</span>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <DialogTitle className="text-foreground">
                {t(item ? "items.editItem" : "items.new")}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t("items.close")}
              >
                <X />
              </Button>
            </DialogClose>
          </DialogHeader>
          <DialogDescription className="sr-only">
            {t("items.emptyDescription")}
          </DialogDescription>

          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-3 pt-1">
            <form.Field name="title" validators={{ onChange: rules.title }}>
              {(field) => {
                const error = errorOf(field.state.meta.errors);
                return (
                  <div className="flex flex-col gap-1">
                    <input
                      ref={titleRef}
                      aria-label={t("items.title")}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={
                        error ? `${baseId}-title-error` : undefined
                      }
                      placeholder={t("items.titlePlaceholder")}
                      className={titleInput}
                      maxLength={itemLimits.title}
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                    />
                    {error && (
                      <p
                        id={`${baseId}-title-error`}
                        className="text-xs text-destructive"
                      >
                        {error}
                      </p>
                    )}
                  </div>
                );
              }}
            </form.Field>
            <form.Field name="notes">
              {(field) => (
                <textarea
                  aria-label={t("items.notes")}
                  rows={2}
                  placeholder={t("items.notesPlaceholder")}
                  className={notesInput}
                  maxLength={itemLimits.notes}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </form.Field>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <form.Field name="type">
                {(field) => (
                  <PropertyPicker
                    icon={itemTypeIcons[field.state.value]}
                    label={t("items.type")}
                    value={field.state.value}
                    options={typeOptions}
                    onChange={field.handleChange}
                    noResults={t("items.noMatches")}
                  />
                )}
              </form.Field>
              <form.Field name="albumId">
                {(field) => (
                  <AlbumPicker
                    value={field.state.value}
                    onChange={field.handleChange}
                    onCreateFailed={setFailed}
                  />
                )}
              </form.Field>
              <form.Field name="country">
                {(field) => (
                  <PropertyPicker
                    icon={Globe}
                    label={t("items.country")}
                    placeholder={t("items.setCountry")}
                    value={field.state.value}
                    options={countryOptions}
                    onChange={field.handleChange}
                    onClear={() => field.handleChange(undefined)}
                    clearLabel={t("account.contact.noCountry")}
                    noResults={t("items.noMatches")}
                  />
                )}
              </form.Field>
              <form.Field name="grade">
                {(field) => (
                  <PropertyPicker
                    icon={Award}
                    label={t("items.grade")}
                    placeholder={t("items.setGrade")}
                    value={
                      field.state.value && isGrade(scale, field.state.value)
                        ? field.state.value
                        : undefined
                    }
                    options={labels.gradeOptions(scale, values.strike)}
                    onChange={field.handleChange}
                    onClear={() => field.handleChange(undefined)}
                    clearLabel={t("items.noGrade")}
                    noResults={t("items.noMatches")}
                  />
                )}
              </form.Field>
              {hasStrike(values.type) && (
                <form.Field name="strike">
                  {(field) => (
                    <PropertyPicker
                      icon={Hammer}
                      label={t("items.strike")}
                      placeholder={t("items.setStrike")}
                      value={field.state.value}
                      options={labels.strikeOptions()}
                      onChange={field.handleChange}
                      onClear={() => field.handleChange(undefined)}
                      clearLabel={t("items.noStrike")}
                      noResults={t("items.noMatches")}
                    />
                  )}
                </form.Field>
              )}
              <form.Field
                name="quantity"
                validators={{ onChange: rules.quantity }}
              >
                {(field) => (
                  <label className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground">
                    {t("items.quantity")}
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={itemLimits.quantity}
                      aria-invalid={
                        errorOf(field.state.meta.errors) ? true : undefined
                      }
                      className="h-7 w-16 px-2 text-right text-[13px]"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                    />
                  </label>
                )}
              </form.Field>
            </div>
            <form.Subscribe
              selector={(state) => state.fieldMeta.quantity?.errors}
            >
              {(errors) =>
                errors && errorOf(errors) ? (
                  <p className="text-xs text-destructive">{errorOf(errors)}</p>
                ) : null
              }
            </form.Subscribe>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="group flex h-7 items-center gap-1 rounded-md text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronRight
                  className="size-3.5 transition-transform duration-150 group-data-[state=open]:rotate-90"
                  aria-hidden="true"
                />
                {t("items.moreDetails")}
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-5 pb-1 pt-3">
                <DetailGroup title={t("items.description")}>
                  {textField("year", t("items.year"), {
                    rule: rules.year,
                    inputMode: "numeric",
                  })}
                  {textField("denomination", t("items.denomination"), {
                    maxLength: itemLimits.denomination,
                  })}
                  {textField("series", t("items.series"), {
                    maxLength: itemLimits.series,
                  })}
                  {textField("category", t("items.category"), {
                    maxLength: itemLimits.category,
                  })}
                  {fieldSuits("ruler", values.type) &&
                    textField("ruler", t("items.ruler"), {
                      maxLength: itemLimits.ruler,
                    })}
                  {fieldSuits("mintMark", values.type) &&
                    textField("mintMark", t("items.mintMark"), {
                      maxLength: itemLimits.mintMark,
                    })}
                  {fieldSuits("mintage", values.type) &&
                    textField("mintage", t("items.mintage"), {
                      rule: rules.whole,
                      inputMode: "numeric",
                    })}
                  {fieldSuits("numistaNumber", values.type) &&
                    textField("numistaNumber", t("items.numistaNumber"), {
                      rule: rules.whole,
                      inputMode: "numeric",
                    })}
                </DetailGroup>
                {isCoin && (
                  <DetailGroup title={t("items.physical")}>
                    <form.Field name="material">
                      {(field) => (
                        <Field
                          id={`${baseId}-material`}
                          label={t("items.material")}
                        >
                          {(control) => (
                            <PropertyPicker
                              id={control.id}
                              icon={Gem}
                              label={t("items.material")}
                              placeholder={t("items.setMaterial")}
                              value={field.state.value}
                              options={materialOptions}
                              onChange={field.handleChange}
                              onClear={() => field.handleChange(undefined)}
                              clearLabel={t("items.noMaterial")}
                              noResults={t("items.noMatches")}
                            />
                          )}
                        </Field>
                      )}
                    </form.Field>
                    {textField("materialNote", t("items.materialNote"), {
                      placeholder: t("items.materialNotePlaceholder"),
                      maxLength: itemLimits.materialNote,
                    })}
                    {textField("diameter", t("items.diameter"), {
                      rule: rules.size,
                      hint: t("items.millimetres"),
                      inputMode: "decimal",
                    })}
                    {textField("thickness", t("items.thickness"), {
                      rule: rules.size,
                      hint: t("items.millimetres"),
                      inputMode: "decimal",
                    })}
                  </DetailGroup>
                )}
                <DetailGroup title={t("items.grade")}>
                  <form.Field name="gradingScale">
                    {(field) => (
                      <Field
                        id={`${baseId}-scale`}
                        label={t("items.gradingScale")}
                      >
                        {(control) => (
                          <PropertyPicker
                            id={control.id}
                            icon={Ruler}
                            label={t("items.gradingScale")}
                            value={scale}
                            options={labels.scaleOptions(values.type)}
                            onChange={field.handleChange}
                            noResults={t("items.noMatches")}
                          />
                        )}
                      </Field>
                    )}
                  </form.Field>
                  {textField("gradeNote", t("items.gradeNote"), {
                    placeholder: t("items.gradeNotePlaceholder"),
                    maxLength: itemLimits.gradeNote,
                  })}
                </DetailGroup>
                <DetailGroup title={t("items.purchase")}>
                  {moneyField("purchasePrice", t("items.purchasePrice"))}
                  {moneyField("marketValue", t("items.marketValue"))}
                  {textField("purchaseDate", t("items.purchaseDate"), {
                    rule: rules.purchaseDate,
                    type: "date",
                    max: localToday(),
                  })}
                  {textField("source", t("items.source"), {
                    placeholder: t("items.sourcePlaceholder"),
                    maxLength: itemLimits.source,
                  })}
                </DetailGroup>
              </CollapsibleContent>
            </Collapsible>
            {failed && (
              <p role="alert" className="text-xs text-destructive">
                {failed}
              </p>
            )}
          </div>

          <DialogFooter>
            {item ? (
              <span />
            ) : (
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Switch checked={createMore} onCheckedChange={setCreateMore} />
                {t("items.createMore")}
              </label>
            )}
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t("items.cancel")}
                </Button>
              </DialogClose>
              {/* Not a submit button: Enter in a field or picker never saves the
                  dialog; the button and Cmd/Ctrl+Enter do (linear-style-ui keyboard rules). */}
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void submitForm(form)}
              >
                {submitting && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {t(item ? "items.save" : "items.add")}
                {mod && (
                  <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
                    {mod}↵
                  </Kbd>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A titled block of fields under "More details". */
function DetailGroup({
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
