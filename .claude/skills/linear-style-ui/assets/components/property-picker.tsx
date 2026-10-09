"use client";

import { Check, type LucideIcon, Plus } from "lucide-react";
import * as React from "react";
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
  /** Small muted text after the label, e.g. the Grading scale. */
  hint?: string;
  /** Count shown at the right, e.g. Items in an Album. */
  count?: number;
};

type Common<T extends string> = {
  /** Used for the search placeholder and the aria-label ("Album: Travel"). */
  label: string;
  icon: LucideIcon;
  options: PropertyOption<T>[];
  /** Verb shown when empty ("Add Album", "Set Grade"). */
  placeholder?: string;
  /** Text of the empty search result. */
  noResults: string;
  /** Offers `Create "query"` when the query matches nothing exactly. */
  allowCreate?: boolean;
  createLabel?: (query: string) => string;
  onCreate?: (name: string) => void;
  /** Offers a "Clear" row at the end when a value is set; single select calls `onClear`. */
  clearLabel?: string;
  onClear?: () => void;
  id?: string;
  /** Extra content pinned above the list (e.g. a Grade scale switcher). */
  header?: React.ReactNode;
  align?: "start" | "end" | "center";
  disabled?: boolean;
  className?: string;
};

export type PropertyPickerProps<T extends string> = Common<T> &
  (
    | { multiple?: false; value: T | undefined; onChange: (value: T) => void }
    | { multiple: true; value: T[]; onChange: (value: T[]) => void }
  );

/**
 * The property pill: a 28px ghost/subtle button that opens a searchable
 * Command list. The same component serves create dialogs, the right panel
 * and filter chips. With `multiple` the list stays open and rows toggle.
 */
export function PropertyPicker<T extends string>(
  props: PropertyPickerProps<T>,
) {
  const {
    label,
    icon: Icon,
    options,
    placeholder,
    noResults,
    allowCreate,
    createLabel,
    onCreate,
    clearLabel,
    onClear,
    id,
    header,
    align = "start",
    disabled,
    className,
  } = props;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedValues: T[] = props.multiple
    ? props.value
    : props.value === undefined
      ? []
      : [props.value];
  const selected = options.filter((o) => selectedValues.includes(o.value));
  const isSelected = (v: T) => selectedValues.includes(v);
  const exact = options.some(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
  );

  const pick = (v: T) => {
    if (props.multiple) {
      props.onChange(
        isSelected(v)
          ? props.value.filter((x) => x !== v)
          : [...props.value, v],
      );
    } else {
      props.onChange(v);
      setOpen(false);
    }
  };
  const clear = () => {
    if (props.multiple) props.onChange([]);
    else onClear?.();
    setOpen(false);
  };

  const pillText =
    selected.length === 0
      ? placeholder ?? label
      : selected.length <= 2
        ? selected.map((o) => o.label).join(", ")
        : `${selected[0]?.label}, ${selected[1]?.label} +${selected.length - 2}`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant={selected.length ? "subtle" : "ghost"}
          size="xs"
          disabled={disabled}
          aria-label={`${label}: ${selected.length ? pillText : placeholder ?? ""}`}
          className={cn("max-w-full justify-start", className)}
        >
          {(selected.length === 1 && selected[0]?.icon) ?? (
            <Icon className="text-muted-foreground" strokeWidth={1.75} />
          )}
          <span
            className={cn(
              "truncate",
              !selected.length && "text-muted-foreground",
            )}
          >
            {pillText}
          </span>
          {selected.length === 1 && selected[0]?.hint && (
            <span className="text-xs text-muted-foreground">
              {selected[0].hint}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={6} className="w-[240px] p-0">
        <Command>
          <CommandInput
            placeholder={label}
            value={query}
            onValueChange={setQuery}
            className="h-8 text-[13px]"
          />
          {header}
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              {noResults}
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const on = isSelected(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.hint ?? ""}`}
                    onSelect={() => pick(o.value)}
                    className="h-7 gap-2 text-[13px]"
                  >
                    {props.multiple && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-4 items-center justify-center rounded-sm border",
                          on &&
                            "border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        {on && <Check className="size-3" />}
                      </span>
                    )}
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                    {o.hint && (
                      <span className="text-xs text-muted-foreground">
                        {o.hint}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      {o.count !== undefined && (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {o.count}
                        </span>
                      )}
                      {!props.multiple && on && (
                        <Check className="size-4 text-primary" />
                      )}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {allowCreate && query.trim() && !exact && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => {
                    onCreate?.(query.trim());
                    setOpen(false);
                  }}
                  className="h-7 gap-2 text-[13px]"
                >
                  <Plus className="size-4 text-muted-foreground" />
                  <span className="truncate">
                    {createLabel?.(query.trim()) ?? `Create "${query.trim()}"`}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {clearLabel &&
              (props.multiple || onClear) &&
              selected.length > 0 &&
              !query && (
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={clear}
                    className="h-7 gap-2 text-[13px] text-muted-foreground"
                  >
                    {clearLabel}
                  </CommandItem>
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
