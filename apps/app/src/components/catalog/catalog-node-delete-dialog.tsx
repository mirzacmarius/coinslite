"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { catalogLimits } from "@coinslite/backend/convex/catalog/fields";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

/**
 * Confirms deleting a Catalog node, stating what goes with it: the nodes
 * below it, and the Items linked to Catalog entries there, which keep those
 * entries' facts as their own.
 */
export function CatalogNodeDeleteDialog({
  open,
  onOpenChange,
  node,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: { key: string; title: string };
}) {
  const t = useI18n();
  const { number } = useFormatters();
  const deletion = useQuery(
    api.catalog.editor.deletion,
    open ? { key: node.key } : "skip",
  );
  const remove = useMutation(api.catalog.editor.remove);
  const [failed, setFailed] = useState<string>();

  let description: string;
  if (deletion === undefined) description = t("catalogEditor.deleteCounting");
  else if (deletion === null)
    description = t("catalogEditor.errors.CATALOG_NODE_NOT_FOUND");
  else if (deletion.tooLarge)
    description = t("catalogEditor.deleteTooLarge", {
      nodes: number(catalogLimits.deleteNodes),
      items: number(catalogLimits.linkedItems),
    });
  else
    description = `${t("catalogEditor.deleteBelow", {
      count: deletion.nodesBelow,
    })} ${t("catalogEditor.deleteItems", { count: deletion.linkedItems })}`;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFailed(undefined);
        onOpenChange(next);
      }}
      title={t("catalogEditor.deleteTitle", { title: node.title })}
      description={description}
      confirmLabel={t("catalogEditor.delete")}
      cancelLabel={t("items.cancel")}
      destructive
      confirmDisabled={!deletion || deletion.tooLarge}
      onConfirm={async () => {
        setFailed(undefined);
        try {
          await remove({ key: node.key });
        } catch (failure) {
          setFailed(t("catalogEditor.deleteFailed"));
          throw failure;
        }
        toast.success(t("catalogEditor.deleted", { title: node.title }));
      }}
    >
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          {failed}
        </p>
      )}
    </ConfirmDialog>
  );
}
