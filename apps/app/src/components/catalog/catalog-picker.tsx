"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CatalogItemType,
  catalogPageSize,
} from "@coinslite/backend/convex/catalog/fields";
import { Button } from "@coinslite/ui/button";
import { CommandGroup, CommandItem } from "@coinslite/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@coinslite/ui/dialog";
import { usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowLeft,
  Banknote,
  ChevronRight,
  Coins,
  Flag,
  Layers,
  ListOrdered,
  ListTree,
  type LucideIcon,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { HeldCount } from "./catalog-rows";
import { CatalogSearch, LoadingRows, Note } from "./catalog-search";
import {
  type PickedCatalogEntry,
  rememberPicked,
  useRecentCatalogEntries,
} from "./recent-catalog-entries";
import { useCatalogFormat } from "./use-catalog-format";

export type { PickedCatalogEntry };

/**
 * The Catalog picker (spec 6.2), for adding an Item from a Catalog entry:
 * search the chosen Item type's entries, pick one of the six last picked on
 * this device, or browse countries and Themes down to their entries.
 */
export function CatalogPickerDialog({
  open,
  onOpenChange,
  itemType,
  onPick,
  onManual,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: CatalogItemType;
  onPick: (entry: PickedCatalogEntry) => void;
  /** "Add manually": the person types the facts in instead. */
  onManual: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const t = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:top-[12%] sm:max-w-[640px] sm:translate-y-0"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogTitle className="sr-only">
          {t("catalogPicker.title")}
        </DialogTitle>
        <PickerBody
          itemType={itemType}
          onPick={(entry) => {
            rememberPicked(entry);
            onPick(entry);
          }}
          onManual={onManual}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Where browsing has got to, below the countries and Themes. */
type Level =
  | { view: "node"; key: string; title: string }
  | {
      view: "series";
      key: string;
      denomination: string | null;
      title: string;
    }
  | {
      view: "entries";
      key: string;
      denomination: string | null;
      series: string | null;
      title: string;
    };

function PickerBody({
  itemType,
  onPick,
  onManual,
}: {
  itemType: CatalogItemType;
  onPick: (entry: PickedCatalogEntry) => void;
  onManual: () => void;
}) {
  const t = useI18n();
  // Kept while the person types, so clearing the search goes back to where they were.
  const [trail, setTrail] = useState<Level[]>([]);
  const recent = useRecentCatalogEntries(itemType);
  const level = trail.at(-1);
  const open = (next: Level) => setTrail((current) => [...current, next]);
  const back = () => setTrail((current) => current.slice(0, -1));

  return (
    <CatalogSearch
      itemType={itemType}
      entriesOnly
      placeholder={t(`catalogPicker.placeholder.${itemType}`)}
      pickHint={t("catalogPicker.pickHint")}
      onPick={(hit) => onPick({ ...hit, itemType: hit.itemType ?? itemType })}
      action={
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="ml-auto shrink-0"
          onClick={onManual}
        >
          {t("catalogPicker.manual")}
        </Button>
      }
      idle={
        <>
          {!level && recent.length > 0 && (
            <CommandGroup heading={t("catalogPicker.recent")}>
              {recent.map((entry) => (
                <EntryOption
                  key={entry.key}
                  value={`recent:${entry.key}`}
                  entry={entry}
                  onPick={onPick}
                />
              ))}
            </CommandGroup>
          )}
          <CommandGroup
            heading={
              trail.length === 0
                ? t("catalogPicker.browse")
                : trail.map(({ title }) => title).join(" › ")
            }
          >
            {level && (
              <CommandItem value="back" onSelect={back} className="h-8">
                <ArrowLeft
                  className="text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {t("catalogPicker.back")}
              </CommandItem>
            )}
            {!level ? (
              <Roots onOpen={open} />
            ) : level.view === "node" ? (
              <NodeLevel level={level} onOpen={open} onPick={onPick} />
            ) : level.view === "series" ? (
              <SeriesLevel level={level} onOpen={open} />
            ) : (
              <SeriesEntries level={level} onPick={onPick} />
            )}
          </CommandGroup>
        </>
      }
    />
  );
}

/** A row that opens the next level down. */
function GroupOption({
  value,
  icon: Icon,
  title,
  detail,
  onSelect,
}: {
  value: string;
  icon: LucideIcon;
  title: string;
  detail?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect} className="h-8">
      <Icon
        className="text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {detail && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {detail}
        </span>
      )}
      <ChevronRight
        className="text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </CommandItem>
  );
}

/** A Catalog entry to pick: title, then years, denomination and metal. */
function EntryOption({
  value,
  entry,
  held,
  onPick,
}: {
  value: string;
  entry: PickedCatalogEntry;
  held?: number;
  onPick: (entry: PickedCatalogEntry) => void;
}) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const Icon = entry.itemType === "banknote" ? Banknote : Coins;
  const facts = [
    catalogFormat.years(entry.yearFrom, entry.yearTo),
    entry.denomination,
    entry.metal && t(`items.materials.${entry.metal}`),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <CommandItem value={value} onSelect={() => onPick(entry)} className="h-8">
      <Icon
        className="text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 shrink truncate">{entry.title}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {facts}
      </span>
      {held !== undefined && <HeldCount held={held} />}
    </CommandItem>
  );
}

/** "Show more" as the last row of a list with another page. */
function MoreOption({
  value,
  onSelect,
}: { value: string; onSelect: () => void }) {
  const t = useI18n();
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      className="h-8 text-muted-foreground"
    >
      {t("catalog.showMore")}
    </CommandItem>
  );
}

