"use client";

import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CollectionTotals,
  TOTALS_PAGE_SIZE,
  combineTotals,
} from "@coinslite/backend/convex/items/totals";
import { usePaginatedQuery } from "convex/react";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

/**
 * How many minutes ahead of UTC the viewer's clock is, or null while
 * prerendering, where there is no viewer and no clock may be read.
 */
function useUtcOffsetMinutes() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => -new Date().getTimezoneOffset(),
    () => null,
  );
}

/**
 * Totals over the signed-in person's whole Collection, live, or undefined
 * while they first load. The server sums a page of Items at a time; this
 * reads every page and adds them up (collectionTotals.ts explains why). When
 * the Collection grows past a page, the previous totals stay on screen until
 * the next page is in.
 */
export function useCollectionTotals(): CollectionTotals | undefined {
  const utcOffsetMinutes = useUtcOffsetMinutes();
  const { results, status, loadMore } = usePaginatedQuery(
    api.collectionTotals.page,
    utcOffsetMinutes === null ? "skip" : { utcOffsetMinutes },
    { initialNumItems: TOTALS_PAGE_SIZE },
  );

  useEffect(() => {
    if (status === "CanLoadMore") loadMore(TOTALS_PAGE_SIZE);
  }, [status, loadMore]);

  const complete = useMemo(
    () =>
      status === "Exhausted" && results.length > 0
        ? results.reduce(combineTotals)
        : undefined,
    [results, status],
  );
  const previous = useRef<CollectionTotals>(undefined);
  useEffect(() => {
    if (complete) previous.current = complete;
  }, [complete]);

  return complete ?? previous.current;
}
