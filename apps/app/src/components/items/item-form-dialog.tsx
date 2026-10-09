"use client";

import { AlbumPicker } from "@/components/albums/album-picker";
import { useAlbums } from "@/components/albums/use-albums";
import {
  CatalogPickerDialog,
  type PickedCatalogEntry,
} from "@/components/catalog/catalog-picker";
import { useCatalogVisible } from "@/components/catalog/use-catalog-visible";
import {
  ItemLimitNotice,
  isItemLimitError,
  useItemLimitMessage,
} from "@/components/plans/plan-usage";
import { ScanNotice } from "@/components/scanner/scan-notice";
import type { ScanPreset } from "@/components/scanner/scan-preset";
import { submitForm } from "@/lib/submit-form";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import type { CatalogItemType } from "@coinslite/backend/convex/catalog/fields";
import type { CatalogFacts } from "@coinslite/backend/convex/items/catalogFacts";
import { hasStrike, isGrade } from "@coinslite/backend/convex/items/grades";
import {
  type BullionPresetId,
  bullionPresets,
} from "@coinslite/backend/convex/items/preciousMetal";
import {
  fieldSuits,
  itemLimits,
  materials,
} from "@coinslite/backend/convex/items/rules";
import { photoSides } from "@coinslite/backend/convex/photos/rules";
import { metals } from "@coinslite/backend/convex/spotPrices/rates";
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
import { CheckboxField, Field } from "@coinslite/ui/field";
import { IconButton } from "@coinslite/ui/icon-button";
import { Input } from "@coinslite/ui/input";
import type { ItemType } from "@coinslite/ui/item-type-icon";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { MoneyInput } from "@coinslite/ui/money-input";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { Switch } from "@coinslite/ui/switch";
import { toast } from "@coinslite/ui/toaster";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import {
  Award,
  BookOpen,
  ChevronRight,
  Gem,
  Globe,
  Hammer,
  Library,
  Loader2,
  Ruler,
  Sparkles,
  X,
} from "lucide-react";
import type * as React from "react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { useGradeLabels } from "./grade-labels";
import { itemTypeIcons, itemTypes, localToday } from "./item-fields";
import {
  type ItemFormValues,
  blankItem,
  detailFields,
  factValues,
  formArgs,
  hasDetails,
  matchingPreset,
  parseDecimal,
  parseWholeNumber,
  presetValues,
  scaleOf,
  valuesFromItem,
} from "./item-form";

const titleInput =
  "w-full bg-transparent px-0 text-base font-medium placeholder:text-muted-foreground focus:outline-none";
const notesInput =
  "w-full shrink-0 resize-none bg-transparent px-0 text-sm placeholder:text-muted-foreground focus:outline-none";

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
  | "weight"
  | "purity"
  | "gradeNote"
  | "purchaseDate"
  | "source";

/** The Catalog entry an Item is (or is about to be) linked to. */
type LinkedEntry = { key: string; title: string; facts: CatalogFacts };

/** An Item as its page reads it: facts resolved, with the Catalog entry it's linked to. */
export type EditedItem = Doc<"items"> & { catalogEntry?: LinkedEntry | null };

/** The Item types the Catalog holds, so the ones a Catalog picker is offered for. */
const isCatalogType = (type: ItemType): type is CatalogItemType =>
  type === "coin" || type === "banknote";

/**
 * The one form for an Item's every field: "New Item" in a compact dialog, or
 * "Edit Item" when given an `item`. Basic fields stay in view; the rest sit
 * under "More details", which opens by itself when it holds values or errors.
 *
 * Coins and banknotes are added from the Catalog by default (spec 5.4): each
 * opening starts on the Catalog picker; "Add manually" leads to typing the
 * facts in, and Esc closes the dialog. A picked entry fills the facts; the
 * Item stays linked to it and stores only the facts the person changes
 * (ADR 0001).
 *
 * After a coin scan the form opens filled with the scanner's suggestion,
 * marked as such, and the scan's photos become the new Item's when it's added.
 *
 * Duplicating (spec 5.5) opens the new Item's form filled in from `copyOf`,
 * linked to the same Catalog entry, without its photos; nothing is added
 * until the person saves.
 */