function Roots({ onOpen }: { onOpen: (level: Level) => void }) {
  const t = useI18n();
  const format = useFormatters();
  const roots = useQuery(api.catalog.browse.roots);
  if (roots === undefined) return <LoadingRows />;
  if (roots.length === 0) return <Note>{t("catalogPicker.empty")}</Note>;
  return roots.map((root) => (
    <GroupOption
      key={root.key}
      value={`node:${root.key}`}
      icon={root.kind === "theme" ? Layers : Flag}
      title={root.title}
      detail={format.number(root.entryCount)}
      onSelect={() =>
        onOpen({ view: "node", key: root.key, title: root.title })
      }
    />
  ));
}

/**
 * A country, Theme or grouping: its groupings, then its own entries. A
 * country without groupings goes by denomination, then series.
 */
function NodeLevel({
  level,
  onOpen,
  onPick,
}: {
  level: Extract<Level, { view: "node" }>;
  onOpen: (level: Level) => void;
  onPick: (entry: PickedCatalogEntry) => void;
}) {
  const t = useI18n();
  const format = useFormatters();
  const node = useQuery(api.catalog.browse.node, { key: level.key });
  if (node === undefined) return <LoadingRows />;
  if (node === null || node.kind === "entry") {
    return <Note>{t("catalog.notFound")}</Note>;
  }
  if (node.countryNode && node.groupings.length === 0) {
    return <Denominations nodeKey={node.key} onOpen={onOpen} />;
  }
  return (
    <>
      {node.groupings.map((grouping) => (
        <GroupOption
          key={grouping.key}
          value={`node:${grouping.key}`}
          icon={node.kind === "theme" ? Flag : ListTree}
          title={grouping.title}
          detail={format.number(grouping.entryCount)}
          onSelect={() =>
            onOpen({ view: "node", key: grouping.key, title: grouping.title })
          }
        />
      ))}
      <NodeEntries nodeKey={node.key} onPick={onPick} />
    </>
  );
}

function NodeEntries({
  nodeKey,
  onPick,
}: {
  nodeKey: string;
  onPick: (entry: PickedCatalogEntry) => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.catalog.browse.entries,
    { key: nodeKey },
    { initialNumItems: catalogPageSize },
  );
  if (status === "LoadingFirstPage") return <LoadingRows />;
  return (
    <EntryOptions
      entries={results}
      canLoadMore={status === "CanLoadMore"}
      onLoadMore={() => loadMore(catalogPageSize)}
      onPick={onPick}
    />
  );
}

function Denominations({
  nodeKey,
  onOpen,
}: {
  nodeKey: string;
  onOpen: (level: Level) => void;
}) {
  const t = useI18n();
  const rows = useQuery(api.catalog.browse.denominations, { key: nodeKey });
  if (rows === undefined) return <LoadingRows />;
  if (rows.length === 0) return <Note>{t("catalog.noEntries")}</Note>;
  return rows.map(({ denomination, seriesCount }) => {
    const title = denomination ?? t("catalog.noDenomination");
    return (
      <GroupOption
        key={denomination ?? ""}
        value={`denomination:${denomination ?? ""}`}
        icon={Coins}
        title={title}
        detail={t("catalog.seriesCount", { count: seriesCount })}
        onSelect={() =>
          onOpen({ view: "series", key: nodeKey, denomination, title })
        }
      />
    );
  });
}

function SeriesLevel({
  level,
  onOpen,
}: {
  level: Extract<Level, { view: "series" }>;
  onOpen: (level: Level) => void;
}) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const rows = useQuery(api.catalog.browse.series, {
    key: level.key,
    denomination: level.denomination,
  });
  if (rows === undefined) return <LoadingRows />;
  if (rows.length === 0) return <Note>{t("catalog.noEntries")}</Note>;
  return rows.map(({ series, firstYear, lastYear }) => {
    const title = series ?? t("catalog.noSeries");
    return (
      <GroupOption
        key={series ?? ""}
        value={`series:${series ?? ""}`}
        icon={ListOrdered}
        title={title}
        detail={catalogFormat.years(firstYear, lastYear)}
        onSelect={() =>
          onOpen({
            view: "entries",
            key: level.key,
            denomination: level.denomination,
            series,
            title,
          })
        }
      />
    );
  });
}

function SeriesEntries({
  level,
  onPick,
}: {
  level: Extract<Level, { view: "entries" }>;
  onPick: (entry: PickedCatalogEntry) => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.catalog.browse.seriesEntries,
    {
      key: level.key,
      denomination: level.denomination,
      series: level.series,
    },
    { initialNumItems: catalogPageSize },
  );
  if (status === "LoadingFirstPage") return <LoadingRows />;
  return (
    <EntryOptions
      entries={results}
      canLoadMore={status === "CanLoadMore"}
      onLoadMore={() => loadMore(catalogPageSize)}
      onPick={onPick}
    />
  );
}

type BrowsedEntry = PickedCatalogEntry & { held: number };

function EntryOptions({
  entries,
  canLoadMore,
  onLoadMore,
  onPick,
}: {
  entries: Array<
    Omit<BrowsedEntry, "itemType"> & { itemType?: CatalogItemType }
  >;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onPick: (entry: PickedCatalogEntry) => void;
}): React.ReactNode {
  return (
    <>
      {entries.map(({ held, ...entry }) => (
        <EntryOption
          key={entry.key}
          value={`entry:${entry.key}`}
          entry={{ ...entry, itemType: entry.itemType ?? "coin" }}
          held={held}
          onPick={onPick}
        />
      ))}
      {canLoadMore && <MoreOption value="more" onSelect={onLoadMore} />}
    </>
  );
}
