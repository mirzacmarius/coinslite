import type * as React from "react";
import { cn } from "../utils";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

/**
 * A labelled field in a full form: label above, then the control, an optional
 * hint and, once invalid, the error. The control gets its id and ARIA wiring.
 */
export function Field({
  id,
  label,
  labelAction,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  /** Shown at the right of the label row, e.g. a "Forgot password?" link. */
  labelAction?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: (control: ControlProps) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={id}
          className="text-xs font-medium text-muted-foreground"
        >
          {label}
        </Label>
        {labelAction}
      </div>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A checkbox with its label to the right, e.g. accepting the terms. Its error
 * shows under the label once invalid.
 */
export function CheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
  error,
  className,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
  className?: string;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(state) => onCheckedChange(state === true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5"
        />
        <label htmlFor={id} className="text-ui leading-5">
          {label}
        </label>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
