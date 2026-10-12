"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { CatalogItemType } from "@coinslite/backend/convex/catalog/fields";
import type { CatalogSearchHit } from "@coinslite/backend/convex/catalog/search";
import {
  catalogSearchLimits,
  searchQueryWords,
} from "@coinslite/backend/convex/catalog/searchWords";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@coinslite/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@coinslite/ui/dialog";
import { Kbd } from "@coinslite/ui/kbd";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import {
  Banknote,
  Check,
  Coins,
  Flag,
  FolderOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { HeldCount } from "./catalog-rows";
import { useCatalogFormat } from "./use-catalog-format";
import type { SelectableEntry } from "./use-entry-selection";

export type { CatalogSearchHit };

/** How long typing pauses before the search runs, as in the Collection's search. */
const pause = 250;

/**
 * Selecting several Catalog entries instead of picking one (the Catalog
 * picker's multi-select): each entry shows whether it's selected and how
 * many the person holds, and choosing it toggles it.
 */
export type HitSelection = {
  isSelected: (key: string) => boolean;
  /** Whether an entry with `held` pieces held may be selected. */
  canSelect: (held: number) => boolean;
  toggle: (entry: SelectableEntry) => void;
};

type CatalogSearchProps = {
  /** Only this Item type's nodes, as the Catalog picker asks. */
  itemType?: CatalogItemType;
  /** Only Catalog entries, the nodes Items are made from. */
  entriesOnly?: boolean;
  onPick: (hit: CatalogSearchHit) => void;
  /** What Enter does to the highlighted result, e.g. "to open". */
  pickHint: string;
  placeholder: string;
  /** Shown until 2 characters are typed, e.g. recently picked entries. */
  idle?: React.ReactNode;
  /** A button at the end of the footer, e.g. "Add manually". */
  action?: React.ReactNode;
  /** While selecting several entries, what choosing one does instead of `onPick`. */
  selection?: HitSelection;
};

/**
 * Search the Catalog by typing a few words: results grouped by country and
 * series, at most 50, with a prompt to refine. Used on the Catalog page and
 * in the Catalog picker.
 */
export function CatalogSearch({
  itemType,
  entriesOnly,
  onPick,
  pickHint,
  placeholder,
  idle,
  action,
  selection,
}: CatalogSearchProps) {
  const t = useI18n();
  const [text, setText] = useState("");
  // What's searched for: the text, once typing pauses.
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (text === query) return;
    const timer = setTimeout(() => setQuery(text), pause);
    return () => clearTimeout(timer);
  }, [text, query]);
  const searching = searchQueryWords(text).length > 0;
  // While selecting, each entry found comes with how many the person holds.
  const latest = useQuery(
    api.catalog.search.find,
    searching && searchQueryWords(query).length > 0
      ? {
          text: query,
          itemType,
          entriesOnly,
          withHeld: selection ? true : undefined,
        }
      : "skip",
  );
  // While the next search's results load, keep showing the last ones, with
  // the text they were found for.
  const last = useRef<{ text: string; results: NonNullable<typeof latest> }>(
    undefined,
  );
  if (latest !== undefined) last.current = { text: query, results: latest };
  const shown = searching ? last.current : undefined;
  // Showing results for other text than what's typed, or none yet.
  const behind = searching && (text !== query || latest === undefined);

  return (
    <Command
      shouldFilter={false}
      loop
      label={placeholder}
      onKeyDown={(event) => {
        // Enter doesn't pick from results for older text: it searches at
        // once, and picks once the results for what's typed are in.
        if (event.key === "Enter" && behind && !event.nativeEvent.isComposing) {
          event.preventDefault();
          setQuery(text);
        }
      }}
    >
      <CommandInput
        value={text}
        onValueChange={setText}
        placeholder={placeholder}
        className="h-11 text-sm"
      />
      <CommandList className="max-h-[min(440px,60dvh)]">
        {!searching ? (
          idle ?? <Note>{t("catalogSearch.minLength")}</Note>
        ) : shown === undefined ? (
          <LoadingRows />
        ) : shown.results.groups.length === 0 ? (
          <Note>
            {t("catalogSearch.noResults", { text: shown.text.trim() })}
          </Note>
        ) : (
          shown.results.groups.map((group) => (
            <ResultGroup
              key={`${group.country ?? ""}/${group.series ?? ""}`}
              group={group}
              onPick={onPick}
              selection={selection}
            />
          ))
        )}
      </CommandList>
      <div className="flex min-h-8 shrink-0 items-center gap-3 border-t px-3 py-1.5 text-xs text-muted-foreground">
        <p aria-live="polite" className="min-w-0 flex-1">
          {shown?.results.capped &&
            t("catalogSearch.capped", { count: catalogSearchLimits.results })}
        </p>
        <span className="hidden shrink-0 items-center gap-3 sm:flex">
          <Hint keys="↑↓" label={t("catalogSearch.moveHint")} />
          <Hint keys="↵" label={pickHint} />
          <Hint keys="esc" label={t("catalogSearch.closeHint")} />
        </span>
        {action}
      </div>
    </Command>
  );
}

