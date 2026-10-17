import type * as React from "react";

/** One step of signing in or up: a title, a short line, the form, and links below. */
export function AuthPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[22.5rem] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium">{title}</h1>
        {description && (
          <p className="text-ui text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {footer && (
        <div className="flex flex-col gap-1 text-ui text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

/** A form-level message, e.g. "That code didn't work" or "We sent a new code". */
export type FormMessageState = { tone: "error" | "info"; text: string };

/** Shows a form-level message; announced when it appears. */
export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: FormMessageState["tone"];
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "text-xs text-destructive"
          : "text-xs text-muted-foreground"
      }
    >
      {children}
    </p>
  );
}

export const authLink =
  "font-medium text-foreground underline-offset-4 hover:underline";

/** Stands in for a step while its form is on its way: shown on a page load only. */
export function AuthPanelSkeleton() {
  return (
    <div
      className="flex w-full max-w-[22.5rem] flex-col gap-6"
      aria-busy="true"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-2">
        <div className="h-5 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-3.5 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-8 animate-pulse rounded-md bg-muted" />
        <div className="h-8 animate-pulse rounded-md bg-muted" />
        <div className="h-8 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
