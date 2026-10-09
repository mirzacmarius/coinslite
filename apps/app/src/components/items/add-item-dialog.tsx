"use client";

import { submitForm } from "@/lib/submit-form";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type GradingScale,
  type Strike,
  defaultScale,
  hasStrike,
  isGrade,
  scalesFor,
} from "@coinslite/backend/convex/items/grades";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
import {
  type CountryCode,
  countryCodes,
  formatCountry,
  parseMoney,
} from "@coinslite/i18n";
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
import type { ItemType } from "@coinslite/ui/item-type-icon";
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
  Globe,
  Hammer,
  Library,
  Loader2,
  Ruler,
  X,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useGradeLabels } from "./grade-labels";
import { itemTypeIcons, itemTypes, localToday } from "./item-fields";

const titleInput =
  "w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none";
const notesInput =
  "w-full resize-none bg-transparent px-0 text-sm placeholder:text-muted-foreground focus:outline-none";

type Values = {
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
  purchasePrice: string;
  marketValue: string;
  purchaseDate: string;
  source: string;
};

const blank = (): Values => ({
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
  purchasePrice: "",
  marketValue: "",
  purchaseDate: "",
  source: "",
});

/** The scale an Item's Grade is on: the one picked, if it suits the type, or the country's default. */
function scaleOf({
  type,
  country,
  gradingScale,
}: Pick<Values, "type" | "country" | "gradingScale">) {
  return gradingScale && scalesFor(type).includes(gradingScale)
    ? gradingScale
    : defaultScale(type, country);
}

/** The fields in "More details": they open by themselves when one needs fixing. */
const detailFields = [
  "year",
  "denomination",
  "purchasePrice",
  "marketValue",
  "purchaseDate",
  "source",
] as const;

