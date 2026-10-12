"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  catalogErrors,
  catalogLimits,
} from "@coinslite/backend/convex/catalog/fields";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { toast } from "@coinslite/ui/toaster";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";

/**
 * Confirms deleting a Catalog node, stating what goes with it: the nodes
 * below it, and the Items linked to Catalog entries there, which keep those
 * entries' facts as their own. When they're many, the deletion finishes in
 * the background, and the tree shows the node as being deleted meanwhile.
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
  else if (deletion.inProgress)
    description = t("catalogEditor.deleteInProgress");
  else
    description = `${
      deletion.moreNodesBelow
        ? t("catalogEditor.deleteBelowMore", {
            nodes: number(catalogLimits.deleteNodes),
          })
        : t("catalogEditor.deleteBelow", { count: deletion.nodesBelow })
    } ${
      deletion.moreLinkedItems
        ? t("catalogEditor.deleteItemsMore", {
            items: number(catalogLimits.linkedItems),
          })
        : // Items are counted on the nodes counted only.
          deletion.moreNodesBelow
          ? t("catalogEditor.deleteItemsUncounted")
          : t("catalogEditor.deleteItems", { count: deletion.linkedItems })
    }`;

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
      confirmDisabled={!deletion || deletion.inProgress}
      onConfirm={async () => {
        setFailed(undefined);
        let gone: boolean | null;
        try {
          gone = await remove({ key: node.key });
        } catch (failure) {
          const code =
            failure instanceof ConvexError ? String(failure.data) : "";
          setFailed(
            code === catalogErrors.changeInProgress
              ? t("catalogEditor.errors.CHANGE_IN_PROGRESS")
              : t("catalogEditor.deleteFailed"),
          );
          throw failure;
        }
        toast.success(
          // Null from a backend from before deletions could go on in the background.
          t(
            gone === false ? "catalogEditor.deleting" : "catalogEditor.deleted",
            {
              title: node.title,
            },
          ),
        );
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
