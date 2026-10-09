"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "../utils";

/** Parses "1 234,56" / "1,234.56" / "1234" into whole minor units, or undefined when empty/invalid. */
export function parseMoneyToMinor(text: string): number | undefined {
  const trimmed = text.replace(/\s/g, "");
  if (trimmed === "") return undefined;
  // Treat the last separator as the decimal mark; drop the others as grouping.
  const lastSep = Math.max(trimmed.lastIndexOf(","), trimmed.lastIndexOf("."));
  const normalised =
    lastSep === -1
      ? trimmed
      : `${trimmed.slice(0, lastSep).replace(/[.,]/g, "")}.${trimmed.slice(lastSep + 1)}`;
  const major = Number(normalised);
  if (!Number.isFinite(major) || major < 0) return undefined;
  return Math.round(major * 100);
}

export function minorToEditable(amountMinor: number | undefined): string {
  if (amountMinor === undefined) return "";
  return (amountMinor / 100).toFixed(2);
}

export type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  /** ISO 4217 code shown as a muted suffix inside the field. */
  currency: string;
  /** Whole minor units. */
  value: number | undefined;
  /** Fires on blur or Enter with the parsed amount. */
  onCommit: (amountMinor: number | undefined) => void;
  /** Called on Esc after the text is reverted. */
  onCancel?: () => void;
  size?: "xs" | "sm";
};

/**
 * Money field: right-aligned decimal input with the currency code as a suffix.
 * Stores minor units; commits on Enter or blur, reverts on Esc.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    { currency, value, onCommit, onCancel, size = "sm", className, ...props },
    ref,
  ) => {
    const [text, setText] = React.useState(minorToEditable(value));
    React.useEffect(() => setText(minorToEditable(value)), [value]);

    const commit = () => {
      const next = parseMoneyToMinor(text);
      if (next !== value) onCommit(next);
      else setText(minorToEditable(value));
    };

    return (
      <div
        className={cn("relative", size === "xs" ? "w-32" : "w-40", className)}
      >
        <Input
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setText(minorToEditable(value));
              onCancel?.();
              e.currentTarget.blur();
            }
          }}
          className={cn(
            "pr-12 text-right tabular-nums",
            size === "xs" && "h-7 px-2 text-[13px]",
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground"
        >
          {currency}
        </span>
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
