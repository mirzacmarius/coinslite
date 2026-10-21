"use client";

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
  disabled,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset
      disabled={disabled}
      className={cn(
        "inline-flex self-start rounded-md border bg-muted p-0.5 text-ui disabled:opacity-50",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="relative cursor-pointer has-[:disabled]:cursor-default rounded-[calc(var(--radius)-3px)] flex h-6 items-center px-2.5 font-medium text-muted-foreground has-[:checked]:bg-card has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
