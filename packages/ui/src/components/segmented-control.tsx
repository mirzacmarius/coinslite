"use client";

import type * as React from "react";
import { useId } from "react";
import { cn } from "../utils";

/**
 * A single choice from a few options, e.g. coin / banknote / stamp. Built on
 * native radio inputs, so arrow keys and screen readers work out of the box.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "default",
  className,
}: {
  label: string;
  /** Each option's `icon`, if any, shows before its label. */
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /** "lg": taller options sharing the full width on phones, easier to tap. */
  size?: "default" | "lg";
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset
      className={cn(
        "inline-flex self-start rounded-md border bg-muted p-0.5 text-[13px]",
        size === "lg" &&
          "flex self-stretch text-sm sm:inline-flex sm:self-start",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "relative cursor-pointer rounded-[calc(var(--radius)-3px)] flex items-center gap-1.5 font-medium text-muted-foreground has-[:checked]:bg-card has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0",
            size === "lg"
              ? "h-9 flex-1 justify-center px-3 sm:h-7 sm:flex-none"
              : "h-6 px-2.5",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.icon}
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
