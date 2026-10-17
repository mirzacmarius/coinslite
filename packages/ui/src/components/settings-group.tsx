import * as React from "react";
import { cn } from "../utils";

/**
 * A titled group on a settings page: the heading sits above a card whose
 * rows are split by hairlines.
 */
export function SettingsGroup({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 px-1">
        <h2 id={id} className="text-ui-lg font-medium">
          {title}
        </h2>
        {description && (
          <p className="text-ui text-muted-foreground">{description}</p>
        )}
      </div>
      <div
        className={cn(
          "flex flex-col divide-y rounded-xl bg-card px-4",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * One setting: its name and what it does on the left, the control on the
 * right. On phones the control drops below the text.
 */
export function SettingsRow({
  label,
  description,
  descriptionId,
  children,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** For a control to point `aria-describedby` at. */
  descriptionId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[3.75rem] flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-ui font-medium">{label}</span>
        {description && (
          <span id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

/** A setting's body that needs the card's full width, such as a form. */
export function SettingsBlock({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("py-4", className)} {...props} />;
}
