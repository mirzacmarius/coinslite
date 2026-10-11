import { ChevronRight } from "lucide-react";
import type * as React from "react";
import { cn } from "../utils";

/**
 * The 40px bar at the top of every app screen: the page title (after its parent
 * page, if any) on the left, icon buttons and the primary action on the right.
 *
 * On phones the actions' `ActionLabel`s turn into their buttons' accessible
 * names only, so the buttons shrink to icons and the title stays readable.
 */
export function HeaderBar({
  title,
  parent,
  actions,
  className,
}: {
  title: string;
  /** A link to the parent page, e.g. the Album an Item belongs to. */
  parent?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-10 shrink-0 items-center justify-between gap-2 border-b bg-background px-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 text-[13px]">
        {parent && (
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
            {parent}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </span>
        )}
        <h1 className="truncate font-medium">{title}</h1>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1 max-md:[&_[data-action-label]]:sr-only">
          {actions}
        </div>
      )}
    </header>
  );
}

/**
 * A header action's text label. The bar shows it from tablet width up; on
 * phones it only names the button, which shows its icon alone.
 */
export function ActionLabel({ children }: { children: React.ReactNode }) {
  return <span data-action-label="">{children}</span>;
}
