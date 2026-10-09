import type * as React from "react";
import { cn } from "../utils";

/**
 * The right properties panel of a detail view: a column of sections, each a
 * muted heading over label and value rows. Below `lg` it sits under the
 * content instead.
 */
export function PropertyPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col divide-y border-t bg-card lg:w-[280px] lg:border-l lg:border-t-0 xl:w-[300px]",
        className,
      )}
      {...props}
    />
  );
}

/** One titled group of rows in the properties panel. */
export function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 p-4">
      <h3 className="mb-1 text-xs font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A label and its read-only value; a missing value shows as a dash. Long text can `wrap`. */
export function PropertyRow({
  label,
  wrap = false,
  children,
}: {
  label: string;
  wrap?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid min-h-7 grid-cols-[112px_1fr] gap-2",
        wrap ? "items-start py-1" : "items-center",
      )}
    >
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 text-[13px]",
          wrap ? "whitespace-pre-line break-words" : "truncate",
        )}
      >
        {children || "–"}
      </span>
    </div>
  );
}
