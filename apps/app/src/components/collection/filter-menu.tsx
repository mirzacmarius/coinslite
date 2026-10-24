"use client";

import { useI18n } from "@/locales/client";
import type { CollectionView } from "@coinslite/backend/convex/collection/view";
import { Button } from "@coinslite/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@coinslite/ui/command";
import { FilterChip } from "@coinslite/ui/filter-chip";
import { Input } from "@coinslite/ui/input";
import { Kbd } from "@coinslite/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@coinslite/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@coinslite/ui/tooltip";
import { ArrowLeft, Check, ChevronRight, ListFilter } from "lucide-react";
import { useState } from "react";
import type { Filter, FilterDimension, FilterOption } from "./filter-options";

type Change = (change: Partial<CollectionView>) => void;

/** Lower case without accents, so "kobenhavn" finds "København". */
const folded = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();

/** Matches rows on their words (keywords), never on their internal ids. */
const matchKeywords = (_value: string, search: string, keywords?: string[]) =>
  folded((keywords ?? []).join(" ")).includes(folded(search.trim())) ? 1 : 0;

/**
 * The filter list: first the filters, then one filter's options with their
 * counts. Typing at the top also finds options directly ("trav" offers
 * "Album: Travel"). Picking the option that's on turns the filter off.
 */
