"use client";

import {
  hrefAfterDeleting,
  viewOfItemUrl,
} from "@/components/collection/collection-url";
import { useCollectionDisplay } from "@/components/collection/use-collection-display";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * Confirms deleting an Item and its photos, then goes back to the Collection
 * view the Item was opened from, at the page that showed it. Reads the URL,
 * so it must sit inside Suspense (ADR 0004). `onLeaving(true)` fires just
 * before the Item disappears, so the page can show it's leaving rather than
 * "not found".
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
  const locale = useCurrentLocale();
  const removeItem = useMutation(api.items.remove);
  const [display] = useCollectionDisplay();
  const params = useSearchParams();
  const itemParams = useMemo(
    () => new URLSearchParams(params.toString()),
    [params],
  );
  const view = useMemo(() => viewOfItemUrl(itemParams), [itemParams]);
  // Where the Item stands in that view; the Item page's arrows already ask.
  const place = useQuery(
    api.collection.neighbours,
    view ? { view, itemId: item._id, locale } : "skip",
  );
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
        // Decided first: once the Item is gone, the view no longer shows it.
        const next = hrefAfterDeleting(itemParams, place, display.pageSize);
        onLeaving(true);
        try {
          await removeItem({ itemId: item._id });
        } catch {
          onLeaving(false);
          toast.error(t("deleteItem.failed"));
          return;
        }
        toast.success(t("deleteItem.deleted"));
        router.replace(next);
      }}
    />
  );
}
