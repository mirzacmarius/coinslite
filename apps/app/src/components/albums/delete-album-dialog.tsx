"use client";

import { ItemThumbnail } from "@/components/items/item-thumbnail";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc, Id } from "@coinslite/backend/convex/_generated/dataModel";
import { Button } from "@coinslite/ui/button";
import { Checkbox } from "@coinslite/ui/checkbox";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useState } from "react";

const PAGE_SIZE = 50;

/**
 * Confirms deleting an Album. The person ticks which of its Items to delete
 * too, e.g. ones they sold; the rest stay in the Collection without an Album.
 */
export function DeleteAlbumDialog({
  album,
  open,
  onOpenChange,
  onPendingChange,
  onDeleted,
}: {
  album: Doc<"albums">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True while the deletion is being saved. */
  onPendingChange?: (pending: boolean) => void;
  onDeleted: () => void;
}) {
  const t = useI18n();
  const removeAlbum = useMutation(api.albums.remove);
  const [ticked, setTicked] = useState<ReadonlySet<Id<"items">>>(new Set());
  const [failed, setFailed] = useState<string>();
  const hasItems = album.itemCount > 0;
  const { results, status, loadMore } = usePaginatedQuery(
    api.albums.items,
    open && hasItems ? { albumId: album._id } : "skip",
    { initialNumItems: PAGE_SIZE },
  );
  const tick = (ids: Id<"items">[], on: boolean) =>
    setTicked((before) => {
      const after = new Set(before);
      for (const id of ids) {
        if (on) after.add(id);
        else after.delete(id);
      }
      return after;
    });
  const tickedShown = results.filter((item) => ticked.has(item._id)).length;
  const count = ticked.size;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFailed(undefined);
        onOpenChange(next);
      }}
      title={t("albums.deleteTitle", { name: album.name })}
      description={
        hasItems
          ? t("albums.deleteDescription")
          : t("albums.deleteDescriptionEmpty")
      }
      confirmLabel={t("albums.deleteConfirm", { count })}
      cancelLabel={t("albums.cancel")}
      destructive
      onConfirm={async () => {
        setFailed(undefined);
        onPendingChange?.(true);
        try {
          await removeAlbum({ albumId: album._id, deleteItemIds: [...ticked] });
        } catch (failure) {
          onPendingChange?.(false);
          setFailed(t("albums.errors.deleteFailed"));
          throw failure;
        }
        toast.success(t("albums.deleted"));
        onDeleted();
      }}
    >
      {hasItems && (
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-md border">
            <label className="flex h-9 cursor-pointer items-center gap-2 border-b bg-muted/40 px-3 text-ui text-muted-foreground">
              <Checkbox
                checked={
                  results.length > 0 && tickedShown === results.length
                    ? true
                    : tickedShown > 0
                      ? "indeterminate"
                      : false
                }
                disabled={results.length === 0}
                onCheckedChange={(checked) =>
                  tick(
                    results.map((item) => item._id),
                    checked === true,
                  )
                }
              />
              {t("albums.selectAll")}
            </label>
            <ul className="max-h-64 divide-y overflow-y-auto">
              {status === "LoadingFirstPage" &&
                [0, 1, 2].map((row) => (
                  <li
                    key={row}
                    aria-hidden="true"
                    className="flex h-9 items-center gap-2 px-3"
                  >
                    <span className="size-4 animate-pulse rounded bg-muted" />
                    <span className="h-3 w-40 animate-pulse rounded bg-muted" />
                  </li>
                ))}
              {results.map((item) => (
                <li key={item._id}>
                  <label className="flex h-9 cursor-pointer items-center gap-2 px-3 text-ui transition-colors duration-100 hover:bg-muted">
                    <Checkbox
                      checked={ticked.has(item._id)}
                      onCheckedChange={(checked) =>
                        tick([item._id], checked === true)
                      }
                    />
                    <ItemThumbnail
                      type={item.type}
                      url={item.thumbnailUrl}
                      className="size-6 [&_svg]:size-3.5"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      ×{item.quantity}
                    </span>
                  </label>
                </li>
              ))}
              {status === "CanLoadMore" && (
                <li className="p-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => loadMore(PAGE_SIZE)}
                  >
                    {t("items.showMore")}
                  </Button>
                </li>
              )}
            </ul>
          </div>
          <p
            className={cn(
              "text-xs",
              count > 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {t("albums.deleteCount", { count })}
          </p>
        </div>
      )}
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          {failed}
        </p>
      )}
    </ConfirmDialog>
  );
}