export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  copyOf,
  onAdded,
  newItemType,
  scan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The Item being edited; without one the dialog adds a new Item. */
  item?: EditedItem;
  /** For a new Item: an existing Item it starts as a copy of. */
  copyOf?: EditedItem;
  /** For a new Item: called with it once it's added. */
  onAdded?: (itemId: Id<"items">) => void;
  /** For a new Item: the Item type already chosen each time the dialog opens. */
  newItemType?: ItemType;
  /** For a new Item: a coin scan's photos and suggestion, applied each time it changes. */
  scan?: ScanPreset;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const mod = useModifierKey();
  const convex = useConvex();
  const addItem = useMutation(api.items.add);
  const updateItem = useMutation(api.items.update);
  const attachPhoto = useAction(api.photos.attach);
  const user = useQuery(api.users.getUser);
  const currency = user?.homeCurrency ?? "";
  const titleRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const labels = useGradeLabels();
  // Only while open: the "New Item" dialog is mounted on every page.
  const albums = useAlbums(open);
  // One object for the dialog's life: the form resets when it sees new defaults.
  const [defaults] = useState(() => {
    const from = item ?? copyOf;
    return from ? valuesFromItem(from, locale) : blankItem();
  });
  const catalogVisible = useCatalogVisible();
  const [linked, setLinked] = useState<LinkedEntry | undefined>(
    (item ?? copyOf)?.catalogEntry ?? undefined,
  );
  // The entry's facts as the form writes them, to tell which ones the person changed.
  const fromEntry = useMemo(
    () => linked && factValues(linked.facts, locale),
    [linked, locale],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  // Whether the picker is where adding started, so closing it closes the
  // dialog, rather than one opened from the form's Catalog pill.
  const pickerFirst = useRef(false);
  /** Opens the Catalog picker; `first` when adding starts on it. */
  const openPicker = (first: boolean) => {
    pickerFirst.current = first;
    setPickerOpen(true);
  };
  const [createMore, setCreateMore] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(() =>
    hasDetails(defaults, fromEntry),
  );
  const [failed, setFailed] = useState<string>();
  // The scan this new Item comes from, until it's added or the form closes.
  const [scanned, setScanned] = useState<ScanPreset>();
  const itemLimitMessage = useItemLimitMessage();

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
  const metalOptions = metals.map((metal) => ({
    value: metal,
    label: t(`items.materials.${metal}`),
  }));
  const presetOptions = bullionPresets.map(({ id }) => ({
    value: id,
    label: t(`preciousMetal.presets.${id}`),
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
      // A copy of a linked Item, made while the Catalog is hidden, becomes
      // the person's own: only an existing link stays.
      const link = item || catalogVisible !== false ? linked : undefined;
      const args = formArgs(value, link && fromEntry, locale);
      // An Album deleted since the form opened can't take the Item.
      if (albums && !albums.some((album) => album._id === args.albumId))
        args.albumId = undefined;
      let added: Id<"items"> | undefined;
      try {
        if (item) await updateItem({ itemId: item._id, ...args });
        else
          added = await addItem({
            ...args,
            ...(link && { catalogEntryKey: link.key }),
          });
      } catch (failure) {
        setFailed(
          isItemLimitError(failure)
            ? itemLimitMessage
            : t(item ? "items.errors.saveFailed" : "items.errors.failed"),
        );
        return;
      }
      toast.success(t(item ? "items.saved" : "items.added"));
      if (added && scanned) {
        const photos = scanned.photos;
        setScanned(undefined);
        await attachScanPhotos(added, photos);
      }
      if (added) onAdded?.(added);
      if (item || copyOf) {
        onOpenChange(false);
        return;
      }
      form.reset();
      setDetailsOpen(false);
      setLinked(undefined);
      if (createMore) {
        // "Create more" keeps the pills for the next Item, and starts it
        // on the Catalog picker like the first.
        form.setFieldValue("type", value.type);
        form.setFieldValue("country", value.country);
        form.setFieldValue("albumId", value.albumId);
        if (catalogVisible && isCatalogType(value.type)) openPicker(true);
        else titleRef.current?.focus();
      } else {
        onOpenChange(false);
      }
    },
  });
  // With exactly one Album, a new Item goes into it unless the person picks otherwise.
  const onlyAlbum =
    !item && !copyOf && albums?.length === 1 ? albums[0]?._id : undefined;
  useEffect(() => {
    if (
      open &&
      onlyAlbum &&
      form.getFieldValue("albumId") === undefined &&
      !form.getFieldMeta("albumId")?.isTouched
    )
      form.setFieldValue("albumId", onlyAlbum, { dontUpdateMeta: true });
  }, [open, onlyAlbum, form]);
  // Before the first paint, so the type pill never shows the previous type.
  useLayoutEffect(() => {
    if (open && newItemType && !item)
      form.setFieldValue("type", newItemType, { dontUpdateMeta: true });
  }, [open, newItemType, item, form]);
  // Each opening for a coin or banknote starts on the Catalog picker, unless
  // the form already holds something.
  const pickerOffered = useRef(false);
  useEffect(() => {
    if (!open) {
      pickerOffered.current = false;
      setPickerOpen(false);
      return;
    }
    if (pickerOffered.current || item || catalogVisible === undefined) return;
    pickerOffered.current = true;
    if (copyOf) return;
    if (
      !scan &&
      catalogVisible &&
      !linked &&
      !form.state.isDirty &&
      isCatalogType(newItemType ?? form.getFieldValue("type"))
    ) {
      pickerFirst.current = true;
      setPickerOpen(true);
    }
  }, [open, item, copyOf, catalogVisible, linked, newItemType, form, scan]);
  /** Links the form to a picked Catalog entry and fills the facts from it. */
  const pickEntry = async (picked: PickedCatalogEntry) => {
    setPickerOpen(false);
    setFailed(undefined);
    await linkEntry(picked.key);
  };
  /** Links the form to the Catalog entry with this key and fills the facts from it; false when it can't. */
  const linkEntry = async (key: string) => {
    const entry = await convex
      .query(api.items.catalogEntry, { key })
      .catch(() => null);
    if (!entry) {
      setFailed(t("catalogPicker.failed"));
      return false;
    }
    const title = form.getFieldValue("title").trim();
    if (!title || title === linked?.title)
      form.setFieldValue("title", entry.title);
    setLinked({ key: entry.key, title: entry.title, facts: entry.facts });
    const facts = factValues(entry.facts, locale);
    form.setFieldValue("type", entry.itemType);
    form.setFieldValue("country", facts.country);
    form.setFieldValue("year", facts.year);
    form.setFieldValue("denomination", facts.denomination);
    form.setFieldValue("series", facts.series);
    form.setFieldValue("material", facts.material);
    form.setFieldValue("strike", facts.strike);
    form.setFieldValue("diameter", facts.diameter);
    form.setFieldValue("numistaNumber", facts.numistaNumber);
    form.setFieldValue("metal", facts.metal);
    form.setFieldValue("weight", facts.weight);
    form.setFieldValue("purity", facts.purity);
    return true;
  };

  /** Fills the form with a scan's suggestion: its Catalog entry, else the facts read. */
  const applySuggestion = async (
    suggestion: NonNullable<ScanPreset["suggestion"]>,
  ) => {
    const { facts } = suggestion;
    form.setFieldValue("type", "coin");
    const linkedToEntry =
      suggestion.entry !== undefined && (await linkEntry(suggestion.entry.key));
    if (!linkedToEntry) form.setFieldValue("title", suggestion.title);
    const values = factValues(facts, locale);
    if (facts.year !== undefined) form.setFieldValue("year", values.year);
    if (!linkedToEntry) {
      form.setFieldValue("country", values.country);
      form.setFieldValue("denomination", values.denomination);
      form.setFieldValue("series", values.series);
      form.setFieldValue("material", values.material);
      form.setFieldValue("diameter", values.diameter);
      form.setFieldValue("mintMark", facts.mintMark ?? "");
      form.setFieldValue("ruler", facts.ruler ?? "");
    }
    // The suggested details are there to check.
    setDetailsOpen(true);
  };
  // A new scan starts the form afresh with its suggestion.
  const appliedScan = useRef<ScanPreset | undefined>(undefined);
  useLayoutEffect(() => {
    if (!open || item || !scan || appliedScan.current === scan) return;
    appliedScan.current = scan;
    form.reset();
    setLinked(undefined);
    setFailed(undefined);
    setDetailsOpen(false);
    setScanned(scan);
    if (scan.suggestion) void applySuggestion(scan.suggestion);
  });
  // A scan the person closes the form on isn't kept for the next Item.
  useEffect(() => {
    if (open || !scanned) return;
    setScanned(undefined);
    setLinked(undefined);
    form.reset();
  }, [open, scanned, form]);
  /** Puts a scan's photos on the Item it became; tells the person if that fails. */
  const attachScanPhotos = async (
    itemId: Id<"items">,
    photos: ScanPreset["photos"],
  ) => {
    try {
      for (const side of photoSides) {
        const photo = photos[side];
        if (photo)
          await attachPhoto({ itemId, side, storageId: photo.storageId });
      }
    } catch {
      toast.error(t("scanner.photosFailed"));
    }
  };
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
  // A linked Item's cleared country or metal is its Catalog entry's.
  const scale = scaleOf({
    ...values,
    country: values.country ?? fromEntry?.country,
  });
  const isCoin = values.type === "coin";
  const metal =
    form.useStore((state) => state.values.metal) ?? fromEntry?.metal;
  const preset = form.useStore(
    (state) => matchingPreset(bullionPresets, state.values)?.id,
  );
  /** Fills the precious metal and country from a bullion coin, and the title when it's empty. */
  const applyPreset = (id: BullionPresetId) => {
    const chosen = bullionPresets.find((preset) => preset.id === id);
    if (!chosen) return;
    const filled = presetValues(chosen, locale);
    form.setFieldValue("metal", filled.metal);
    form.setFieldValue("weight", filled.weight);
    form.setFieldValue("purity", filled.purity);
    form.setFieldValue("country", filled.country);
    form.setFieldValue("bullion", true);
    if (!form.getFieldValue("title").trim())
      form.setFieldValue("title", t(`preciousMetal.presets.${id}`));
  };
  const errorOf = (errors: unknown[]) =>
    submitted
      ? errors.filter((error) => typeof error === "string").join(" ") ||
        undefined
      : undefined;

  /** A Catalog entry's fact as the form writes it, shown where the person cleared it. */
  const entryText = (name: TextField) => {
    const fact = fromEntry?.[name as keyof typeof fromEntry];
    return typeof fact === "string" ? fact : undefined;
  };
  /** The placeholder of a fact's pill: the entry's value, else `fallback`. */
  const entryLabel = (label: string | undefined, fallback: string) =>
    label ?? fallback;
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
      disabled?: boolean;
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
              placeholder={entryText(name) || options.placeholder}
              maxLength={options.maxLength}
              disabled={options.disabled}
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
                {t(
                  item
                    ? "items.editItem"
                    : copyOf
                      ? "items.duplicateTitle"
                      : "items.new",
                )}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <IconButton type="button" label={t("items.close")} shortcut="Esc">
                <X />
              </IconButton>
            </DialogClose>
          </DialogHeader>
          {copyOf ? (
            <DialogDescription className="px-4 text-xs text-muted-foreground">
              {t("items.duplicateDescription", { title: copyOf.title })}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {t(item ? "items.editDescription" : "items.newDescription")}
            </DialogDescription>
          )}

          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-3 pt-1">
            {!item && <ItemLimitNotice />}
            {!item && scanned && <ScanNotice scan={scanned} />}
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
              {linked ? (
                <CatalogEntryPill
                  title={linked.title}
                  label={t("catalogPicker.entry")}
                  onClick={item ? undefined : () => openPicker(false)}
                />
              ) : (
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
              )}
              {!item &&
                !linked &&
                catalogVisible &&
                isCatalogType(values.type) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    aria-label={`${t("catalogPicker.entry")}: ${t("catalogPicker.pick")}`}
                    onClick={() => openPicker(false)}
                  >
                    <BookOpen strokeWidth={1.75} aria-hidden="true" />
                    {t("catalogPicker.pick")}
                  </Button>
                )}
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
                    placeholder={entryLabel(
                      fromEntry?.country &&
                        formatCountry(fromEntry.country, locale),
                      t("items.setCountry"),
                    )}
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
                      placeholder={entryLabel(
                        fromEntry?.strike && labels.strike(fromEntry.strike),
                        t("items.setStrike"),
                      )}
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
                {linked && (
                  <p className="text-xs text-muted-foreground">
                    {t("catalogPicker.factsHint")}
                  </p>
                )}
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
                              placeholder={entryLabel(
                                fromEntry?.material &&
                                  t(`items.materials.${fromEntry.material}`),
                                t("items.setMaterial"),
                              )}
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
                {isCoin && (
                  <DetailGroup title={t("preciousMetal.title")}>
                    <Field
                      id={`${baseId}-preset`}
                      label={t("preciousMetal.preset")}
                      hint={t("preciousMetal.presetHint")}
                      className="sm:col-span-2"
                    >
                      {(control) => (
                        <PropertyPicker
                          id={control.id}
                          aria-describedby={control["aria-describedby"]}
                          icon={Sparkles}
                          label={t("preciousMetal.preset")}
                          placeholder={t("preciousMetal.presetPlaceholder")}
                          value={preset}
                          options={presetOptions}
                          onChange={applyPreset}
                          noResults={t("items.noMatches")}
                        />
                      )}
                    </Field>
                    <form.Field name="metal">
                      {(field) => (
                        <Field
                          id={`${baseId}-metal`}
                          label={t("preciousMetal.metal")}
                        >
                          {(control) => (
                            <PropertyPicker
                              id={control.id}
                              icon={Gem}
                              label={t("preciousMetal.metal")}
                              placeholder={entryLabel(
                                fromEntry?.metal &&
                                  t(`items.materials.${fromEntry.metal}`),
                                t("preciousMetal.setMetal"),
                              )}
                              value={field.state.value}
                              options={metalOptions}
                              onChange={field.handleChange}
                              onClear={() => {
                                // Weight and purity are the metal's.
                                field.handleChange(undefined);
                                form.setFieldValue("weight", "");
                                form.setFieldValue("purity", "");
                              }}
                              clearLabel={t("preciousMetal.noMetal")}
                              noResults={t("items.noMatches")}
                            />
                          )}
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="bullion">
                      {(field) => (
                        <CheckboxField
                          id={`${baseId}-bullion`}
                          label={t("preciousMetal.bullionLabel")}
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                          className="sm:self-end sm:pb-1"
                        />
                      )}
                    </form.Field>
                    {textField("weight", t("preciousMetal.weight"), {
                      rule: rules.weight,
                      hint: metal
                        ? t("preciousMetal.weightHint")
                        : t("preciousMetal.chooseMetalFirst"),
                      inputMode: "decimal",
                      disabled: !metal,
                    })}
                    {textField("purity", t("preciousMetal.purity"), {
                      rule: rules.purity,
                      hint: metal
                        ? t("preciousMetal.purityHint")
                        : t("preciousMetal.chooseMetalFirst"),
                      inputMode: "decimal",
                      disabled: !metal,
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
            {item || copyOf ? (
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
      {/* Beside the form's content, not in it, so keys pressed in the picker
          (Cmd/Ctrl+Enter) never reach the form. */}
      {!item && (
        <CatalogPickerDialog
          open={pickerOpen}
          // Esc closes the picker, as its hint says: when adding started
          // on it, that's the whole dialog, not a way into the form.
          onOpenChange={(next) => {
            setPickerOpen(next);
            if (!next && pickerFirst.current) onOpenChange(false);
          }}
          itemType={isCatalogType(values.type) ? values.type : "coin"}
          onPick={(entry) => void pickEntry(entry)}
          onManual={() => {
            // The facts stay, as the person's own.
            setLinked(undefined);
            setPickerOpen(false);
          }}
          // Several entries added at once: nothing is left to fill in here.
          onAdded={() => {
            setPickerOpen(false);
            onOpenChange(false);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            titleRef.current?.focus();
          }}
        />
      )}
    </Dialog>
  );
}

/**
 * The Catalog entry a new Item is linked to, in place of the Item type pill
 * (the entry decides the type); clicking it picks another. Not a button on
 * an existing Item, whose link stays.
 */
function CatalogEntryPill({
  title,
  label,
  onClick,
}: {
  title: string;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <BookOpen strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">{title}</span>
    </>
  );
  if (!onClick) {
    return (
      <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md bg-muted px-2 text-[13px] font-medium [&_svg]:size-4 [&_svg]:shrink-0">
        <span className="sr-only">{label}: </span>
        {content}
      </span>
    );
  }
  return (
    <Button
      type="button"
      variant="subtle"
      size="xs"
      aria-label={`${label}: ${title}`}
      className="max-w-full justify-start"
      onClick={onClick}
    >
      {content}
    </Button>
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
