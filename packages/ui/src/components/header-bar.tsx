"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "../utils";

/**
 * What every HeaderBar shows before its title from tablet width up, given by
 * the frame around the pages: the app's sidebar toggle.
 */
const HeaderBarLeadingContext = React.createContext<React.ReactNode>(null);

export const HeaderBarLeading = HeaderBarLeadingContext.Provider;

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
  parentOnPhones = true,
  actions,
  className,
}: {
  /** Text; a placeholder while the page loads. */
  title: React.ReactNode;
  /** A link to the parent page, e.g. the Album an Item belongs to. */
  parent?: React.ReactNode;
  /** False leaves the parent out on phones, so the actions get the room. */
  parentOnPhones?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  const leading = React.useContext(HeaderBarLeadingContext);
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex max-md:top-[env(safe-area-inset-top)] h-10 shrink-0 items-center justify-between gap-2 border-b bg-background px-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 text-ui">
        {leading && (
          <span className="-ml-2 mr-1 hidden shrink-0 items-center gap-2 md:flex">
            {leading}
            <span className="h-4 w-px bg-border" aria-hidden="true" />
          </span>
        )}
        {parent && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 text-muted-foreground",
              !parentOnPhones && "max-md:hidden",
            )}
          >
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