/** The search in a command dialog, for picking from anywhere. */
export function CatalogSearchDialog({
  open,
  onOpenChange,
  title,
  ...search
}: CatalogSearchProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:top-[12%] sm:max-w-[640px] sm:translate-y-0"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <CatalogSearch {...search} />
      </DialogContent>
    </Dialog>
  );
}

type Group = {
  country?: string;
  series?: string;
  nodes: CatalogSearchHit[];
};

function ResultGroup({
  group,
  onPick,
  selection,
}: {
  group: Group;
  onPick: (hit: CatalogSearchHit) => void;
  selection?: HitSelection;
}) {
  const t = useI18n();
  const { country } = useFormatters();
  const heading =
    [group.country && country(group.country), group.series]
      .filter(Boolean)
      .join(" · ") || t("catalogSearch.themes");
  return (
    <CommandGroup heading={heading}>
      {group.nodes.map((hit) =>
        selection && hit.kind === "entry" ? (
          <SelectableRow
            key={hit._id}
            hit={hit}
            selection={selection}
            held={hit.held}
          />
        ) : (
          <ResultRow key={hit._id} hit={hit} onPick={onPick} />
        ),
      )}
    </CommandGroup>
  );
}

const kindIcons: Record<CatalogSearchHit["kind"], LucideIcon> = {
  country: Flag,
  theme: Layers,
  grouping: FolderOpen,
  entry: Coins,
};

/** A hit's years, denomination and metal. */
function useHitFacts(hit: CatalogSearchHit) {
  const t = useI18n();
  const years =
    hit.yearFrom === undefined
      ? undefined
      : hit.yearTo === undefined || hit.yearTo === hit.yearFrom
        ? String(hit.yearFrom)
        : `${hit.yearFrom}–${hit.yearTo}`;
  return [
    years,
    hit.denomination,
    hit.metal && t(`items.materials.${hit.metal}`),
  ]
    .filter(Boolean)
    .join(" · ");
}

function ResultRow({
  hit,
  onPick,
}: {
  hit: CatalogSearchHit;
  onPick: (hit: CatalogSearchHit) => void;
}) {
  const Icon =
    hit.kind === "entry" && hit.itemType === "banknote"
      ? Banknote
      : kindIcons[hit.kind];
  const facts = useHitFacts(hit);
  const { nodeTitle } = useCatalogFormat();
  return (
    <CommandItem value={hit._id} onSelect={() => onPick(hit)} className="h-8">
      <Icon
        className="text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 shrink truncate">{nodeTitle(hit)}</span>
      {facts && (
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {facts}
        </span>
      )}
    </CommandItem>
  );
}

/** A Catalog entry found while selecting several: choosing it selects it, or lets go of it. */
function SelectableRow({
  hit,
  selection,
  held,
}: {
  hit: CatalogSearchHit;
  selection: HitSelection;
  /** Undefined until known. */
  held?: number;
}) {
  const facts = useHitFacts(hit);
  const selected = selection.isSelected(hit.key);
  return (
    <CommandItem
      value={hit._id}
      disabled={held !== undefined && !selected && !selection.canSelect(held)}
      onSelect={() => selection.toggle({ key: hit.key, held: held ?? 0 })}
      className="h-8"
    >
      <SelectBox selected={selected} />
      <span className="min-w-0 shrink truncate">{hit.title}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {facts}
      </span>
      {held !== undefined && <HeldCount held={held} />}
    </CommandItem>
  );
}

/** The checkbox of a row in a list where several can be selected; says "selected" to screen readers. */
export function SelectBox({ selected }: { selected: boolean }) {
  const t = useI18n();
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border border-input bg-card",
        selected && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {selected && (
        <Check className="!size-3.5" strokeWidth={2.5} aria-hidden="true" />
      )}
      {selected && <span className="sr-only">{t("sets.isSelected")}</span>}
    </span>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

export function LoadingRows() {
  return (
    <div className="flex flex-col gap-1 p-1" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex h-8 items-center gap-2 px-2">
          <div className="size-4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <Kbd>{keys}</Kbd>
      {label}
    </span>
  );
}
