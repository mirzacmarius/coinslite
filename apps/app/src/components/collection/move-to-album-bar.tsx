"use client";

import {
  AddToAlbumButton,
  type PickedAlbum,
} from "@/components/albums/album-picker";
import { useAlbums } from "@/components/albums/use-albums";
import { LabelsDialog } from "@/components/labels/labels-dialog";
import { SelectionBar } from "@/components/selection-bar";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import type { CollectionView } from "@coinslite/backend/convex/collection/view";
import { bulkLimits } from "@coinslite/backend/convex/items/bulkRules";
import { Button } from "@coinslite/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@coinslite/ui/dropdown-menu";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Loader2,
  MoreHorizontal,
  Printer,
  Receipt,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { DeleteItemsDialog } from "./delete-items-dialog";
import type { BrowseResult } from "./filter-options";
import { SetGradeButton } from "./set-grade-button";
import { SetPurchaseDialog } from "./set-purchase-dialog";
import { TagItemsButton } from "./tag-items-button";
import type { ItemSelection } from "./use-item-selection";

/** How an undo went: Items put back, and Items skipped as changed since. */
type Undone = FunctionReturnType<typeof api.items.undoMove>;

/** How long a toast offering Undo stays, in milliseconds. */
const undoOfferedFor = 10_000;

/** The dialogs the More menu opens. */
type MoreDialog = "purchase" | "labels" | "delete";

/**
 * On a phone the actions share a line of their own, each its icon over its
 * name as a phone's toolbars have them, so none is left over on a line of
 * its own whatever the language.
 */
const phoneAction =
  "max-md:h-auto max-md:min-w-0 max-md:flex-1 max-md:flex-col max-md:justify-center max-md:gap-1 max-md:self-stretch max-md:whitespace-normal max-md:px-1 max-md:py-1.5 max-md:text-center max-md:text-xs max-md:leading-tight";

