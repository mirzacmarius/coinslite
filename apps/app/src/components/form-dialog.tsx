"use client";

import { asksBeforeClosing } from "@/lib/discard-changes";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { Dialog } from "@coinslite/ui/dialog";
import type * as React from "react";
import { useState } from "react";

/**
 * The dialog around a form. While the form has changes, closing it (Esc, the
 * backdrop, the close button or Cancel) first asks "Discard changes?", and
 * the changes hold an update reload and the leaving-page prompt. An unchanged
 * form closes straight away. Closing after a save calls `onOpenChange` itself,
 * so it doesn't ask.
 */
export function FormDialog({
  open,
  onOpenChange,
  changed,
  keepsDraft,
  children,
}: {
  open: boolean;
  /** Leave it out to keep the dialog open, e.g. while it saves. */
  onOpenChange?: (open: boolean) => void;
  /** Whether the form holds input that hasn't been saved. */
  changed: boolean;
  /** Whether closing keeps the input for next time, as the New Item dialog does. */
  keepsDraft?: boolean;
  children: React.ReactNode;
}) {
  const t = useI18n();
  const [asking, setAsking] = useState(false);
  useUnsavedInput(open && changed);
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={
          onOpenChange &&
          ((next) => {
            if (asksBeforeClosing({ open: next, changed, keepsDraft }))
              setAsking(true);
            else onOpenChange(next);
          })
        }
      >
        {children}
      </Dialog>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title={t("discardChanges.title")}
        description={t("discardChanges.description")}
        confirmLabel={t("discardChanges.discard")}
        cancelLabel={t("discardChanges.keepEditing")}
        destructive
        onConfirm={() => onOpenChange?.(false)}
      />
    </>
  );
}
