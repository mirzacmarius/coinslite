"use client";

import { api } from "@coinslite/backend/convex/_generated/api";
import {
  OVERVIEW_PAGE_SIZE,
  type OverviewPage,
  combineOverviewPages,
} from "@coinslite/backend/convex/overview/pages";
import { usePaginatedQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";

/**
 * What needs attention in the signed-in person's Collection and the Sets of
 * the Catalog entries they hold, live, or undefined while they first load.
 * The server reads a page of owned Items at a time; this reads every page
 * and adds them up, as `useCollectionTotals` does the totals. When the
 * Collection grows past a page, the previous figures stay on screen until
 * the next page is in.
 */
export function useOverviewPages(): OverviewPage | undefined {
  const { results, status, loadMore } = usePaginatedQuery(
    api.overview.page,
    {},
    { initialNumItems: OVERVIEW_PAGE_SIZE },
  );

  useEffect(() => {
    if (status === "CanLoadMore") loadMore(OVERVIEW_PAGE_SIZE);
  }, [status, loadMore]);

  const complete = useMemo(
    () =>
      status === "Exhausted" && results.length > 0
        ? results.reduce(combineOverviewPages)
        : undefined,
    [results, status],
  );
  const previous = useRef<OverviewPage>(undefined);
  useEffect(() => {
    if (complete) previous.current = complete;
  }, [complete]);
  return complete ?? previous.current;
}
