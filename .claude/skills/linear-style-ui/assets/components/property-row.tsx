import type * as React from "react";
import { cn } from "../utils";

/**
 * One row of the right properties panel: a 96px muted label and a value.
 * The value is usually a PropertyPicker pill; read-only values are a 13px span.
 */
export function PropertyRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-7 grid-cols-[96px_1fr] items-center gap-2",
        className,
      )}
    >
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 justify-self-start">{children}</div>
    </div>
  );
}

/** A plain, non-editable value inside a PropertyRow (Metal value, source). */
export function PropertyValue({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("truncate px-2 text-[13px] leading-5", className)}
      {...props}
    />
  );
}
