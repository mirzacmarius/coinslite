"use client";

import { AlbumPicker } from "@/components/albums/album-picker";
import { useAlbums } from "@/components/albums/use-albums";
import { SelectionBar } from "@/components/selection-bar";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import type { CollectionView } from "@coinslite/backend/convex/collection/view";
import { bulkLimits } from "@coinslite/backend/convex/items/bulkRules";
import { Button } from "@coinslite/ui/button";
import { toast } from "@coinslite/ui/toaster";
import { useConvex, useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { BrowseResult } from "./filter-options";
import type { ItemSelection } from "./use-item-selection";

/**
 * Select mode's bar on the Collection page: select the page or the whole
 * view, pick an Album (or none) and move every selected Item there at once.
 */
export function MoveToAlbumBar({
  selection,
  result,
  view,
}: {
  selection: ItemSelection;
  result: BrowseResult;
  view: CollectionView;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const convex = useConvex();
  const albums = useAlbums();
  const moveToAlbum = useMutation(api.items.moveToAlbum);
  // The Album picked to move into; `albumId` undefined means out of any Album.
  const [target, setTarget] = useState<{ albumId?: Id<"albums"> }>();
  const [capped, setCapped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string>();
  const { count, selected } = selection;

  const select = (leftOut: number) => {
    setCapped(leftOut > 0);
    setFailed(undefined);
  };
  const selectView = async () => {
    const found = await convex
      .query(api.collection.selectable, { view, locale })
      .catch(() => undefined);
    if (!found) {
      setFailed(t("collection.moveFailed"));
      return;
    }
    select(
      selection.add(found.items) +
        Math.max(0, found.total - found.items.length),
    );
  };

  const album = albums?.find(({ _id }) => _id === target?.albumId);
  // Moving out of one Album into another empties the first: say how many.
  const inOtherAlbum =
    target?.albumId === undefined
      ? 0
      : [...selected.values()].filter(
          (albumId) => albumId !== null && albumId !== target.albumId,
        ).length;

  const move = async () => {
    if (!target || count === 0) return;
    setSaving(true);
    setFailed(undefined);
    try {
      await moveToAlbum({
        itemIds: [...selected.keys()],
        albumId: target.albumId,
      });
      toast.success(
        album
          ? t("collection.movedTo", { album: album.name })
          : t("collection.takenOut", { count }),
      );
      selection.stop();
    } catch {
      setFailed(t("collection.moveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SelectionBar
      label={t("collection.selectionBar")}
      count={count}
      onClear={() => {
        selection.clear();
        setCapped(false);
      }}
      start={
        count === 0 && (
          <span className="text-xs text-muted-foreground">
            {t("collection.selectHint")}
          </span>
        )
      }
      variant="floating"
    >
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => select(selection.add(result.items))}
      >
        {t("collection.selectPage")}
      </Button>
      {result.total > result.items.length && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => void selectView()}
        >
          {t("collection.selectAll", { count: result.total })}
        </Button>
      )}
      <AlbumPicker
        value={target?.albumId}
        onChange={(albumId) => setTarget({ albumId })}
        onCreateFailed={setFailed}
      />
      <span aria-live="polite" className="min-w-0 flex-1 text-xs">
        {capped ? (
          t("collection.selectedFirst", {
            limit: format.number(bulkLimits.items),
          })
        ) : inOtherAlbum > 0 ? (
          <span className="text-muted-foreground">
            {t("collection.inOtherAlbum", { count: inOtherAlbum })}
          </span>
        ) : null}
      </span>
      {target && (
        <Button
          type="button"
          size="xs"
          disabled={count === 0 || saving}
          onClick={() => void move()}
        >
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {album
            ? t("collection.moveTo", { album: album.name })
            : t("collection.takeOut")}
        </Button>
      )}
      <Button type="button" variant="ghost" size="xs" onClick={selection.stop}>
        {t("collection.done")}
      </Button>
      {failed && (
        <p role="alert" className="w-full text-xs text-destructive">
          {failed}
        </p>
      )}
    </SelectionBar>
  );
}
