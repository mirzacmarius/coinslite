"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "../utils";

export type QuantityInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "min"
> & {
  value: number;
  /** Fires on Enter or blur with a whole number >= 1. */
  onCommit: (quantity: number) => void;
};

/** Quantity is edited in place: a 28px, 64px-wide number field, min 1. */
export const QuantityInput = React.forwardRef<
  HTMLInputElement,
  QuantityInputProps
>(({ value, onCommit, className, ...props }, ref) => {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const next = Math.floor(Number(text));
    if (Number.isFinite(next) && next >= 1 && next !== value) onCommit(next);
    else setText(String(value));
  };

  return (
    <Input
      ref={ref}
      type="number"
      min={1}
      step={1}
      inputMode="numeric"
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
          setText(String(value));
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "h-7 w-16 px-2 text-right text-[13px] tabular-nums",
        className,
      )}
      {...props}
    />
  );
});
QuantityInput.displayName = "QuantityInput";
