"use client";

import {
  CollectionTotalsSection,
  CollectionTotalsSkeleton,
} from "@/components/collection-totals/collection-totals";
import { useLatest } from "@/lib/use-latest";
import { useShortcut } from "@/lib/use-shortcut";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { defaultSort } from "@coinslite/backend/convex/collection/view";
import { totalPieces } from "@coinslite/backend/convex/items/totals";
import { Button } from "@coinslite/ui/button";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { narrowsBeyondStatus, narrowsView } from "./collection-display";
import {
  CollectionResults,
  Pagination,
  ResultsSkeleton,
} from "./collection-results";
import { CollectionSearch } from "./collection-search";
import { useCollectionUrl } from "./collection-url";
import { DisplayMenu } from "./display-menu";
import { ExportMenu } from "./export-menu";
import { FilterButton, FilterChips } from "./filter-menu";
import { type FilterDimension, useFilters } from "./filter-options";
import { ImportDialog } from "./import-dialog";
import { MoveToAlbumBar } from "./move-to-album-bar";
import { StartCard } from "./start-card";
import { useCollectionDisplay } from "./use-collection-display";
import { useItemSelection } from "./use-item-selection";

/** The toolbar's place while the Collection loads. */
const toolbarSkeleton = <div className="h-10 border-b" aria-hidden="true" />;

/** CollectionBrowser before the page knows its URL. */
export function BrowserSkeleton() {
  return (
    <>
      {toolbarSkeleton}
      <CollectionTotalsSkeleton />
      <ResultsSkeleton />
    </>
  );
}

/**
 * The toolbar and the filters that are on, at the top where they're always
 * in reach, then the totals, then one page of Items.
 */
