"use client";

import { useAmountsCurrency } from "@/components/account/home-currency-change";
import { useAlbums } from "@/components/albums/use-albums";
import type { PickedCatalogEntry } from "@/components/catalog/catalog-picker";
import { useCatalogVisible } from "@/components/catalog/use-catalog-visible";
import {
  isItemLimitError,
  useItemLimitMessage,
} from "@/components/plans/plan-usage";
import type { ScanPreset } from "@/components/scanner/scan-preset";
import { useWantedKeys } from "@/components/wantlist/wantlist";
import { formChanged } from "@/lib/discard-changes";
import { submitForm } from "@/lib/submit-form";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import { samePaid } from "@coinslite/backend/convex/exchangeRates/rules";
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { photoSides } from "@coinslite/backend/convex/photos/rules";
import { toast } from "@coinslite/ui/toaster";
import { useForm, useSelector } from "@tanstack/react-form";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  blankItem,
  factValues,
  fillForm,
  hasDetails,
  prefillForm,
  valuesFromItem,
} from "./item-form";
import {
  type LinkedEntry,
  itemFormRules,
  atRates,
  itemSave,
  refusedDetails,
} from "./item-form-submit";
import {
  type StoredPurchase,
  usePaidCheck,
  usePaidFailure,
} from "./paid-in-currency";

/** An Item as its page reads it: facts resolved, with the Catalog entry it's linked to. */
type EditedItem = Doc<"items"> & { catalogEntry?: LinkedEntry | null };

/** The Item form's state and saving, as `useItemForm` gives them. */
export type ItemFormState = ReturnType<typeof useItemForm>;

/** The Item form's TanStack form. */
export type ItemForm = ItemFormState["form"];

/** What the Item form is given: the New Item page (new-item.tsx), the Duplicate dialog (item-form-dialog.tsx), or the Edit Item page (item-edit.tsx). */
export type ItemFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The Item being edited, on its page; without one a new Item is added. */
  item?: EditedItem;
  /** For a new Item: an existing Item it starts as a copy of. */
  copyOf?: EditedItem;
  /** For a new Item: called with it once it's added. */
  onAdded?: (itemId: Id<"items">) => void;
  /** For a new Item: a scan's Item type, photos and suggestion, applied each time it changes. */
  scan?: ScanPreset;
};

/**
 * The Item form's state and saving, for new-item.tsx, item-form-dialog.tsx and the Edit
 * Item page (item-edit.tsx) to lay out: its values and the Catalog entry
 * they're linked to, the Catalog picker (the form's "Pick from the Catalog"
 * and Catalog pill open it), a scan's suggestion and photos, the Album
 * a new Item goes into, and what happens after saving ("Create more" starts
 * the next Item).
 */
