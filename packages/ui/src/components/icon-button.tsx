"use client";

import * as React from "react";
import { Button, type ButtonProps } from "./button";
import { Kbd } from "./kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export type IconButtonProps = Omit<ButtonProps, "aria-label"> & {
  /** What the button does: its accessible name and its tooltip. */
  label: string;
  /** The key that does the same, shown in the tooltip, e.g. "Esc". */
  shortcut?: React.ReactNode;
};

/**
 * A button that shows only an icon, with its label in a tooltip (and the
 * matching shortcut, when there is one) and as its accessible name. Works
 * as the child of a Radix `asChild` trigger, such as `DialogClose`.
 *
 * The tooltip shows on hover and on keyboard focus, not when a dialog
 * focuses the button as it opens after a click.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      shortcut,
      variant = "ghost",
      size = "icon-xs",
      onPointerEnter,
      onPointerLeave,
      ...props
    },
    forwardedRef,
  ) => {
    const button = React.useRef<HTMLButtonElement | null>(null);
    const hovered = React.useRef(false);
    const [open, setOpen] = React.useState(false);
    const ref = React.useCallback(
      (node: HTMLButtonElement | null) => {
        button.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );
    return (
      <Tooltip
        open={open}
        onOpenChange={(next) =>
          setOpen(
            next &&
              (hovered.current ||
                button.current?.matches(":focus-visible") === true),
          )
        }
      >
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            variant={variant}
            size={size}
            aria-label={label}
            onPointerEnter={(event) => {
              hovered.current = true;
              onPointerEnter?.(event);
            }}
            onPointerLeave={(event) => {
              hovered.current = false;
              onPointerLeave?.(event);
            }}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          {label}
          {shortcut !== undefined && (
            <Kbd className="border-background/20 bg-background/10 text-background">
              {shortcut}
            </Kbd>
          )}
        </TooltipContent>
      </Tooltip>
    );
  },
);
IconButton.displayName = "IconButton";

export { IconButton };
