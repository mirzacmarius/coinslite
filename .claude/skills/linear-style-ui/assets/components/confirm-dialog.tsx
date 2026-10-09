"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { buttonVariants } from "./button";
import { cn } from "../utils";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the thing: "Delete '2 øre 1918'?" */
  title: string;
  /** States the consequence with numbers. */
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  /** May be async; the dialog shows a spinner and closes when it resolves. */
  onConfirm: () => void | Promise<void>;
};

/**
 * ~400px confirmation. Focus lands on Cancel (first in DOM), Enter on the
 * destructive button confirms, Esc cancels.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false);

  return (
    <AlertDialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <AlertDialogContent className="gap-3 rounded-lg p-4 sm:max-w-[400px]">
        <AlertDialogHeader className="gap-1 text-left">
          <AlertDialogTitle className="text-sm font-medium">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <AlertDialogCancel
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mt-0",
            )}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({
              variant: destructive ? "destructive" : "default",
              size: "sm",
            })}
            disabled={pending}
            onClick={async (e) => {
              e.preventDefault();
              setPending(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setPending(false);
              }
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
