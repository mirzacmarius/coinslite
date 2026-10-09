"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the thing: "Delete “2 øre 1918”?" */
  title: string;
  /** States the consequence, with numbers. */
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  /** Extra content between the description and the buttons, e.g. a checklist. */
  children?: React.ReactNode;
  /** May be async: the dialog shows a spinner and closes when it resolves. */
  onConfirm: () => void | Promise<void>;
};

/**
 * The ~400px confirmation for destructive or irreversible actions. Focus lands
 * on Cancel, Esc cancels. While `onConfirm` runs, the dialog can't be closed;
 * if it throws, the dialog stays open so the caller can show the error.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  children,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent role="alertdialog" className="gap-3 p-4 sm:max-w-[400px]">
        <DialogTitle className="text-sm font-medium">{title}</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {description}
        </DialogDescription>
        {children}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setPending(false);
              }
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
