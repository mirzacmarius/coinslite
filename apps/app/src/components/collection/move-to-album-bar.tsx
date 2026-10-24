"use client";

import { AlbumPicker } from "@/components/albums/album-picker";
import { useAlbums } from "@/components/albums/use-albums";
import { PrintLabelsButton } from "@/components/labels/labels-dialog";
import { SelectionBar } from "@/components/selection-bar";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import type { CollectionView } from "@coinslite/backend/convex/collection/view";
import { bulkLimits } from "@coinslite/backend/convex/items/bulkRules";
import { Button } from "@coinslite/ui/button";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DeleteItemsButton } from "./delete-items-button";
import type { BrowseResult } from "./filter-options";
import { SetGradeButton } from "./set-grade-button";
import { SetPurchaseButton } from "./set-purchase-button";
import { TagItemsButton } from "./tag-items-button";
import type { ItemSelection } from "./use-item-selection";

/** How an undo went: Items put back, and Items skipped as changed since. */
type Undone = FunctionReturnType<typeof api.items.undoMove>;

/** How long a toast offering Undo stays, in milliseconds. */
const undoOfferedFor = 10_000;

/**
 * Select mode's bar on the Collection page: select the page or the whole
 * view, pick an Album (or none) and move every selected Item there at once,
 * set a Grade or a bought lot's purchase on them, add or take off a tag,
 * print their labels, or delete them. A move, a Grade, a purchase or a tag
 * can be undone from its toast.
 * With `addTo`, the Album is set and moving into it is the only action;
 * `onLeave` ends picking either way.
 */
export function MoveToAlbumBar({
  selection,
  result,
  view,
  addTo,
  onLeave,
}: {
  selection: ItemSelection;
  result: BrowseResult;
  view: CollectionView;
  addTo?: Id<"albums">;
  onLeave?: () => void;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const convex = useConvex();
  const albums = useAlbums();
  const moveToAlbum = useMutation(api.items.moveToAlbum);
  const undoMove = useMutation(api.items.undoMove);
  // The Album picked to move into; `albumId` undefined means out of any Album.
  const [picked, setTarget] = useState<{ albumId?: Id<"albums"> }>();
  const target = addTo ? { albumId: addTo } : picked;
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
  const note = capped ? (
    t("collection.selectedFirst", { limit: format.number(bulkLimits.items) })
  ) : inOtherAlbum > 0 ? (
    <span className="text-muted-foreground">
      {t("collection.inOtherAlbum", { count: inOtherAlbum })}
    </span>
  ) : null;

  /**
   * A toast's Undo, offered while it shows: runs `undo`, then says it's
   * done, or how many Items were skipped as changed since.
   */
  const offerUndo = (
    undo: () => Promise<Undone>,
    undone: string,
    undoneSkipped: (counts: Undone) => string,
  ) => ({
    duration: undoOfferedFor,
    action: {
      label: t("collection.undo"),
      onClick: () => {
        undo().then(
          (counts) =>
            toast.success(counts.skipped > 0 ? undoneSkipped(counts) : undone),
          () => toast.error(t("collection.undoFailed")),
        );
      },
    },
  });

  const move = async () => {
    if (!target || count === 0) return;
    setSaving(true);
    setFailed(undefined);
    try {
      const { before } = await moveToAlbum({
        itemIds: [...selected.keys()],
        albumId: target.albumId,
      });
      toast.success(
        album
          ? t("collection.movedTo", { album: album.name })
          : t("collection.takenOut", { count }),
        before.length > 0
          ? offerUndo(
              () => undoMove({ before, albumId: target.albumId }),
              t("collection.moveUndone"),
              (counts) => t("collection.moveUndoneSkipped", counts),
            )
          : undefined,
      );
      selection.stop();
      onLeave?.();
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
            {addTo
              ? t("collection.addToHint", { album: album?.name ?? "" })
              : t("collection.selectHint")}
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
      {!addTo && (
        <AlbumPicker
          value={target?.albumId}
          onChange={(albumId) => setTarget({ albumId })}
          onCreateFailed={setFailed}
        />
      )}
      {/* Keeps the actions after it at the end of the line. */}
      <span className="flex-1" />
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
      {!addTo && (
        <>
          <SetGradeButton
            selection={selection}
            onGraded={({ graded, skipped, undo }) => {
              toast.success(
                skipped > 0
                  ? t("collection.gradedSkipped", { graded, skipped })
                  : t("collection.graded", { count: graded }),
                undo &&
                  offerUndo(undo, t("collection.gradeUndone"), (counts) =>
                    t("collection.gradeUndoneSkipped", counts),
                  ),
              );
              selection.stop();
            }}
            onFailed={setFailed}
          />
          <SetPurchaseButton
            selection={selection}
            onSet={({ count: set, undo }) => {
              toast.success(
                t("collection.purchaseSet", { count: set }),
                offerUndo(undo, t("collection.purchaseUndone"), (counts) =>
                  t("collection.purchaseUndoneSkipped", counts),
                ),
              );
              selection.stop();
            }}
          />
          <TagItemsButton
            selection={selection}
            onTagged={({ tag, remove, changed, skipped, undo }) => {
              toast.success(
                skipped > 0
                  ? remove
                    ? t("collection.untaggedSkipped", { tag, changed, skipped })
                    : t("collection.taggedSkipped", { tag, changed, skipped })
                  : remove
                    ? t("collection.untagged", { count: changed })
                    : t("collection.tagged", { count: changed }),
                undo &&
                  offerUndo(undo, t("collection.tagUndone"), (counts) =>
                    t("collection.tagUndoneSkipped", counts),
                  ),
              );
              selection.stop();
            }}
            onFailed={setFailed}
          />
          <PrintLabelsButton itemIds={[...selected.keys()]} />
          <DeleteItemsButton
            selection={selection}
            onDeleted={(deleted) => {
              toast.success(t("collection.deleted", { count: deleted }));
              selection.stop();
            }}
            onFailed={setFailed}
          />
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onLeave ?? selection.stop}
      >
        {addTo ? t("collection.cancel") : t("collection.done")}
      </Button>
      {/* A line of its own, so it never squeezes the actions; while empty
        it takes no room but stays there to announce what comes. */}
      <p
        aria-live="polite"
        className={cn("text-xs", note ? "w-full" : "sr-only")}
      >
        {note}
      </p>
      {failed && (
        <p role="alert" className="w-full text-xs text-destructive">
          {failed}
        </p>
      )}
    </SelectionBar>
  );
}
