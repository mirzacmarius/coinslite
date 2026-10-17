import type * as React from "react";
import { cn } from "../utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl bg-card px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-ui text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
