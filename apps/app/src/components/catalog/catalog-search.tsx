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
import { useQuery } from "convex/react";
import {
  Banknote,
  Coins,
  Flag,
  FolderOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type * as React from "react";
import { useRef, useState } from "react";

export type { CatalogSearchHit };

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
}: CatalogSearchProps) {
  const t = useI18n();
  const [text, setText] = useState("");
  const searching = searchQueryWords(text).length > 0;
  const latest = useQuery(
    api.catalog.search.find,
    searching ? { text, itemType, entriesOnly } : "skip",
  );
  // While the next keystroke's results load, keep showing the last ones.
  const previous = useRef(latest);
  if (latest !== undefined) previous.current = latest;
  const results = searching ? latest ?? previous.current : undefined;

  return (
    <Command shouldFilter={false} loop label={placeholder}>
      <CommandInput
        value={text}
        onValueChange={setText}
        placeholder={placeholder}
        className="h-11 text-sm"
      />
      <CommandList className="max-h-[min(440px,60dvh)]">
        {!searching ? (
          idle ?? <Note>{t("catalogSearch.minLength")}</Note>
        ) : results === undefined ? (
          <LoadingRows />
        ) : results.groups.length === 0 ? (
          <Note>{t("catalogSearch.noResults", { text: text.trim() })}</Note>
        ) : (
          results.groups.map((group) => (
            <ResultGroup
              key={`${group.country ?? ""}/${group.series ?? ""}`}
              group={group}
              onPick={onPick}
            />
          ))
        )}
      </CommandList>
      <div className="flex min-h-8 shrink-0 items-center gap-3 border-t px-3 py-1.5 text-xs text-muted-foreground">
        <p aria-live="polite" className="min-w-0 flex-1">
          {searching &&
            results?.capped &&
            t("catalogSearch.capped", { count: catalogSearchLimits.results })}
        </p>
        <span className="hidden shrink-0 items-center gap-3 sm:flex">
          <Hint keys="↑↓" label={t("catalogSearch.moveHint")} />
          <Hint keys="↵" label={pickHint} />
          <Hint keys="esc" label={t("catalogSearch.closeHint")} />
        </span>
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
}: {
  group: Group;
  onPick: (hit: CatalogSearchHit) => void;
}) {
  const t = useI18n();
  const { country } = useFormatters();
  const heading =
    [group.country && country(group.country), group.series]
      .filter(Boolean)
      .join(" · ") || t("catalogSearch.themes");
  return (
    <CommandGroup heading={heading}>
      {group.nodes.map((hit) => (
        <ResultRow key={hit._id} hit={hit} onPick={onPick} />
      ))}
    </CommandGroup>
  );
}

const kindIcons: Record<CatalogSearchHit["kind"], LucideIcon> = {
  country: Flag,
  theme: Layers,
  grouping: FolderOpen,
  entry: Coins,
};

function ResultRow({
  hit,
  onPick,
}: {
  hit: CatalogSearchHit;
  onPick: (hit: CatalogSearchHit) => void;
}) {
  const t = useI18n();
  const Icon =
    hit.kind === "entry" && hit.itemType === "banknote"
      ? Banknote
      : kindIcons[hit.kind];
  const years =
    hit.yearFrom === undefined
      ? undefined
      : hit.yearTo === undefined || hit.yearTo === hit.yearFrom
        ? String(hit.yearFrom)
        : `${hit.yearFrom}–${hit.yearTo}`;
  const facts = [
    years,
    hit.denomination,
    hit.metal && t(`items.materials.${hit.metal}`),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <CommandItem value={hit._id} onSelect={() => onPick(hit)} className="h-8">
      <Icon
        className="text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 shrink truncate">{hit.title}</span>
      {facts && (
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {facts}
        </span>
      )}
    </CommandItem>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function LoadingRows() {
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
