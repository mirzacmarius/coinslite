"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { toast } from "@coinslite/ui/toaster";
import { useMutation } from "convex/react";
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
  const photoCount = [item.frontPhoto, item.backPhoto].filter(Boolean).length;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteItem.title", { title: item.title })}
      description={
        photoCount === 2
          ? t("deleteItem.bodyTwoPhotos")
          : photoCount === 1
            ? t("deleteItem.bodyOnePhoto")
            : t("deleteItem.body")
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