/** "New Item": a compact dialog for adding a manually described Item to the Collection. */
export function AddItemDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const mod = useModifierKey();
  const addItem = useMutation(api.items.add);
  const user = useQuery(api.users.getUser);
  const currency = user?.homeCurrency ?? "";
  const titleRef = useRef<HTMLInputElement>(null);
  const ids = {
    year: useId(),
    denomination: useId(),
    price: useId(),
    value: useId(),
    date: useId(),
    source: useId(),
    scale: useId(),
    gradeNote: useId(),
  };
  const labels = useGradeLabels();
  const [createMore, setCreateMore] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [failed, setFailed] = useState<string>();
  // One object for the dialog's life: the form resets when it sees new defaults.
  const [defaults] = useState(blank);

  const rules = useMemo(() => {
    const money = z
      .string()
      .refine(
        (text) => !text.trim() || parseMoney(text, locale) !== null,
        t("items.errors.amount"),
      );
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
      year: z
        .string()
        .refine(
          (text) => !text.trim() || /^-?\d{1,4}$/.test(text.trim()),
          t("items.errors.year"),
        ),
      money,
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
      const amount = (text: string) =>
        text.trim() ? parseMoney(text, locale) ?? undefined : undefined;
      const scale = scaleOf(value);
      // A Grade picked on another scale (before the type or country changed) is dropped.
      const grade =
        value.grade && isGrade(scale, value.grade) ? value.grade : undefined;
      try {
        await addItem({
          type: value.type,
          title: value.title,
          notes: value.notes,
          country: value.country,
          quantity: Number(value.quantity),
          year: value.year.trim() ? Number(value.year) : undefined,
          denomination: value.denomination,
          grade,
          gradingScale: grade ? scale : undefined,
          gradeNote: value.gradeNote,
          strike: hasStrike(value.type) ? value.strike : undefined,
          purchasePrice: amount(value.purchasePrice),
          marketValue: amount(value.marketValue),
          purchaseDate: value.purchaseDate || undefined,
          source: value.source,
        });
      } catch {
        setFailed(t("items.errors.failed"));
        return;
      }
      toast.success(t("items.added"));
      form.reset();
      if (createMore) {
        // "Create more" keeps the pills for the next Item.
        form.setFieldValue("type", value.type);
        form.setFieldValue("country", value.country);
      }
      setDetailsOpen(false);
      if (createMore) titleRef.current?.focus();
      else onOpenChange(false);
    },
  });
  const submitted = form.useStore((state) => state.submissionAttempts > 0);
  const submitting = form.useStore((state) => state.isSubmitting);
  const isDirty = form.useStore((state) => state.isDirty);
  const values = form.useStore(
    ({ values: { type, country, gradingScale, strike } }) => ({
      type,
      country,
      gradingScale,
      strike,
    }),
  );
  const scale = scaleOf(values);
  // A new deployment waits while an Item is half entered.
  useUnsavedInput(open && isDirty);
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;

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
                {t("items.new")}
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
                        error ? "add-item-title-error" : undefined
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
                        id="add-item-title-error"
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
              <form.Field name="country">
                {(field) => (
                  <PropertyPicker
                    icon={Globe}
                    label={t("items.country")}
                    placeholder={t("items.setCountry")}
                    value={field.state.value}
                    options={countryOptions}
                    onChange={field.handleChange}
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
              <CollapsibleContent className="grid grid-cols-1 gap-x-4 gap-y-3 pb-1 pt-3 sm:grid-cols-2">
                <form.Field name="gradingScale">
                  {(field) => (
                    <Field id={ids.scale} label={t("items.gradingScale")}>
                      {(control) => (
                        <PropertyPicker
                          id={control.id}
                          aria-describedby={control["aria-describedby"]}
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
                <form.Field name="gradeNote">
                  {(field) => (
                    <Field id={ids.gradeNote} label={t("items.gradeNote")}>
                      {(control) => (
                        <Input
                          {...control}
                          placeholder={t("items.gradeNotePlaceholder")}
                          maxLength={itemLimits.gradeNote}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                        />
                      )}
                    </Field>
                  )}
                </form.Field>
                <form.Field name="year" validators={{ onChange: rules.year }}>
                  {(field) => (
                    <Field
                      id={ids.year}
                      label={t("items.year")}
                      error={errorOf(field.state.meta.errors)}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          inputMode="numeric"
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </Field>
                  )}
                </form.Field>
                <form.Field name="denomination">
                  {(field) => (
                    <Field
                      id={ids.denomination}
                      label={t("items.denomination")}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          maxLength={itemLimits.denomination}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                        />
                      )}
                    </Field>
                  )}
                </form.Field>
                <form.Field
                  name="purchasePrice"
                  validators={{ onChange: rules.money }}
                >
                  {(field) => (
                    <Field
                      id={ids.price}
                      label={t("items.purchasePrice")}
                      hint={t("items.perPiece")}
                      error={errorOf(field.state.meta.errors)}
                    >
                      {(control) => (
                        <MoneyInput
                          {...control}
                          currency={currency}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </Field>
                  )}
                </form.Field>
                <form.Field
                  name="marketValue"
                  validators={{ onChange: rules.money }}
                >
                  {(field) => (
                    <Field
                      id={ids.value}
                      label={t("items.marketValue")}
                      hint={t("items.perPiece")}
                      error={errorOf(field.state.meta.errors)}
                    >
                      {(control) => (
                        <MoneyInput
                          {...control}
                          currency={currency}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </Field>
                  )}
                </form.Field>
                <form.Field
                  name="purchaseDate"
                  validators={{ onChange: rules.purchaseDate }}
                >
                  {(field) => (
                    <Field
                      id={ids.date}
                      label={t("items.purchaseDate")}
                      error={errorOf(field.state.meta.errors)}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          type="date"
                          max={localToday()}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          onBlur={field.handleBlur}
                        />
                      )}
                    </Field>
                  )}
                </form.Field>
                <form.Field name="source">
                  {(field) => (
                    <Field id={ids.source} label={t("items.source")}>
                      {(control) => (
                        <Input
                          {...control}
                          placeholder={t("items.sourcePlaceholder")}
                          maxLength={itemLimits.source}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                        />
                      )}
                    </Field>
                  )}
                </form.Field>
              </CollapsibleContent>
            </Collapsible>
            {failed && (
              <p role="alert" className="text-xs text-destructive">
                {failed}
              </p>
            )}
          </div>

          <DialogFooter>
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Switch checked={createMore} onCheckedChange={setCreateMore} />
              {t("items.createMore")}
            </label>
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
                {t("items.add")}
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
