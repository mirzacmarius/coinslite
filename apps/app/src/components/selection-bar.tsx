"use client";

import { useI18n } from "@/locales/client";
import { IconButton } from "@coinslite/ui/icon-button";
import { cn } from "@coinslite/ui/utils";
import { X } from "lucide-react";
import type * as React from "react";

/**
 * The bar for acting on what's selected: how many, a way to clear the
 * selection, then the actions. Floating at the bottom of a page (a Set, the
 * Collection), or docked under the Catalog picker's list.
 */
export function SelectionBar({
  label,
  count,
  onClear,
  start,
  variant,
  children,
}: {
  /** Names the bar for screen readers. */
  label: string;
  count: number;
  onClear: () => void;
  /** Shown first, in place of the count while nothing is selected. */
  start?: React.ReactNode;
  variant: "floating" | "docked";
  children: React.ReactNode;
}) {
  const t = useI18n();
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]",
        variant === "floating"
          ? "sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-2 mt-4 rounded-lg border bg-popover px-3 py-2 shadow-lg md:bottom-4 md:mx-auto md:w-full md:max-w-[760px]"
          : "border-t px-3 py-2",
      )}
    >
      {start}
      {count > 0 && (
        <span className="flex items-center gap-1">
          <span className="font-medium tabular-nums">
            {t("sets.selected", { count })}
          </span>
          <IconButton
            type="button"
            label={t("sets.clearSelection")}
            onClick={onClear}
          >
            <X />
          </IconButton>
        </span>
      )}
      {children}
    </div>
  );
}