function FilterCommand({
  filters,
  start,
  onChange,
}: {
  filters: Filter[];
  /** Opens straight on one filter's options, with no way back. */
  start?: FilterDimension;
  onChange: Change;
}) {
  const t = useI18n();
  const [dimension, setDimension] = useState(start);
  const [query, setQuery] = useState("");
  const current = filters.find((filter) => filter.dimension === dimension);
  const back = () => {
    setDimension(undefined);
    setQuery("");
  };
  const pick = (filter: Filter, option: FilterOption) =>
    onChange(option.selected ? filter.clear : option.change);

  return (
    <Command
      filter={matchKeywords}
      onKeyDown={(event) => {
        if (event.key === "Backspace" && query === "" && current && !start) {
          event.preventDefault();
          back();
        }
      }}
    >
      <CommandInput
        placeholder={current?.label ?? t("collection.filterBy")}
        value={query}
        onValueChange={setQuery}
      />
      {current?.range && (
        <RangeForm
          range={current.range}
          onApply={(yearFrom, yearTo) => onChange({ yearFrom, yearTo })}
        />
      )}
      <CommandList>
        {current ? (
          <CommandGroup>
            {!start && (
              <CommandItem value="back" forceMount onSelect={back}>
                <ArrowLeft
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">
                  {t("collection.back")}
                </span>
              </CommandItem>
            )}
            {current.options.map((option) => (
              <OptionItem
                key={option.key}
                value={option.key}
                option={option}
                onSelect={() => pick(current, option)}
              />
            ))}
            {current.options.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                {current.counting ? "…" : t("collection.nothingToFilter")}
              </p>
            )}
          </CommandGroup>
        ) : (
          <>
            <CommandGroup>
              {filters.map((filter) => (
                <CommandItem
                  key={filter.dimension}
                  value={filter.dimension}
                  keywords={[filter.label]}
                  onSelect={() => {
                    setDimension(filter.dimension);
                    setQuery("");
                  }}
                >
                  <filter.icon
                    className="text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="truncate">{filter.label}</span>
                  <ChevronRight
                    className="ml-auto text-muted-foreground"
                    aria-hidden="true"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {query.trim() !== "" && (
              <CommandGroup>
                {filters.flatMap((filter) =>
                  filter.options.map((option) => (
                    <OptionItem
                      key={`${filter.dimension}:${option.key}`}
                      value={`${filter.dimension}:${option.key}`}
                      option={option}
                      prefix={filter.label}
                      onSelect={() => pick(filter, option)}
                    />
                  )),
                )}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </Command>
  );
}

/** A year typed in: a whole number, or undefined for anything else, blanks included. */
function yearTyped(text: string) {
  const trimmed = text.trim();
  if (!/^-?\d{1,4}$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

/**
 * The Year filter's range, typed in: from and to, either left open, applied
 * with Enter or the button. Its keys stay in the form, so the list beneath
 * neither moves nor picks on them.
 */
function RangeForm({
  range,
  onApply,
}: {
  range: NonNullable<Filter["range"]>;
  onApply: (from: number | undefined, to: number | undefined) => void;
}) {
  const t = useI18n();
  const [from, setFrom] = useState(
    range.from === undefined ? "" : String(range.from),
  );
  const [to, setTo] = useState(range.to === undefined ? "" : String(range.to));
  const typed = [yearTyped(from), yearTyped(to)];
  const empty = typed[0] === undefined && typed[1] === undefined;
  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    suggestion: number | undefined,
  ) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        inputMode="numeric"
        autoComplete="off"
        value={value}
        placeholder={suggestion === undefined ? undefined : String(suggestion)}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 px-2 text-ui"
      />
    </label>
  );
  return (
    <form
      className="flex items-end gap-1.5 border-b px-2 py-2"
      onKeyDown={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        if (empty) return;
        const [a, b] = typed;
        // A range typed backwards is meant the other way round.
        if (a !== undefined && b !== undefined && a > b) onApply(b, a);
        else onApply(a, b);
      }}
    >
      {field(t("collection.yearRange.fromLabel"), from, setFrom, range.min)}
      {field(t("collection.yearRange.toLabel"), to, setTo, range.max)}
      <Button type="submit" variant="subtle" size="xs" disabled={empty}>
        {t("collection.yearRange.apply")}
      </Button>
    </form>
  );
}

/** One option: a checkmark when it's on, its name and how many Items it would show. */
function OptionItem({
  value,
  option,
  prefix,
  onSelect,
}: {
  value: string;
  option: FilterOption;
  /** The filter's name, when options of several filters are listed together. */
  prefix?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={value}
      keywords={[option.label, option.hint ?? ""]}
      onSelect={onSelect}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {option.selected && <Check className="text-link" aria-hidden="true" />}
      </span>
      {option.icon}
      <span className="truncate">
        {prefix && <span className="text-muted-foreground">{prefix}: </span>}
        {option.label}
      </span>
      {option.hint && (
        <span className="truncate text-xs text-muted-foreground">
          {option.hint}
        </span>
      )}
      {option.count !== undefined && (
        <span className="ml-auto pl-2 text-xs tabular-nums text-muted-foreground">
          {option.count}
        </span>
      )}
    </CommandItem>
  );
}

/** The toolbar's Filter button, with how many filters are on; F opens it. */
export function FilterButton({
  filters,
  onChange,
  open,
  onOpenChange,
}: {
  filters: Filter[];
  onChange: Change;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  const active = filters.filter((filter) => filter.active).length;
  const offered = filters.filter((filter) => filter.inMenu !== false);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="xs" className="shrink-0">
              <ListFilter strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden sm:inline">{t("collection.filter")}</span>
              <span className="sr-only sm:hidden">
                {t("collection.filter")}
              </span>
              {active > 0 && (
                <span className="rounded-md bg-accent px-1 text-xs text-accent-foreground">
                  {active}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          {t("collection.filter")}
          <Kbd className="border-background/20 bg-background/10 text-background">
            F
          </Kbd>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[17.5rem]">
        {/* Each opening starts at the list of filters. */}
        {open && (
          <FilterCommand
            filters={offered}
            onChange={(change) => {
              onChange(change);
              onOpenChange(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The filters that are on, one chip each: change the value or remove the
 * filter, or clear every filter and the search at once. `open` is the chip
 * whose options are showing, if any.
 */
export function FilterChips({
  filters,
  onChange,
  onClearAll,
  open,
  onOpenChange,
}: {
  filters: Filter[];
  onChange: Change;
  onClearAll: () => void;
  open: FilterDimension | null;
  onOpenChange: (dimension: FilterDimension, open: boolean) => void;
}) {
  const t = useI18n();
  const active = filters.filter((filter) => filter.active);
  if (active.length === 0) return null;
  return (
    <section
      aria-label={t("collection.activeFilters")}
      className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2"
    >
      {active.map((filter) => (
        <ActiveFilter
          key={filter.dimension}
          filter={filter}
          onChange={onChange}
          open={open === filter.dimension}
          onOpenChange={(isOpen) => onOpenChange(filter.dimension, isOpen)}
        />
      ))}
      <Button variant="ghost" size="xs" onClick={onClearAll}>
        {t("collection.clear")}
      </Button>
    </section>
  );
}

function ActiveFilter({
  filter,
  onChange,
  open,
  onOpenChange: setOpen,
}: {
  filter: Filter;
  onChange: Change;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useI18n();
  if (!filter.active) return null;
  return (
    <FilterChip
      icon={filter.icon}
      label={filter.label}
      value={filter.active.label}
      valueIcon={filter.active.icon}
      removeLabel={t("collection.removeFilter", { name: filter.label })}
      onRemove={() => onChange(filter.clear)}
      open={open}
      onOpenChange={setOpen}
    >
      {open && (
        <FilterCommand
          filters={[filter]}
          start={filter.dimension}
          onChange={(change) => {
            onChange(change);
            setOpen(false);
          }}
        />
      )}
    </FilterChip>
  );
}
