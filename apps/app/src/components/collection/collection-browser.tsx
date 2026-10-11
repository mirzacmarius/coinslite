"use client";

import {
  CollectionTotalsSection,
  CollectionTotalsSkeleton,
} from "@/components/collection-totals/collection-totals";
import { isTyping, useAddItem } from "@/components/items/add-item";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Id } from "@coinslite/backend/convex/_generated/dataModel";
import { defaultSort } from "@coinslite/backend/convex/collection/view";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { Coins, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { narrowsView } from "./collection-display";
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
import { type BrowseResult, useFilters } from "./filter-options";
import { MoveToAlbumBar } from "./move-to-album-bar";
import { useCollectionDisplay } from "./use-collection-display";
import { useItemSelection } from "./use-item-selection";

/**
 * The latest result, kept on screen while the next one loads, so changing
 * the search, a filter or the page doesn't flash a skeleton.
 */
function useLatest(result: BrowseResult | undefined) {
  const [latest, setLatest] = useState(result);
  if (result !== undefined && result !== latest) setLatest(result);
  return { shown: result ?? latest, loading: result === undefined };
}

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
  const addItem = useAddItem();
  const { view, page, update, goToPage, clearAll } = useCollectionUrl();
  const [display, changeDisplay] = useCollectionDisplay();
  const { shown: result, loading } = useLatest(
    useQuery(api.collection.browse, {
      view,
      page,
      pageSize: display.pageSize,
      locale,
    }),
  );
  const filters = useFilters(result, view);
  const [filterOpen, setFilterOpen] = useState(false);
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
  useEffect(() => {
    if (!selecting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isTyping(event.target) ||
        document.querySelector('[role=dialog][data-state="open"]') ||
        document.querySelector('[role=menu][data-state="open"]')
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        stopSelecting();
      } else if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "a" &&
        pageItems
      ) {
        event.preventDefault();
        selectItems(pageItems);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selecting, stopSelecting, selectItems, pageItems]);

  // "/" finds, "F" filters, unless someone is typing or a dialog is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target) ||
        document.querySelector('[role=dialog][data-state="open"]') ||
        // No toolbar while the Collection is empty.
        !search.current
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        search.current?.focus();
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFilterOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const narrowed =
    view.search !== undefined || filters.some((filter) => filter.active);
  // Keyed, so it stays mounted (and open or collapsed) as the rest changes.
  const totals = (
    <CollectionTotalsSection key="totals" narrowed={narrowsView(view)} />
  );

  if (result === undefined) {
    return (
      <>
        {toolbarSkeleton}
        {totals}
        <ResultsSkeleton />
      </>
    );
  }

  // A Collection with nothing in it yet: no toolbar, just the way to start.
  if (result.collectionSize === 0 && !narrowed) {
    return (
      <>
        {totals}
        <div className="p-4">
          <EmptyState
            icon={
              <Coins className="size-4" strokeWidth={1.75} aria-hidden="true" />
            }
            title={t("items.emptyTitle")}
            description={t("items.emptyDescription")}
            action={<Button onClick={() => addItem()}>{t("items.add")}</Button>}
          />
        </div>
      </>
    );
  }

  return (
    <>
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
            view={view}
            count={result.total}
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
      <FilterChips filters={filters} onChange={update} onClearAll={clearAll} />
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
                : t("collection.noMatchesTitle")}
            </p>
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
                window.scrollTo({ top: 0 });
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
