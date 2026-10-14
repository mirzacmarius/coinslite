"use client";

import { useI18n } from "@/locales/client";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";

/**
 * "Discard changes?", asked before unsaved input is lost: Discard does
 * `onDiscard`, Keep editing (or Esc) only closes the question.
 */
export function DiscardChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  const t = useI18n();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("discardChanges.title")}
      description={t("discardChanges.description")}
      confirmLabel={t("discardChanges.discard")}
      cancelLabel={t("discardChanges.keepEditing")}
      destructive
      onConfirm={onDiscard}
    />
  );
}
