"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { useMutation, useQuery } from "convex/react";

/**
 * Select mode's Delete: confirms how many Items and photos go, then deletes
 * every selected Item at once. Says so through `onDeleted` and `onFailed`,
 * so the bar shows the outcome.
 */
export function DeleteItemsDialog({
  open,
  onOpenChange,
  itemIds,
  onDeleted,
  onFailed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: Id<"items">[];
  onDeleted: (count: number) => void;
  onFailed: (message: string) => void;
}) {
  const t = useI18n();
  const removeMany = useMutation(api.items.removeMany);
  const photos = useQuery(api.items.photoCount, open ? { itemIds } : "skip");
  const count = itemIds.length;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("collection.deleteTitle", { count })}
      description={
        photos
          ? `${t("collection.deleteBody")} ${t("collection.deletePhotos", { count: photos })}`
          : t("collection.deleteBody")
      }
      confirmLabel={t("collection.deleteConfirm", { count })}
      cancelLabel={t("deleteItem.cancel")}
      destructive
      confirmDisabled={photos === undefined}
      onConfirm={async () => {
        try {
          await removeMany({ itemIds });
        } catch {
          onFailed(t("collection.deleteFailed"));
          return;
        }
        onDeleted(count);
      }}
    />
  );
}
