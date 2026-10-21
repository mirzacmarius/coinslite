"use client";

import { type CloseRequest, asksBeforeClosing } from "@/lib/discard-changes";
import { useUnsavedInput } from "@/lib/unsaved-input";
import { Button } from "@coinslite/ui/button";
import { Dialog } from "@coinslite/ui/dialog";
import { DiscardChangesDialog } from "./discard-changes-dialog";
import type * as React from "react";
import { createContext, useContext, useRef, useState } from "react";

/** Closes the dialog, asking first while it has changes (FormDialogCancel). */
const CancelContext = createContext<(() => void) | null>(null);

/**
 * The dialog around a form. While the form has changes, closing it (Esc, the
 * backdrop, the close button or Cancel) first asks "Discard changes?", a new
 * deployment's reload waits, and leaving the page asks too. An unchanged form
 * closes straight away. Closing after a save calls `onOpenChange` itself, so
 * it doesn't ask. Keep editing puts focus back where it was in the form.
 */
export function FormDialog({
  open,
  onOpenChange,
  changed,
  children,
}: Omit<CloseRequest, "open"> & {
  open: boolean;
  /** Leave it out to keep the dialog open, e.g. while it saves. */
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  // Whether the question is open.
  const [asking, setAsking] = useState(false);
  // What had focus when the question opened, to return to on Keep editing.
  const focusedBefore = useRef<HTMLElement | null>(null);
  useUnsavedInput(open && changed);
  const close = () => {
    if (!onOpenChange) return;
    if (asksBeforeClosing({ open: false, changed })) {
      focusedBefore.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setAsking(true);
      return;
    }
    onOpenChange(false);
  };
  return (
    <CancelContext.Provider value={close}>
      <Dialog
        open={open}
        onOpenChange={
          onOpenChange &&
          ((next) => {
            if (next) onOpenChange(next);
            else close();
          })
        }
      >
        {children}
      </Dialog>
      <DiscardChangesDialog
        open={asking}
        onOpenChange={(next) => {
          if (next) return;
          setAsking(false);
          // Kept editing: the question returns focus to <body> otherwise, and
          // then typing, Cmd/Ctrl+Enter and Esc no longer reach the form.
          const target = focusedBefore.current;
          focusedBefore.current = null;
          requestAnimationFrame(() => {
            if (target?.isConnected) target.focus();
          });
        }}
        onDiscard={() => {
          focusedBefore.current = null;
          onOpenChange?.(false);
        }}
      />
    </CancelContext.Provider>
  );
}

/**
 * A FormDialog's Cancel: closes it and drops what was typed, asking first
 * when there is something to drop, as a `DialogClose` Cancel does too.
 */
export function FormDialogCancel({ children }: { children: React.ReactNode }) {
  const cancel = useContext(CancelContext);
  if (!cancel) throw new Error("FormDialogCancel belongs inside a FormDialog.");
  return (
    <Button type="button" variant="ghost" onClick={cancel}>
      {children}
    </Button>
  );
}