/**
 * Select mode's bar on the Collection page. Until an Item is selected it
 * says how to start and offers to select the page or the whole view; then
 * come the actions on what's selected: add them to an Album (or take them
 * out of theirs) the moment one is picked, set a Grade, add or take off a
 * tag, and under More set a bought lot's purchase, print their labels or
 * delete them. A move, a Grade, a purchase or a tag can be undone from its
 * toast. The toolbar's Done leaves select mode.
 * With `addTo`, the Album is set and moving into it is the only action;
 * `onLeave` goes back to it once they're moved.
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
  const [capped, setCapped] = useState(false);
  // The view's Items as Select all last found them. While they're all still
  // selected there's nothing more to select; the count alone can't tell, as
  // the selection may hold Items from other views too.
  const [wholeView, setWholeView] = useState<{
    view: string;
    itemIds: Id<"items">[];
  }>();
  const [moving, setMoving] = useState(false);
  const [failed, setFailed] = useState<string>();
  // The More menu's dialog; each opening starts it afresh.
  const [dialog, setDialog] = useState<{ open?: MoreDialog; key: number }>({
    key: 0,
  });
  const { count, selected, isSelected } = selection;
  const itemIds = [...selected.keys()];
  // The Items, not their order, make the view.
  const viewKey = JSON.stringify({ ...view, sort: undefined });

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
    setWholeView({
      view: viewKey,
      itemIds: found.items.map(({ _id }) => _id),
    });
    select(
      selection.add(found.items) +
        Math.max(0, found.total - found.items.length),
    );
  };

  // A view that fits on this page is selected whole by selecting the page.
  const onePage = result.total <= result.items.length;
  const pageSelected = result.items.every(({ _id }) => isSelected(_id));
  const allSelected =
    pageSelected &&
    wholeView?.view === viewKey &&
    wholeView.itemIds.every(isSelected);
  const album = albums?.find(({ _id }) => _id === addTo);
  // The Album each selected Item is in: as this page now shows it, else as
  // it was when selected.
  const onPage = new Map(
    result.items.map(({ _id, albumId }) => [_id, albumId ?? null]),
  );
  const albumsNow = [...selected].map(([itemId, albumId]) =>
    onPage.has(itemId) ? (onPage.get(itemId) ?? null) : albumId,
  );
  const inAnAlbum = albumsNow.some((albumId) => albumId !== null);
  const note =
    capped &&
    t("collection.selectedFirst", { limit: format.number(bulkLimits.items) });

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

  /**
   * Moves the selected Items into `to`, or out of any Album with null. The
   * toast says how many left another Album, so a mistaken pick shows while
   * Undo is offered.
   */
  const move = async (to: PickedAlbum | null) => {
    setMoving(true);
    setFailed(undefined);
    const fromOtherAlbums = to
      ? albumsNow.filter((albumId) => albumId !== null && albumId !== to._id)
          .length
      : 0;
    try {
      const { before } = await moveToAlbum({ itemIds, albumId: to?._id });
      toast.success(
        to
          ? t("collection.movedTo", { album: to.name })
          : t("collection.takenOut", { count }),
        {
          ...(before.length > 0 &&
            offerUndo(
              () => undoMove({ before, albumId: to?._id }),
              t("collection.moveUndone"),
              (counts) => t("collection.moveUndoneSkipped", counts),
            )),
          description:
            fromOtherAlbums > 0
              ? t("collection.fromOtherAlbums", { count: fromOtherAlbums })
              : undefined,
        },
      );
      selection.stop();
      onLeave?.();
    } catch {
      setFailed(t("collection.moveFailed"));
    } finally {
      setMoving(false);
    }
  };

  const openDialog = (open: MoreDialog) =>
    setDialog(({ key }) => ({ open, key: key + 1 }));
  const dialogState = (name: MoreDialog) => ({
    open: dialog.open === name,
    onOpenChange: (open: boolean) =>
      setDialog(({ key }) => ({ open: open ? name : undefined, key })),
  });

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
      {!pageSelected && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => select(selection.add(result.items))}
        >
          {onePage
            ? t("collection.selectAll", { count: result.total })
            : t("collection.selectPage")}
        </Button>
      )}
      {!onePage && !allSelected && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => void selectView()}
        >
          {t("collection.selectAll", { count: result.total })}
        </Button>
      )}
      {count > 0 && (
        // A line of their own on a phone, the end of the bar's line on wider screens.
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 max-md:w-full max-md:flex-nowrap max-md:items-stretch md:ml-auto">
          {addTo ? (
            <Button
              type="button"
              size="xs"
              disabled={!album || moving}
              onClick={() => album && void move(album)}
            >
              {moving && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              {t("collection.moveTo", { album: album?.name ?? "" })}
            </Button>
          ) : (
            <>
              <AddToAlbumButton
                className={phoneAction}
                moving={moving}
                onPick={(to) => void move(to)}
                onTakeOut={inAnAlbum ? () => void move(null) : undefined}
                onCreateFailed={setFailed}
              />
              <SetGradeButton
                className={phoneAction}
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
              <TagItemsButton
                className={phoneAction}
                selection={selection}
                onTagged={({ tag, remove, changed, skipped, undo }) => {
                  toast.success(
                    skipped > 0
                      ? remove
                        ? t("collection.untaggedSkipped", {
                            tag,
                            changed,
                            skipped,
                          })
                        : t("collection.taggedSkipped", {
                            tag,
                            changed,
                            skipped,
                          })
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
              {/* The rarer actions, Delete last, wait in a menu. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={cn(phoneAction, "max-md:w-auto")}
                  >
                    <MoreHorizontal aria-hidden="true" />
                    <span className="sr-only">{t("items.moreActions")}</span>
                    {/* Named on a phone, beside the others' names. */}
                    <span aria-hidden="true" className="md:hidden">
                      {t("shell.more")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => openDialog("purchase")}>
                    <Receipt strokeWidth={1.75} aria-hidden="true" />
                    {t("collection.setPurchase")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => openDialog("labels")}>
                    <Printer strokeWidth={1.75} aria-hidden="true" />
                    {t("labels.selectionAction")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => openDialog("delete")}
                    className="text-destructive focus:text-destructive [&_svg]:text-destructive"
                  >
                    <Trash2 strokeWidth={1.75} aria-hidden="true" />
                    {t("collection.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      )}
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
      {!addTo && (
        <>
          <SetPurchaseDialog
            key={dialog.key}
            {...dialogState("purchase")}
            itemIds={itemIds}
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
          <LabelsDialog
            {...dialogState("labels")}
            source={{ kind: "items", itemIds }}
            description={t("labels.forSelection", { count })}
            items={count}
          />
          <DeleteItemsDialog
            {...dialogState("delete")}
            itemIds={itemIds}
            onDeleted={(deleted) => {
              toast.success(t("collection.deleted", { count: deleted }));
              selection.stop();
            }}
            onFailed={setFailed}
          />
        </>
      )}
    </SelectionBar>
  );
}
