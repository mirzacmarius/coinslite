"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { ItemSelection } from "./use-item-selection";

/**
 * Select mode's Delete: confirms how many Items and photos go, then deletes
 * every selected Item at once and ends select mode. Says so through
 * `onDeleted` and `onFailed`, so the bar shows the outcome.
 */
export function DeleteItemsButton({
  selection,
  onDeleted,
  onFailed,
}: {
  selection: ItemSelection;
  onDeleted: (count: number) => void;
  onFailed: (message: string) => void;
}) {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const removeMany = useMutation(api.items.removeMany);
  const { count, selected } = selection;
  const itemIds = [...selected.keys()];
  const photos = useQuery(api.items.photoCount, open ? { itemIds } : "skip");

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={count === 0}
        onClick={() => setOpen(true)}
      >
        <Trash2 aria-hidden="true" />
        {t("collection.delete")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
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
    </>
  );
}
