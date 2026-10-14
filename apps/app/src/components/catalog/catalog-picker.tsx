"use client";

import { itemTypeIcons, itemTypes } from "@/components/items/item-fields";
import { WantedMark, useWantedKeys } from "@/components/wantlist/wantlist";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CatalogItemType,
  catalogPageSize,
} from "@coinslite/backend/convex/catalog/fields";
import { isSet, setLimits } from "@coinslite/backend/convex/catalog/setRules";
import { Button } from "@coinslite/ui/button";
import { CommandGroup, CommandItem } from "@coinslite/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@coinslite/ui/dialog";
import type { ItemType } from "@coinslite/ui/item-type-icon";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { toast } from "@coinslite/ui/toaster";
import { usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowLeft,
  Banknote,
  ChevronRight,
  Coins,
  Flag,
  Layers,
  ListChecks,
  ListOrdered,
  ListTree,
  type LucideIcon,
} from "lucide-react";
import type * as React from "react";
import { createContext, useContext, useState } from "react";
import {
  BulkAddBar,
  DuplicatesSwitch,
  isAddShortcut,
  useBulkAdd,
} from "./bulk-add";
import type { SetScope } from "./catalog-levels";
import { HeldCount } from "./catalog-rows";
import { CatalogSearch, LoadingRows, Note, SelectBox } from "./catalog-search";
import {
  type PickedCatalogEntry,
  rememberPicked,
  useRecentCatalogEntries,
} from "./recent-catalog-entries";
import { useCatalogFormat } from "./use-catalog-format";
import { type EntrySelection, useEntrySelection } from "./use-entry-selection";

export type { PickedCatalogEntry };

/** While the picker selects several entries: the selection; null while it picks one. */
const SelectingContext = createContext<EntrySelection | null>(null);

/**
 * The Catalog picker (spec 6.2), for adding an Item from a Catalog entry:
 * search the chosen Item type's entries, pick one of the six last picked on
 * this device, or browse countries and Themes down to their entries. With
 * `onAdded` it can also select several entries (or all that are missing
 * below a grouping) and add one Item of each at once.
 *
 * With `onItemTypeChange`, the Item type is picked at its top first (spec
 * 5.4): coin, banknote, or stamp, which the Catalog doesn't hold.
 */
