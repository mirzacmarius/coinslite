"use client";

import { AlbumPicker } from "@/components/albums/album-picker";
import { useAlbums } from "@/components/albums/use-albums";
import { collectionHref } from "@/components/collection/collection-url";
import {
  UpgradeLink,
  isItemLimitError,
  useItemLimitMessage,
  useItemsLeft,
} from "@/components/plans/plan-usage";
import { SelectionBar } from "@/components/selection-bar";
import { useWantedKeys } from "@/components/wantlist/wantlist";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { albumErrors } from "@coinslite/backend/convex/albums/rules";
import { catalogEntryNotFound } from "@coinslite/backend/convex/catalog/fields";
import {
  setErrors,
  setLimits,
} from "@coinslite/backend/convex/catalog/setRules";
import { Button } from "@coinslite/ui/button";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { Switch } from "@coinslite/ui/switch";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useId, useState } from "react";

/**
 * Adding the selected Catalog entries to the Collection, one Item each
 * (spec 6.2): the Album they go into, how many Items the plan has room for,
 * and the add itself. `add` is for the bar's button and for Cmd/Ctrl+Enter.
 */
export function useBulkAdd({
  keys,
  allowDuplicates,
  onAdded,
}: {
  /** The selected entries, in the order they're listed. */
  keys: string[];
  allowDuplicates: boolean;
  onAdded: (count: number) => void;
}) {
  const t = useI18n();
  const router = useRouter();
  const addEntries = useMutation(api.items.addCatalogEntries);
  const albums = useAlbums();
  const wantedKeys = useWantedKeys();
  const itemLimitMessage = useItemLimitMessage();
  const left = useItemsLeft();
  // Until the person picks, a single Album is chosen for them (spec 5.4).
  const [album, setAlbum] = useState<{ id: Id<"albums"> | undefined }>();
  const onlyAlbum = albums?.length === 1 ? albums[0]?._id : undefined;
  const albumId = album ? album.id : onlyAlbum;
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string>();
  const count = keys.length;
  const tooMany = count > setLimits.bulkAdd;
  const overQuota = left !== undefined && count > left;

  const errorMessage = (failure: unknown) => {
    if (isItemLimitError(failure)) return itemLimitMessage;
    const code = failure instanceof ConvexError ? String(failure.data) : "";
    switch (code) {
      case setErrors.alreadyHeld:
        return t("sets.errors.alreadyHeld");
      case setErrors.tooManyEntries:
        return t("sets.errors.tooMany", { limit: setLimits.bulkAdd });
      case catalogEntryNotFound:
        return t("sets.errors.entryGone");
      case albumErrors.notFound:
        return t("sets.errors.albumGone");
      default:
        return t("sets.errors.failed");
    }
  };

  const add = async () => {
    if (saving || count === 0 || tooMany || overQuota) return;
    setSaving(true);
    setFailed(undefined);
    // Adding them clears their wants (wants.ts), which the toast says.
    const wanted = keys.filter((key) => wantedKeys?.has(key)).length;
    try {
      await addEntries({
        catalogEntryKeys: keys,
        allowDuplicates,
        // An Album deleted since it was chosen can't take the Items.
        albumId:
          albums && !albums.some(({ _id }) => _id === albumId)
            ? undefined
            : albumId,
      });
      toast.success(t("sets.added", { count }), {
        description:
          wanted > 0 ? t("wantlist.clearedMany", { count: wanted }) : undefined,
        action: {
          label: t("sets.openCollection"),
          // Newest added first: the Items just added, together at the top.
          onClick: () => router.push(collectionHref({ sort: "newest" })),
        },
      });
      onAdded(count);
    } catch (failure) {
      setFailed(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  return {
    count,
    albumId,
    setAlbumId: (id: Id<"albums"> | undefined) => setAlbum({ id }),
    left,
    tooMany,
    overQuota,
    saving,
    failed,
    setFailed,
    add,
  };
}

export type BulkAdd = ReturnType<typeof useBulkAdd>;

/**
 * The bar for adding what's selected: how many, the target Album, how many
 * Items the Free plan still has room for (with the way to Premium when the
 * selection doesn't fit), and the add button. Floating at the bottom of a
 * page, or docked under the Catalog picker's list.
 */
export function BulkAddBar({
  bulk,
  onClear,
  start,
  variant,
}: {
  bulk: BulkAdd;
  onClear: () => void;
  /** Shown first, in place of the count while nothing is selected (the picker's duplicates switch). */
  start?: React.ReactNode;
  variant: "floating" | "docked";
}) {
  const t = useI18n();
  const format = useFormatters();
  const mod = useModifierKey();
  const { count, left, tooMany, overQuota } = bulk;
  const freePlan = left !== undefined && Number.isFinite(left);
  const blocked = count === 0 || tooMany || overQuota;

  return (
    <SelectionBar
      label={t("sets.addBar")}
      count={count}
      onClear={onClear}
      start={start}
      variant={variant}
    >
      <AlbumPicker
        value={bulk.albumId}
        onChange={bulk.setAlbumId}
        onCreateFailed={bulk.setFailed}
      />
      <span
        aria-live="polite"
        className={cn(
          "min-w-0 flex-1 text-xs",
          overQuota || tooMany ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {tooMany ? (
          t("sets.tooMany", { limit: format.number(setLimits.bulkAdd) })
        ) : overQuota && freePlan ? (
          <>
            {t("sets.overQuota", { count: left })}{" "}
            <UpgradeLink>{t("plans.upgradeToPremium")}</UpgradeLink>
          </>
        ) : freePlan ? (
          t("sets.itemsLeft", { count: left })
        ) : null}
      </span>
      <Button
        type="button"
        size="xs"
        disabled={blocked || bulk.saving}
        onClick={() => void bulk.add()}
      >
        {bulk.saving && <Loader2 className="animate-spin" aria-hidden="true" />}
        {count > 0 ? t("sets.add", { count }) : t("sets.addNone")}
        {mod && (
          <Kbd className="ml-1 border-primary-foreground/40 bg-transparent text-primary-foreground">
            {mod}↵
          </Kbd>
        )}
      </Button>
      {bulk.failed && (
        <p role="alert" className="w-full text-xs text-destructive">
          {bulk.failed}
        </p>
      )}
    </SelectionBar>
  );
}

/** Cmd/Ctrl+Enter, the shortcut that adds what's selected. */
export const isAddShortcut = (event: React.KeyboardEvent | KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && event.key === "Enter";

/** The switch that lets entries already held be selected too. */
export function DuplicatesSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const t = useI18n();
  const id = useId();
  return (
    <span className="flex h-7 items-center gap-2 text-[13px] text-muted-foreground">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <label htmlFor={id}>{t("sets.allowDuplicates")}</label>
    </span>
  );
}
