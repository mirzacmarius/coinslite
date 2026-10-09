"use client";

import { isTyping, useAddItem } from "@/components/items/add-item";
import { useCurrentLocale, useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { defaultSort } from "@coinslite/backend/convex/collection/view";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { useCollectionDisplay } from "./use-collection-display";

/**
 * The latest result, kept on screen while the next one loads, so changing
 * the search, a filter or the page doesn't flash a skeleton.
 */
function useLatest(result: BrowseResult | undefined) {
  const [latest, setLatest] = useState(result);
  if (result !== undefined && result !== latest) setLatest(result);
  return { shown: result ?? latest, loading: result === undefined };
}

/** The toolbar, the filters that are on, and one page of Items. */
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

  if (result === undefined) {
    return (
      <>
        <div className="h-10 border-b" aria-hidden="true" />
        <ResultsSkeleton />
      </>
    );
  }

  // A Collection with nothing in it yet: no toolbar, just the way to start.
  if (result.collectionSize === 0 && !narrowed) {
    return (
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
    );
  }

  return (
    <>
      <div className="flex h-10 items-center justify-between gap-2 border-b px-4">
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
          <ExportMenu view={view} count={result.total} />
        </div>
      </div>
      <FilterChips filters={filters} onChange={update} onClearAll={clearAll} />
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
            <CollectionResults result={result} layout={display.layout} />
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
    </>
  );
}
