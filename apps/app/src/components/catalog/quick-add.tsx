"use client";

import { AlbumPicker } from "@/components/albums/album-picker";
import { useAlbums } from "@/components/albums/use-albums";
import { useGradeLabels } from "@/components/items/grade-labels";
import {
  ItemLimitNotice,
  isItemLimitError,
  useItemLimitMessage,
} from "@/components/plans/plan-usage";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import type { CatalogItemType } from "@coinslite/backend/convex/catalog/fields";
import {
  type GradingScale,
  type Strike,
  defaultScale,
} from "@coinslite/backend/convex/items/grades";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
import { Button } from "@coinslite/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@coinslite/ui/dialog";
import { ActionLabel } from "@coinslite/ui/header-bar";
import { IconButton } from "@coinslite/ui/icon-button";
import { Input } from "@coinslite/ui/input";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { Kbd, useModifierKey } from "@coinslite/ui/kbd";
import { PropertyPicker } from "@coinslite/ui/property-picker";
import { toast } from "@coinslite/ui/toaster";
import { useMutation } from "convex/react";
import {
  Award,
  ChevronRight,
  Library,
  Loader2,
  Plus,
  Ruler,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useCatalogFormat } from "./use-catalog-format";

/** What quick add needs to know about a Catalog entry. */
type QuickAddEntry = {
  key: string;
  title: string;
  itemType?: CatalogItemType;
  country?: string;
  denomination?: string;
  strike?: Strike;
  yearFrom?: number;
  yearTo?: number;
};

/**
 * Quick add on a Catalog entry's page (spec 6.3): a Quantity, a Grade and an
 * optional Album make ONE Item linked to the entry, whatever the Quantity.
 */
export function QuickAdd({ entry }: { entry: QuickAddEntry }) {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  // Each opening starts afresh.
  const [opening, setOpening] = useState(0);
  return (
    <>
      <Button
        size="xs"
        onClick={() => {
          setOpening((count) => count + 1);
          setOpen(true);
        }}
      >
        <Plus aria-hidden="true" />
        <ActionLabel>{t("quickAdd.add")}</ActionLabel>
      </Button>
      <QuickAddDialog
        key={opening}
        entry={entry}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function QuickAddDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: QuickAddEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const mod = useModifierKey();
  const router = useRouter();
  const quantityId = useId();
  const labels = useGradeLabels();
  const catalogFormat = useCatalogFormat();
  const quickAdd = useMutation(api.items.quickAdd);
  const albums = useAlbums(open);
  const itemLimitMessage = useItemLimitMessage();
  const type = entry.itemType ?? "coin";
  const [scale, setScale] = useState<GradingScale>(() =>
    defaultScale(type, entry.country),
  );
  const [grade, setGrade] = useState<string>();
  const [quantity, setQuantity] = useState("1");
  // Until the person picks, a single Album is chosen for them (spec 5.4).
  const [album, setAlbum] = useState<{ id: Id<"albums"> | undefined }>();
  const onlyAlbum = albums?.length === 1 ? albums[0]?._id : undefined;
  const albumId = album ? album.id : onlyAlbum;
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string>();
  const quantityValid =
    /^\d+$/.test(quantity.trim()) &&
    Number(quantity) >= 1 &&
    Number(quantity) <= itemLimits.quantity;
  const quantityError =
    submitted && !quantityValid ? t("items.errors.quantity") : undefined;
  const facts = [
    catalogFormat.years(entry.yearFrom, entry.yearTo),
    entry.denomination,
  ]
    .filter(Boolean)
    .join(" · ");

  const submit = async () => {
    setSubmitted(true);
    if (!quantityValid || saving) return;
    setSaving(true);
    setFailed(undefined);
    try {
      const itemId = await quickAdd({
        catalogEntryKey: entry.key,
        quantity: Number(quantity),
        ...(grade && { grade, gradingScale: scale }),
        // An Album deleted since the dialog opened can't take the Item.
        albumId:
          albums && !albums.some(({ _id }) => _id === albumId)
            ? undefined
            : albumId,
      });
      onOpenChange(false);
      // The only Album, filed into without being picked: say so.
      const filedInto =
        album === undefined && onlyAlbum !== undefined
          ? albums?.find(({ _id }) => _id === onlyAlbum)
          : undefined;
      toast.success(
        filedInto
          ? t("quickAdd.addedToAlbum", { album: filedInto.name })
          : t("quickAdd.added"),
        {
          action: {
            label: t("quickAdd.open"),
            onClick: () => router.push(`/collection/${itemId}`),
          },
        },
      );
    } catch (failure) {
      setFailed(
        isItemLimitError(failure) ? itemLimitMessage : t("quickAdd.failed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void submit();
          }
        }}
      >
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
            <Library className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span>{t("nav.collection")}</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <DialogTitle className="truncate text-foreground">
              {t("quickAdd.title")}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <IconButton type="button" label={t("items.close")} shortcut="Esc">
              <X />
            </IconButton>
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {t("quickAdd.description")}
        </DialogDescription>

        <div className="flex flex-col gap-3 px-4 pb-3 pt-1">
          <ItemLimitNotice />
          <div className="flex min-w-0 items-center gap-3">
            <ItemTypeIcon type={type} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {entry.title}
              </span>
              {facts && (
                <span className="truncate text-xs text-muted-foreground">
                  {facts}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <PropertyPicker
              icon={Award}
              label={t("items.grade")}
              placeholder={t("items.setGrade")}
              value={grade}
              options={labels.gradeOptions(scale, entry.strike)}
              onChange={setGrade}
              onClear={() => setGrade(undefined)}
              clearLabel={t("items.noGrade")}
              noResults={t("items.noMatches")}
            />
            <PropertyPicker
              icon={Ruler}
              label={t("items.gradingScale")}
              value={scale}
              options={labels.scaleOptions(type)}
              onChange={(next) => {
                // Grades belong to their scale.
                if (next !== scale) setGrade(undefined);
                setScale(next);
              }}
              noResults={t("items.noMatches")}
            />
            <AlbumPicker
              value={albumId}
              onChange={(id) => setAlbum({ id })}
              onCreateFailed={setFailed}
            />
            <label
              htmlFor={quantityId}
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground"
            >
              {t("items.quantity")}
              <Input
                id={quantityId}
                type="number"
                inputMode="numeric"
                min={1}
                max={itemLimits.quantity}
                aria-invalid={quantityError ? true : undefined}
                className="h-7 w-16 px-2 text-right text-[13px]"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
          </div>
          {quantityError && (
            <p className="text-xs text-destructive">{quantityError}</p>
          )}
          {failed && (
            <p role="alert" className="text-xs text-destructive">
              {failed}
            </p>
          )}
        </div>

        <DialogFooter>
          <span />
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("items.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving && (
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
      </DialogContent>
    </Dialog>
  );
}
