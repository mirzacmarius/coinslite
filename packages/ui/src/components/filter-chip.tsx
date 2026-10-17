"use client";

import { type LucideIcon, X } from "lucide-react";
import type * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * One filter that's on, under a list's toolbar: the filter's name, its value
 * (click to change it in a popover) and a button to remove it.
 */
export function FilterChip({
  icon: Icon,
  label,
  value,
  valueIcon,
  removeLabel,
  onRemove,
  open,
  onOpenChange,
  children,
}: {
  icon: LucideIcon;
  /** The filter's name, e.g. "Album". */
  label: string;
  /** The chosen value as people read it, e.g. "Travel". */
  value: string;
  valueIcon?: React.ReactNode;
  /** e.g. "Remove filter: Album". */
  removeLabel: string;
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The value picker the chip opens. */
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex h-7 max-w-full items-stretch divide-x overflow-hidden rounded-md border text-ui">
      <span className="flex items-center gap-1.5 px-2 text-muted-foreground">
        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </span>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${label}: ${value}`}
            className="flex min-w-0 items-center gap-1.5 px-2 outline-none transition-colors duration-100 hover:bg-muted focus-visible:bg-muted [&_svg]:size-4 [&_svg]:shrink-0"
          >
            {valueIcon}
            <span className="max-w-[11.25rem] truncate">{value}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[17.5rem]">{children}</PopoverContent>
      </Popover>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="flex items-center px-1.5 text-muted-foreground outline-none transition-colors duration-100 hover:bg-muted hover:text-foreground focus-visible:bg-muted"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