export function CollectionBrowser() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const format = useFormatters();
  const { view, page, update, goToPage, clearAll } = useCollectionUrl();
  const [display, changeDisplay] = useCollectionDisplay();
  const { shown: result, loading } = useLatest(
    useQuery(api.collection.page, {
      view,
      page,
      pageSize: display.pageSize,
      locale,
    }),
  );
  // The filter options' counts are read only while a list of them shows:
  // the Filter menu's, or an active filter's chip's.
  const [filterOpen, setFilterOpen] = useState(false);
  const [openChip, setOpenChip] = useState<FilterDimension | null>(null);
  const counts = useQuery(
    api.collection.filterCounts,
    filterOpen || openChip !== null ? { view, locale } : "skip",
  );
  const filters = useFilters(result, counts, view);
  const [importing, setImporting] = useState(false);
  // Keyed and first in every branch below, so it stays mounted (and keeps
  // its progress) as the first imported batch fills an empty Collection.
  const importDialog = (
    <ImportDialog key="import" open={importing} onOpenChange={setImporting} />
  );
  const search = useRef<HTMLInputElement>(null);
  const selection = useItemSelection();
  const { add: selectItems, start: startSelecting } = selection;
  const pageItems = result?.items;
  // Picking Items to add to an Album (its "Add Items"): select mode from the
  // start, and leaving it goes back to the Album.
  const router = useRouter();
  const addTo = view.notInAlbum as Id<"albums"> | undefined;
  const selecting = selection.selecting || addTo !== undefined;
  const stopSelecting = useCallback(
    () => (addTo ? router.push(`/albums/${addTo}`) : selection.stop()),
    [addTo, router, selection.stop],
  );
  useEffect(() => {
    if (addTo) startSelecting();
  }, [addTo, startSelecting]);

  // In select mode, Esc leaves it and Cmd/Ctrl+A selects the page.
  useShortcut("Escape", stopSelecting, selecting);
  useShortcut(
    "mod+a",
    () => pageItems && selectItems(pageItems),
    selecting && pageItems !== undefined,
  );

  const narrowed =
    view.search !== undefined || filters.some((filter) => filter.active);
  // No toolbar while the Collection loads, or while it holds nothing yet.
  const toolbar =
    result !== undefined && (result.collectionSize > 0 || narrowed);
  // "/" finds, "F" filters.
  useShortcut("/", () => search.current?.focus(), toolbar);
  useShortcut("f", () => setFilterOpen(true), toolbar);

  // Keyed, so it stays mounted (and open or collapsed) as the rest changes.
  // With a search or filter on, the view's totals lead (null while they load).
  const totals = (
    <CollectionTotalsSection
      key="totals"
      narrowed={narrowsView(view)}
      sold={view.status === "sold"}
      viewTotals={
        narrowsBeyondStatus(view) ? (result?.viewTotals ?? null) : undefined
      }
    />
  );

  if (result === undefined) {
    return (
      <>
        {importDialog}
        {toolbarSkeleton}
        {totals}
        <ResultsSkeleton />
      </>
    );
  }

  // Nothing narrows the default view, yet it's empty: every Item is sold.
  const allSold = !narrowsView(view) && result.soldCount > 0;

  // A Collection with nothing in it yet: no toolbar, just the ways to start.
  if (!toolbar) {
    return (
      <>
        {importDialog}
        {totals}
        <div className="p-4">
          <StartCard
            title={t("items.emptyTitle")}
            description={t("items.emptyDescription")}
            onImport={() => setImporting(true)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {importDialog}
      <div className="sticky top-10 z-20 flex h-10 items-center justify-between gap-2 border-b bg-background px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <FilterButton
            filters={filters}
            onChange={update}
            open={filterOpen}
            onOpenChange={setFilterOpen}
          />
          <CollectionSearch
            ref={search}
            value={view.search}
            onChange={(text) =>
              update({ search: text.trim() ? text : undefined }, "replace")
            }
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DisplayMenu
            display={display}
            onDisplayChange={(change) => {
              changeDisplay(change);
              // A new page size starts again at the first page.
              if (change.pageSize && change.pageSize !== display.pageSize)
                goToPage(1);
            }}
            sort={view.sort ?? defaultSort}
            onSortChange={(sort) => update({ sort })}
          />
          <ExportMenu
            onImport={() => setImporting(true)}
            view={view}
            count={result.total}
            pieces={totalPieces(result.viewTotals)}
            complete={result.complete}
          />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-pressed={selecting}
            onClick={selecting ? stopSelecting : selection.start}
          >
            <ListChecks strokeWidth={1.75} aria-hidden="true" />
            {selecting ? t("collection.done") : t("collection.select")}
          </Button>
        </div>
      </div>
      <FilterChips
        filters={filters}
        onChange={update}
        onClearAll={clearAll}
        open={openChip}
        onOpenChange={(dimension, open) =>
          setOpenChip((current) =>
            open ? dimension : current === dimension ? null : current,
          )
        }
      />
      {totals}
      {!result.complete && (
        <p className="border-b px-4 py-2 text-xs text-muted-foreground">
          {t("collection.incomplete", {
            count: format.number(result.collectionSize),
          })}
        </p>
      )}
      <div
        aria-busy={loading}
        className={cn(
          "transition-opacity duration-150",
          loading && "opacity-60",
        )}
      >
        {result.total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <p>
              {result.collectionSize === 0
                ? t("items.emptyTitle")
                : allSold
                  ? t("collection.allSold")
                  : t("collection.noMatchesTitle")}
            </p>
            {allSold && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => update({ status: "sold" })}
              >
                {t("collection.showSold")}
              </Button>
            )}
            {narrowed && (
              <Button variant="ghost" size="xs" onClick={clearAll}>
                {t("collection.clearFilters")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <CollectionResults
              result={result}
              layout={display.layout}
              selection={selecting ? selection : undefined}
            />
            <Pagination
              result={result}
              pageSize={display.pageSize}
              onPageChange={(next) => {
                goToPage(next);
                // Phones scroll the window; wider screens the shell's panel.
                window.scrollTo({ top: 0 });
                document.getElementById("main")?.scrollTo({ top: 0 });
              }}
            />
          </>
        )}
      </div>
      {selecting && (
        <MoveToAlbumBar
          selection={selection}
          result={result}
          view={view}
          addTo={addTo}
          onLeave={addTo ? stopSelecting : undefined}
        />
      )}
    </>
  );
}