export function useItemForm({
  open,
  onOpenChange,
  item,
  copyOf,
  onAdded,
  scan,
}: ItemFormProps) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const convex = useConvex();
  const addItem = useMutation(api.items.add);
  const updateItem = useMutation(api.items.update);
  const attachPhoto = useAction(api.photos.attach);
  const home = useQuery(api.users.getUser)?.homeCurrency;
  const amounts = useAmountsCurrency(open);
  const checkPaid = usePaidCheck();
  const paidFailure = usePaidFailure();
  const titleRef = useRef<HTMLInputElement>(null);
  // Only while open: the Duplicate dialog is mounted with its Item's page,
  // also while the session ends, when these would fail signed out.
  const albums = useAlbums(open);
  const wantedKeys = useWantedKeys(open);
  // One object for the dialog's life: the form resets when it sees new defaults.
  const [defaults] = useState(() => {
    const from = item ?? copyOf;
    return from ? valuesFromItem(from, locale) : blankItem();
  });
  // Adding an Item from scratch, not editing one or starting from a copy.
  const isNew = !item && !copyOf;
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
  const [createMore, setCreateMore] = useState(false);
  // The Edit Item page shows every field.
  const [detailsOpen, setDetailsOpen] = useState(
    () => item !== undefined || hasDetails(defaults, fromEntry),
  );
  const [failed, setFailed] = useState<string>();
  // The scan this new Item comes from, until it's added or the form closes.
  const [scanned, setScanned] = useState<ScanPreset>();
  const itemLimitMessage = useItemLimitMessage();
  const rules = useMemo(
    () => itemFormRules((key) => t(key), locale),
    [t, locale],
  );
  // Where a submit came from that waits for "More details" to open.
  const [submitWhenOpen, setSubmitWhenOpen] = useState<Element>();

  const form = useForm({
    defaultValues: defaults,
    onSubmit: async ({ value }) => {
      setFailed(undefined);
      const { save, wanted } = itemSave({
        values: value,
        itemId: item?._id,
        linked,
        storedLinkKey: item?.catalogEntry?.key,
        catalogVisible,
        albumIds: albums?.map((album) => album._id),
        // A sold Item linked to a wanted entry leaves it on the Wantlist.
        wantedKeys: item?.soldOn === undefined ? wantedKeys : undefined,
        amountsIn: amounts.amountsIn,
        locale,
      });
      // A purchase in another currency kept as it is isn't converted again.
      const paid = save.args.purchasePaid ?? undefined;
      const keptPaid =
        paid !== undefined &&
        item !== undefined &&
        samePaid(paid, item.purchasePaid) &&
        (value.purchaseDate.trim() || undefined) === item.purchaseDate;
      const { problem, rateDay } = keptPaid
        ? {}
        : await checkPaid(paid, amounts.amountsIn);
      if (problem) {
        setFailed(problem);
        return;
      }
      let added: Id<"items"> | undefined;
      try {
        if (save.mutation === "update")
          await updateItem(atRates(save.args, rateDay));
        else added = await addItem(atRates(save.args, rateDay));
      } catch (failure) {
        const code = failure instanceof ConvexError ? failure.data : undefined;
        setFailed(
          isItemLimitError(failure)
            ? itemLimitMessage
            : (paidFailure(code, amounts.amountsIn) ??
                (code === homeCurrencyErrors.changing
                  ? t("homeCurrency.moneyBusy")
                  : code === homeCurrencyErrors.otherCurrency && home
                    ? t("homeCurrency.changedWhileOpen", { currency: home })
                    : t(
                        item
                          ? "items.errors.saveFailed"
                          : "items.errors.failed",
                      ))),
        );
        return;
      }
      // The only Album, filed into without being picked: say so, so the
      // Item doesn't land there unnoticed.
      const preselected =
        isNew &&
        onlyAlbum !== undefined &&
        value.albumId === onlyAlbum &&
        // Submitting marks every field touched; only a pick makes it dirty.
        !form.getFieldMeta("albumId")?.isDirty;
      const filedInto = preselected
        ? albums?.find(({ _id }) => _id === onlyAlbum)
        : undefined;
      toast.success(
        item
          ? t("items.saved")
          : filedInto
            ? t("items.addedToAlbum", { album: filedInto.name })
            : t("items.added"),
        { description: wanted ? t("wantlist.cleared") : undefined },
      );
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
      clearForm();
      if (createMore) {
        // "Create more" keeps the pills for the next Item, filled in for the
        // person, and starts it on its title, like the first.
        prefillForm(form, {
          type: value.type,
          country: value.country,
          albumId: value.albumId,
        });
        titleRef.current?.focus();
      } else {
        onOpenChange(false);
      }
    },
  });
  // With exactly one Album, a new Item goes into it unless the person picks otherwise.
  const onlyAlbum = isNew && albums?.length === 1 ? albums[0]?._id : undefined;
  /** Empties a new Item's form: what was typed and picked, a scan, an error. */
  const clearForm = () => {
    form.reset();
    setLinked(undefined);
    setScanned(undefined);
    setFailed(undefined);
    setDetailsOpen(false);
  };
  useEffect(() => {
    if (
      open &&
      onlyAlbum &&
      form.getFieldValue("albumId") === undefined &&
      !form.getFieldMeta("albumId")?.isTouched
    )
      prefillForm(form, { albumId: onlyAlbum });
  }, [open, onlyAlbum, form]);
  // Closing the dialog closes the Catalog picker too: each opening starts
  // on the form, and the picker opens from it.
  useEffect(() => {
    if (!open) setPickerOpen(false);
  }, [open]);
  /** Links the form to a picked Catalog entry and fills the facts from it. */
  const pickEntry = async (picked: PickedCatalogEntry) => {
    setPickerOpen(false);
    setFailed(undefined);
    await linkEntry(picked.key);
  };
  /**
   * Links the form to the Catalog entry with this key and fills the facts
   * from it; false when it can't. The entry's title replaces the person's
   * own only with `takeTitle`, as when picked for what they were typing.
   */
  const linkEntry = async (key: string, takeTitle = false) => {
    const entry = await convex
      .query(api.items.catalogEntry, { key })
      .catch(() => null);
    if (!entry) {
      setFailed(t("catalogPicker.failed"));
      return false;
    }
    const title = form.getFieldValue("title").trim();
    if (takeTitle || !title || title === linked?.title)
      fillForm(form, { title: entry.title });
    setLinked({ key: entry.key, title: entry.title, facts: entry.facts });
    const values: Partial<ReturnType<typeof factValues>> = factValues(
      entry.facts,
      locale,
    );
    // Facts few entries hold, and the year an entry for several years leaves
    // to the person: when the entry has nothing to put there, what the
    // person typed stays, as their own. What the entry linked before held
    // goes with it.
    for (const name of ["year", "mintMark", "mintage", "thickness"] as const)
      if (
        entry.facts[name] === undefined &&
        form.getFieldValue(name) !== fromEntry?.[name]
      )
        delete values[name];
    fillForm(form, { type: entry.itemType, ...values });
    return true;
  };

  /**
   * Fills the form with a scan's suggestion: its Item type, its Catalog
   * entry, else the facts read, and the Grade the photos show, on its scale.
   * What no entry says goes in before the entry is looked up, so that what
   * the person picks or types meanwhile isn't written over.
   */
  const applySuggestion = async (
    suggestion: NonNullable<ScanPreset["suggestion"]>,
  ) => {
    const { facts, grade } = suggestion;
    fillForm(form, {
      type: suggestion.itemType,
      // What only this banknote shows, entry or not.
      serialNumber: facts.serialNumber ?? "",
      signatures: facts.signatures ?? "",
      // On its own scale: the form's may be another until the country is in.
      ...(grade && { grade: grade.value, gradingScale: grade.scale }),
    });
    // The suggested details are there to check.
    setDetailsOpen(true);
    const typedYear = form.getFieldValue("year");
    const linkedToEntry =
      suggestion.entry !== undefined && (await linkEntry(suggestion.entry.key));
    if (!linkedToEntry) fillForm(form, { title: suggestion.title });
    const values = factValues(facts, locale);
    if (facts.year !== undefined && form.getFieldValue("year") === typedYear)
      fillForm(form, { year: values.year });
    if (!linkedToEntry)
      fillForm(form, {
        country: values.country,
        denomination: values.denomination,
        series: values.series,
        material: values.material,
        diameter: values.diameter,
        mintMark: facts.mintMark ?? "",
        ruler: facts.ruler ?? "",
        printer: facts.printer ?? "",
      });
  };
  // A new scan starts the form afresh, as the Item type scanned, with its
  // suggestion. Before the first paint, so the type never shows another.
  const appliedScan = useRef<ScanPreset | undefined>(undefined);
  useLayoutEffect(() => {
    if (!open || item || !scan || appliedScan.current === scan) return;
    appliedScan.current = scan;
    clearForm();
    prefillForm(form, { type: scan.itemType });
    setScanned(scan);
    if (scan.suggestion) void applySuggestion(scan.suggestion);
  });
  /** Puts a scan's photos on the Item it became; tells the person if that fails. */
  const attachScanPhotos = async (
    itemId: Id<"items">,
    photos: ScanPreset["photos"],
  ) => {
    try {
      for (const side of photoSides) {
        const photo = photos[side];
        if (photo)
          await attachPhoto({
            itemId,
            side,
            storageId: photo.storageId,
            thumbnailId: photo.thumbnailId,
          });
      }
    } catch {
      toast.error(t("scanner.photosFailed"));
    }
  };
  /**
   * Validates and saves. A closed "More details" has no fields to check:
   * when one of them holds what its rule refuses, it opens first, and the
   * submit runs once its fields show, so they say what's wrong.
   */
  const submit = (from: Element) => {
    if (!detailsOpen && refusedDetails(form.state.values, rules).length > 0) {
      setDetailsOpen(true);
      setSubmitWhenOpen(from);
      return;
    }
    void submitForm(form, t("common.saveFailed"), from);
  };
  // After the render that opened "More details": its fields have mounted.
  useEffect(() => {
    if (!submitWhenOpen) return;
    setSubmitWhenOpen(undefined);
    void submitForm(form, t("common.saveFailed"), submitWhenOpen);
  }, [submitWhenOpen, form, t]);
  const submitting = useSelector(form.store, (state) => state.isSubmitting);
  // A scan's photos are input too: closing the form drops them.
  const changed =
    useSelector(form.store, (state) => formChanged(state, defaults)) ||
    scanned !== undefined;

  return {
    form,
    /** Editing an existing Item, on its page, rather than adding one. */
    editing: item !== undefined,
    /** The title field, which has the focus whenever a new Item's form starts. */
    titleRef,
    linked,
    /** The linked entry's facts as the form writes them. */
    fromEntry,
    /** The currency amounts are typed in, and why they can't be, if so. */
    amounts,
    /** The edited Item's purchase as stored, which the Purchase price's hint goes by. */
    storedPurchase: item satisfies StoredPurchase | undefined,
    /** What went wrong saving, linking or creating an Album, to show. */
    failed,
    setFailed,
    detailsOpen,
    setDetailsOpen,
    createMore,
    setCreateMore,
    scanned,
    /** Unsaved input, for the "Discard changes?" prompt. */
    changed,
    submitting,
    /** The rules the fields check what they hold with (item-form-submit.ts). */
    rules,
    /** Validates and saves; `from` is where the submit came from (lib/submit-form.ts). */
    submit,
    /** Links a Catalog entry found for the title being typed, title and all. */
    pickTitleMatch: (key: string) => {
      setFailed(undefined);
      void linkEntry(key, true);
    },
    /** Opens the Catalog picker from the form, to link an entry or another one. */
    openPicker: () => setPickerOpen(true),

    /** The Catalog picker's props (catalog-picker.tsx). */
    picker: {
      open: pickerOpen,
      onOpenChange: setPickerOpen,
      onPick: (entry: PickedCatalogEntry) => void pickEntry(entry),
      // An edited Item can be linked to another entry, not unlinked, and
      // its picker adds nothing.
      onManual: item
        ? undefined
        : () => {
            // The facts stay, as the person's own.
            setLinked(undefined);
            setPickerOpen(false);
          },
      // Several entries added at once: nothing is left to fill in here.
      onAdded: item
        ? undefined
        : () => {
            setPickerOpen(false);
            onOpenChange(false);
          },
    },
  };
}
