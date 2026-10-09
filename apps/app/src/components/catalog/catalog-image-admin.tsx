"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { ImagePlus, ImageUp, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  CatalogImageDialog,
  type CatalogImageEntry,
} from "./catalog-image-dialog";

/**
 * Admins' actions on a Catalog entry's image: add one, or edit (replace or
 * re-credit) and remove it. Shows nothing to anyone else.
 */
export function CatalogImageAdmin({ entry }: { entry: CatalogImageEntry }) {
  const t = useI18n();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  const removeImage = useMutation(api.catalog.images.remove);
  const [editing, setEditing] = useState(false);
  // Each opening starts the dialog afresh from the entry.
  const [session, setSession] = useState(0);
  const [removing, setRemoving] = useState(false);
  if (!isAdmin) return null;
  const hasImage = entry.imageUrl !== undefined;

  return (
    <div className="-ml-2 flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          setSession((count) => count + 1);
          setEditing(true);
        }}
      >
        {hasImage ? (
          <ImageUp strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <ImagePlus strokeWidth={1.75} aria-hidden="true" />
        )}
        {hasImage ? t("catalogImages.edit") : t("catalogImages.add")}
      </Button>
      {hasImage && (
        <Button variant="ghost" size="xs" onClick={() => setRemoving(true)}>
          <Trash2 strokeWidth={1.75} aria-hidden="true" />
          {t("catalogImages.remove")}
        </Button>
      )}
      <CatalogImageDialog
        key={session}
        open={editing}
        onOpenChange={setEditing}
        entry={entry}
      />
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={t("catalogImages.removeTitle", { title: entry.title })}
        description={t("catalogImages.removeBody")}
        confirmLabel={t("catalogImages.remove")}
        cancelLabel={t("catalogImages.cancel")}
        destructive
        onConfirm={async () => {
          try {
            await removeImage({ key: entry.key });
            toast.success(t("catalogImages.removed"));
          } catch {
            toast.error(t("catalogImages.errors.removeFailed"));
          }
        }}
      />
    </div>
  );
}
