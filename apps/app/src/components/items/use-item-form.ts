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
import { homeCurrencyErrors } from "@coinslite/backend/convex/homeCurrency/rules";
import { photoSides } from "@coinslite/backend/convex/photos/rules";
import type { ItemType } from "@coinslite/ui/item-type-icon";
import { toast } from "@coinslite/ui/toaster";
import { useForm, useSelector } from "@tanstack/react-form";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isCatalogType } from "./item-fields";
import {
  type ItemFormValues,
  blankItem,
  factValues,
  fillForm,
  hasDetails,
  valuesFromItem,
} from "./item-form";
import {
  type LinkedEntry,
  itemFormRules,
  itemSave,
  refusedDetails,
} from "./item-form-submit";

/** An Item as its page reads it: facts resolved, with the Catalog entry it's linked to. */
type EditedItem = Doc<"items"> & { catalogEntry?: LinkedEntry | null };

/** The Item form's TanStack form. */
export type ItemForm = ReturnType<typeof useItemForm>["form"];

/** What the Item form dialog is given (item-form-dialog.tsx). */
export type ItemFormProps = {
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
};

/**
 * The Item form's state and saving, for item-form-dialog.tsx to lay out:
 * its values and the Catalog entry they're linked to, the Catalog picker
 * (where adding a coin or banknote starts), a coin scan's suggestion and
 * photos, the Album a new Item goes into, and what happens after saving
 * ("Create more" starts the next Item).
 */
export function useItemForm({
  open,
  onOpenChange,
  item,
  copyOf,
  onAdded,
  newItemType,
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
  const titleRef = useRef<HTMLInputElement>(null);
  // Only while open: the "New Item" dialog is mounted on every page, also
  // while the session ends, when these would fail signed out.
  const albums = useAlbums(open);
  const wantedKeys = useWantedKeys(open);
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
        catalogVisible,
        albumIds: albums?.map((album) => album._id),
        wantedKeys,
        amountsIn: amounts.amountsIn,
        locale,
      });
      let added: Id<"items"> | undefined;
      try {
        if (save.mutation === "update") await updateItem(save.args);
        else added = await addItem(save.args);
      } catch (failure) {
        const code = failure instanceof ConvexError ? failure.data : undefined;
        setFailed(
          isItemLimitError(failure)
            ? itemLimitMessage
            : code === homeCurrencyErrors.changing
              ? t("homeCurrency.moneyBusy")
              : code === homeCurrencyErrors.otherCurrency && home
                ? t("homeCurrency.changedWhileOpen", { currency: home })
                : t(item ? "items.errors.saveFailed" : "items.errors.failed"),
        );
        return;
      }
      // The only Album, filed into without being picked: say so, so the
      // Item doesn't land there unnoticed.
      const preselected =
        !item &&
        !copyOf &&
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
      form.reset();
      setDetailsOpen(false);
      setLinked(undefined);
      if (createMore) {
        // "Create more" keeps the pills for the next Item, and starts it
        // on the Catalog picker like the first.
        fillForm(form, { type: value.type, country: value.country });
        // A preselected Album stays preselected for the next Item.
        form.setFieldValue("albumId", value.albumId, {
          dontUpdateMeta: preselected,
          dontValidate: preselected,
        });
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
      form.setFieldValue("albumId", onlyAlbum, {
        dontUpdateMeta: true,
        dontValidate: true,
      });
  }, [open, onlyAlbum, form]);
  // Before the first paint, so the type pill never shows the previous type.
  useLayoutEffect(() => {
    if (open && newItemType && !item)
      form.setFieldValue("type", newItemType, {
        dontUpdateMeta: true,
        dontValidate: true,
      });
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
      fillForm(form, { title: entry.title });
    setLinked({ key: entry.key, title: entry.title, facts: entry.facts });
    const values: Partial<ReturnType<typeof factValues>> = factValues(
      entry.facts,
      locale,
    );
    // Facts few entries hold: what the person already typed stays, as their
    // own, when the entry has nothing to put there.
    for (const name of ["mintMark", "mintage", "thickness"] as const)
      if (entry.facts[name] === undefined) delete values[name];
    fillForm(form, { type: entry.itemType, ...values });
    return true;
  };

  /** Fills the form with a scan's suggestion: its Catalog entry, else the facts read. */
  const applySuggestion = async (
    suggestion: NonNullable<ScanPreset["suggestion"]>,
  ) => {
    const { facts } = suggestion;
    fillForm(form, { type: "coin" });
    const linkedToEntry =
      suggestion.entry !== undefined && (await linkEntry(suggestion.entry.key));
    if (!linkedToEntry) fillForm(form, { title: suggestion.title });
    const values = factValues(facts, locale);
    if (facts.year !== undefined) fillForm(form, { year: values.year });
    if (!linkedToEntry)
      fillForm(form, {
        country: values.country,
        denomination: values.denomination,
        series: values.series,
        material: values.material,
        diameter: values.diameter,
        mintMark: facts.mintMark ?? "",
        ruler: facts.ruler ?? "",
      });
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
    /** The title field, which has the focus whenever the form starts. */
    titleRef,
    linked,
    /** The linked entry's facts as the form writes them. */
    fromEntry,
    /** The currency amounts are typed in, and why they can't be, if so. */
    amounts,
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
    /** A new Item's form stays as it was for next time, unless it holds a scan. */
    keepsDraft: !item && !copyOf && scanned === undefined,
    submitting,
    /** The rules the fields check what they hold with (item-form-submit.ts). */
    rules,
    /** Validates and saves; `from` is where the submit came from (lib/submit-form.ts). */
    submit,
    /** Opens the Catalog picker from the form, to link another entry. */
    pickAnother: () => openPicker(false),
    /** The Catalog picker's props (catalog-picker.tsx). */
    picker: {
      open: pickerOpen,
      // Esc closes the picker, as its hint says: when adding started on it,
      // that's the whole dialog, not a way into the form.
      onOpenChange: (next: boolean) => {
        setPickerOpen(next);
        if (!next && pickerFirst.current) onOpenChange(false);
      },
      onPick: (entry: PickedCatalogEntry) => void pickEntry(entry),
      onManual: () => {
        // The facts stay, as the person's own.
        setLinked(undefined);
        setPickerOpen(false);
      },
      // Several entries added at once: nothing is left to fill in here.
      onAdded: () => {
        setPickerOpen(false);
        onOpenChange(false);
      },
    },
  };
}
