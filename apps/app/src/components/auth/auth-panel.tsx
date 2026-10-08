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
    <div className="flex w-full max-w-[360px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium">{title}</h1>
        {description && (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {footer && (
        <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

/** A form-level message, e.g. "That code didn't work". Announced when it appears. */
export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
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