export function CatalogPickerDialog({
  open,
  onOpenChange,
  itemType,
  onItemTypeChange,
  onPick,
  onManual,
  onAdded,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: CatalogItemType;
  /** Picks another Item type; a stamp is then added manually. */
  onItemTypeChange?: (type: ItemType) => void;
  onPick: (entry: PickedCatalogEntry) => void;
  /** "Add manually": the person types the facts in instead. */
  onManual: () => void;
  /** After adding several entries at once; without it, the picker picks one. */
  onAdded?: (count: number) => void;
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
        {onItemTypeChange && (
          <div className="border-b px-3 py-2">
            <SegmentedControl
              label={t("items.type")}
              options={itemTypes.map((type) => {
                const Icon = itemTypeIcons[type];
                return {
                  value: type,
                  label: t(`items.types.${type}`),
                  icon: <Icon strokeWidth={1.75} aria-hidden="true" />,
                };
              })}
              value={itemType}
              onChange={onItemTypeChange}
            />
          </div>
        )}
        <PickerBody
          itemType={itemType}
          onPick={(entry) => {
            rememberPicked(entry);
            onPick(entry);
          }}
          onManual={onManual}
          onAdded={onAdded}
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
  onAdded,
}: {
  itemType: CatalogItemType;
  onPick: (entry: PickedCatalogEntry) => void;
  onManual: () => void;
  onAdded?: (count: number) => void;
}) {
  const t = useI18n();
  // Kept while the person types, so clearing the search goes back to where they were.
  const [trail, setTrail] = useState<Level[]>([]);
  const recent = useRecentCatalogEntries(itemType);
  const level = trail.at(-1);
  const open = (next: Level) => setTrail((current) => [...current, next]);
  const back = () => setTrail((current) => current.slice(0, -1));
  const [selecting, setSelecting] = useState(false);
  const selection = useEntrySelection();
  const bulk = useBulkAdd({
    keys: selection.keys,
    allowDuplicates: selection.allowDuplicates,
    onAdded: (count) => onAdded?.(count),
  });
  // While selecting, how many of each recently picked entry the person holds.
  const recentHeld = useQuery(
    api.catalog.sets.heldCounts,
    selecting && recent.length > 0
      ? { keys: recent.map(({ key }) => key) }
      : "skip",
  );
  const heldOf = (key: string) =>
    recentHeld?.find((row) => row.key === key)?.held;

  return (
    <SelectingContext.Provider value={selecting ? selection : null}>
      {/* Cmd/Ctrl+Enter adds what's selected, before the list takes Enter as a choice. */}
      <div
        className="flex min-h-0 flex-col"
        onKeyDownCapture={(event) => {
          if (selecting && isAddShortcut(event)) {
            event.preventDefault();
            event.stopPropagation();
            void bulk.add();
          }
        }}
      >
        <CatalogSearch
          itemType={itemType}
          entriesOnly
          placeholder={t(`catalogPicker.placeholder.${itemType}`)}
          pickHint={t(selecting ? "sets.selectHint" : "catalogPicker.pickHint")}
          onPick={(hit) =>
            onPick({ ...hit, itemType: hit.itemType ?? itemType })
          }
          selection={selecting ? selection : undefined}
          action={
            <>
              {onAdded && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="ml-auto shrink-0"
                  aria-pressed={selecting}
                  onClick={() => setSelecting((current) => !current)}
                >
                  <ListChecks strokeWidth={1.75} aria-hidden="true" />
                  {t(selecting ? "sets.pickOne" : "sets.selectSeveral")}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={onAdded ? "shrink-0" : "ml-auto shrink-0"}
                onClick={onManual}
              >
                {t("catalogPicker.manual")}
              </Button>
            </>
          }
          idle={
            <PickerLevels
              trail={trail}
              level={level}
              recent={recent}
              heldOf={selecting ? heldOf : undefined}
              onOpen={open}
              onBack={back}
              onPick={onPick}
            />
          }
        />
        {selecting && (
          <BulkAddBar
            bulk={bulk}
            onClear={selection.clear}
            variant="docked"
            start={
              <DuplicatesSwitch
                checked={selection.allowDuplicates}
                onCheckedChange={selection.setAllowDuplicates}
              />
            }
          />
        )}
      </div>
    </SelectingContext.Provider>
  );
}

/** What the picker shows until a search starts: recently picked entries, then where browsing has got to. */
function PickerLevels({
  trail,
  level,
  recent,
  heldOf,
  onOpen: open,
  onBack: back,
  onPick,
}: {
  trail: Level[];
  level: Level | undefined;
  recent: PickedCatalogEntry[];
  /** While selecting: how many of a recently picked entry the person holds, once known. */
  heldOf?: (key: string) => number | undefined;
  onOpen: (level: Level) => void;
  onBack: () => void;
  onPick: (entry: PickedCatalogEntry) => void;
}) {
  const t = useI18n();
  return (
    <>
      {!level && recent.length > 0 && (
        <CommandGroup heading={t("catalogPicker.recent")}>
          {recent.map((entry) => (
            <EntryOption
              key={entry.key}
              value={`recent:${entry.key}`}
              entry={entry}
              held={heldOf?.(entry.key)}
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

/**
 * A Catalog entry to pick: title, then years, denomination and metal, and
 * whether it's wanted. While selecting several, choosing it selects it (or
 * lets go of it); one already held stays unselectable unless duplicates are
 * allowed.
 */
function EntryOption({
  value,
  entry,
  held,
  onPick,
}: {
  value: string;
  entry: PickedCatalogEntry;
  /** Undefined until known. */
  held?: number;
  onPick: (entry: PickedCatalogEntry) => void;
}) {
  const t = useI18n();
  const catalogFormat = useCatalogFormat();
  const selection = useContext(SelectingContext);
  const wanted = useWantedKeys()?.has(entry.key);
  const Icon = entry.itemType === "banknote" ? Banknote : Coins;
  const facts = [
    catalogFormat.years(entry.yearFrom, entry.yearTo),
    entry.denomination,
    entry.metal && t(`items.materials.${entry.metal}`),
  ]
    .filter(Boolean)
    .join(" · ");
  if (selection) {
    const selected = selection.isSelected(entry.key);
    return (
      <CommandItem
        value={value}
        disabled={held !== undefined && !selected && !selection.canSelect(held)}
        onSelect={() => selection.toggle({ key: entry.key, held: held ?? 0 })}
        className="h-8"
      >
        <SelectBox selected={selected} />
        <span className="min-w-0 shrink truncate">{entry.title}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {facts}
        </span>
        {wanted && <WantedMark />}
        {held !== undefined && <HeldCount held={held} />}
      </CommandItem>
    );
  }
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
      {wanted && <WantedMark />}
      {held !== undefined && <HeldCount held={held} />}
    </CommandItem>
  );
}

/**
 * While selecting several: "Select all missing" for the Set a level is
 * (spec 6.4), selecting every entry below it the person doesn't hold, as
 * many as one add takes. Nothing for a level that isn't a Set, or has
 * nothing missing.
 */
function SelectMissingOption({
  scope,
  title,
}: {
  scope: SetScope;
  title: string;
}) {
  const t = useI18n();
  const selection = useContext(SelectingContext);
  const set = useQuery(api.catalog.sets.get, selection ? scope : "skip");
  if (!selection || !set || "tooLarge" in set) return null;
  const missing = set.groups.flatMap((group) =>
    group.entries.filter((entry) => entry.held === 0),
  );
  if (missing.length === 0) return null;
  return (
    <CommandItem
      value={`missing:${scope.key}:${scope.denomination ?? ""}:${scope.series ?? ""}`}
      onSelect={() => {
        if (selection.selectMany(missing) > 0) {
          toast(t("sets.selectedFirst", { limit: setLimits.bulkAdd }));
        }
      }}
      className="h-8"
    >
      <ListChecks
        className="text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">
        {t("sets.selectMissingIn", { title })}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {t("sets.missingCount", { count: missing.length })}
      </span>
    </CommandItem>
  );
}

/** "Show more" as the last row of a list with another page. */
function MoreOption({
  value,
  onSelect,
}: {
  value: string;
  onSelect: () => void;
}) {
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
  const { nodeTitle } = useCatalogFormat();
  const roots = useQuery(api.catalog.browse.roots);
  if (roots === undefined) return <LoadingRows />;
  if (roots.length === 0) return <Note>{t("catalogPicker.empty")}</Note>;
  return roots.map((root) => (
    <GroupOption
      key={root.key}
      value={`node:${root.key}`}
      icon={root.kind === "theme" ? Layers : Flag}
      title={nodeTitle(root)}
      detail={format.number(root.entryCount)}
      onSelect={() =>
        onOpen({ view: "node", key: root.key, title: nodeTitle(root) })
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
  const { nodeTitle } = useCatalogFormat();
  const node = useQuery(api.catalog.browse.node, { key: level.key });
  if (node === undefined) return <LoadingRows />;
  if (node === null || node.kind === "entry") {
    return <Note>{t("catalog.notFound")}</Note>;
  }
  const selectMissing = isSet(node.entryCount) && (
    <SelectMissingOption scope={{ key: node.key }} title={nodeTitle(node)} />
  );
  if (node.countryNode && node.groupings.length === 0) {
    return (
      <>
        {selectMissing}
        <Denominations nodeKey={node.key} onOpen={onOpen} />
      </>
    );
  }
  return (
    <>
      {selectMissing}
      {node.groupings.map((grouping) => (
        <GroupOption
          key={grouping.key}
          value={`node:${grouping.key}`}
          icon={grouping.countryNode ? Flag : ListTree}
          title={nodeTitle(grouping)}
          detail={format.number(grouping.entryCount)}
          onSelect={() =>
            onOpen({
              view: "node",
              key: grouping.key,
              title: nodeTitle(grouping),
            })
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
  const seriesOptions = rows.map(({ series, firstYear, lastYear }) => {
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
  return (
    <>
      <SelectMissingOption
        scope={{ key: level.key, denomination: level.denomination }}
        title={level.title}
      />
      {seriesOptions}
    </>
  );
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
    <>
      <SelectMissingOption
        scope={{
          key: level.key,
          denomination: level.denomination,
          series: level.series,
        }}
        title={level.title}
      />
      <EntryOptions
        entries={results}
        canLoadMore={status === "CanLoadMore"}
        onLoadMore={() => loadMore(catalogPageSize)}
        onPick={onPick}
      />
    </>
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
