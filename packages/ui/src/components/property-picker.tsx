"use client";

import { Check, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type PropertyOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Muted text after the label, e.g. a currency's name. */
  hint?: string;
  /** Shown on the right, e.g. how many Items have this value. */
  count?: number;
};

/**
 * A structured value shown as a small pill; clicking it opens a searchable
 * list. The same pill appears in create dialogs, property panels and filters.
 */
export function PropertyPicker<T extends string>({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  placeholder,
  noResults,
  id,
  "aria-describedby": describedBy,
  align = "start",
  className,
}: {
  /** The property's name, e.g. "Home currency"; also the search placeholder. */
  label: string;
  icon: LucideIcon;
  value: T | undefined;
  options: PropertyOption<T>[];
  onChange: (value: T) => void;
  /** Shown in muted text when there is no value, e.g. "Set Grade". */
  placeholder?: string;
  noResults: string;
  id?: string;
  /** Links a hint or error, e.g. when the pill sits in a labelled Field. */
  "aria-describedby"?: string;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const shown = selected?.label ?? placeholder ?? label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant={selected ? "subtle" : "ghost"}
          size="xs"
          aria-label={`${label}: ${shown}`}
          aria-describedby={describedBy}
          className={cn("max-w-full self-start justify-start", className)}
        >
          {selected?.icon ?? (
            <Icon
              className="text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
          >
            {shown}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align}>
        <Command>
          <CommandInput placeholder={label} />
          <CommandList>
            <CommandEmpty>{noResults}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.hint ?? ""}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                  {option.hint && (
                    <span className="truncate text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    {option.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {option.count}
                      </span>
                    )}
                    {option.value === value && (
                      <Check className="text-primary" aria-hidden="true" />
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
