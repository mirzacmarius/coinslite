"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";

/**
 * Confirms deleting an Item and its photos, then goes back to the Collection.
 * `onLeaving(true)` fires just before the Item disappears, so the page can
 * show it's leaving rather than "not found".
 */
export function DeleteItemDialog({
  item,
  open,
  onOpenChange,
  onLeaving,
}: {
  item: Doc<"items">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeaving: (leaving: boolean) => void;
}) {
  const t = useI18n();
  const router = useRouter();
  const removeItem = useMutation(api.items.remove);
  // The sides are on the Item; its more photos come with the photo links,
  // which the photos section already holds, so this resolves at once.
  const photos = useQuery(
    api.photos.ofItem,
    open ? { itemId: item._id } : "skip",
  );
  const count =
    [item.frontPhoto, item.backPhoto].filter(Boolean).length +
    (photos?.more.length ?? 0);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteItem.title", { title: item.title })}
      description={
        count > 0 ? t("deleteItem.bodyPhotos", { count }) : t("deleteItem.body")
      }
      confirmLabel={t("deleteItem.confirm")}
      cancelLabel={t("deleteItem.cancel")}
      destructive
      onConfirm={async () => {
        onLeaving(true);
        try {
          await removeItem({ itemId: item._id });
        } catch {
          onLeaving(false);
          toast.error(t("deleteItem.failed"));
          return;
        }
        toast.success(t("deleteItem.deleted"));
        router.replace("/collection");
      }}
    />
  );
}
