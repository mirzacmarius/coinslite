"use client";

import { type CloseRequest, asksBeforeClosing } from "@/lib/discard-changes";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { useI18n } from "@/locales/client";
import { Button } from "@coinslite/ui/button";
import { ConfirmDialog } from "@coinslite/ui/confirm-dialog";
import { Dialog } from "@coinslite/ui/dialog";
import type * as React from "react";
import { createContext, useContext, useRef, useState } from "react";

/** Closes the dialog dropping its input, as Cancel does (FormDialogCancel). */
const CancelContext = createContext<() => void>(() => {});

/**
 * The dialog around a form. While the form has changes, closing it (Esc, the
 * backdrop, the close button or Cancel) first asks "Discard changes?", a new
 * deployment's reload waits, and leaving the page asks too. An unchanged form
 * closes straight away. Closing after a save calls `onOpenChange` itself, so
 * it doesn't ask. Keep editing puts focus back where it was in the form.
 *
 * A form that `keepsDraft` (New Item) closes without asking and keeps its
 * input for next time, except through its Cancel button (FormDialogCancel):
 * that asks, then drops the input with `onDiscard`.
 */
export function FormDialog({
  open,
  onOpenChange,
  changed,
  keepsDraft,
  onDiscard,
  children,
}: Omit<CloseRequest, "open" | "discarding"> & {
  open: boolean;
  /** Leave it out to keep the dialog open, e.g. while it saves. */
  onOpenChange?: (open: boolean) => void;
  /** Drops a kept draft, when Cancel closes a form that `keepsDraft`. */
  onDiscard?: () => void;
  children: React.ReactNode;
}) {
  const t = useI18n();
  // Whether the question is open, and whether it's Cancel's, which drops the draft.
  const [asking, setAsking] = useState<{ discarding: boolean }>();
  // What had focus when the question opened, to return to on Keep editing.
  const focusedBefore = useRef<HTMLElement | null>(null);
  useUnsavedInput(open && changed);
  const close = (discarding: boolean) => {
    if (!onOpenChange) return;
    if (asksBeforeClosing({ open: false, changed, keepsDraft, discarding })) {
      focusedBefore.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setAsking({ discarding });
      return;
    }
    if (discarding) onDiscard?.();
    onOpenChange(false);
  };
  return (
    <CancelContext.Provider value={() => close(true)}>
      <Dialog
        open={open}
        onOpenChange={
          onOpenChange &&
          ((next) => {
            if (next) onOpenChange(next);
            else close(false);
          })
        }
      >
        {children}
      </Dialog>
      <ConfirmDialog
        open={asking !== undefined}
        onOpenChange={(next) => {
          if (next) return;
          setAsking(undefined);
          // Kept editing: the question returns focus to <body> otherwise, and
          // then typing, Cmd/Ctrl+Enter and Esc no longer reach the form.
          const target = focusedBefore.current;
          focusedBefore.current = null;
          requestAnimationFrame(() => {
            if (target?.isConnected) target.focus();
          });
        }}
        title={t("discardChanges.title")}
        description={t("discardChanges.description")}
        confirmLabel={t("discardChanges.discard")}
        cancelLabel={t("discardChanges.keepEditing")}
        destructive
        onConfirm={() => {
          focusedBefore.current = null;
          if (asking?.discarding) onDiscard?.();
          onOpenChange?.(false);
        }}
      />
    </CancelContext.Provider>
  );
}

/**
 * A form dialog's Cancel button: closes it and drops what was typed, asking
 * first when there is something to drop, also in a form that otherwise keeps
 * its draft.
 */
export function FormDialogCancel({ children }: { children: React.ReactNode }) {
  const cancel = useContext(CancelContext);
  return (
    <Button type="button" variant="ghost" onClick={cancel}>
      {children}
    </Button>
  );
}
