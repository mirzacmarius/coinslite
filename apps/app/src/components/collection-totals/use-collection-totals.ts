"use client";

import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CollectionTotals,
  TOTALS_PAGE_SIZE,
  combineTotals,
} from "@coinslite/backend/convex/items/totals";
import {
  type MonthValue,
  VALUE_OVER_TIME_PAGE_SIZE,
  combineValueOverTime,
  monthOf,
} from "@coinslite/backend/convex/items/valueOverTime";
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
 * Totals over the Items the signed-in person owns, or with `status` "sold"
 * over the ones they sold, live, or undefined while they first load. The server sums a page of Items at a time; this
 * reads every page and adds them up (collectionTotals.ts explains why). When
 * the Collection grows past a page, the previous totals stay on screen until
 * the next page is in.
 */
export function useCollectionTotals(
  sold?: "sold",
): CollectionTotals | undefined {
  const utcOffsetMinutes = useUtcOffsetMinutes();
  const { results, status, loadMore } = usePaginatedQuery(
    api.collectionTotals.page,
    utcOffsetMinutes === null
      ? "skip"
      : { utcOffsetMinutes, ...(sold && { status: sold }) },
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
  // Kept per status: owned totals never stand in for sold ones.
  const previous = useRef<{ sold?: "sold"; totals: CollectionTotals }>(
    undefined,
  );
  useEffect(() => {
    if (complete) previous.current = { sold, totals: complete };
  }, [complete, sold]);

  const kept = previous.current;
  return complete ?? (kept && kept.sold === sold ? kept.totals : undefined);
}

/**
 * "Value over time" for the signed-in person's Collection, live, or undefined
 * while it first loads: the server works out a page of Items at a time, this
 * reads every page and adds them up, through the viewer's current month.
 */
export function useValueOverTime(): MonthValue[] | undefined {
  const utcOffsetMinutes = useUtcOffsetMinutes();
  const throughMonth =
    utcOffsetMinutes === null ? null : monthOf(Date.now(), utcOffsetMinutes);
  const { results, status, loadMore } = usePaginatedQuery(
    api.collectionTotals.valueOverTimePage,
    utcOffsetMinutes === null || throughMonth === null
      ? "skip"
      : { utcOffsetMinutes, throughMonth },
    { initialNumItems: VALUE_OVER_TIME_PAGE_SIZE },
  );

  useEffect(() => {
    if (status === "CanLoadMore") loadMore(VALUE_OVER_TIME_PAGE_SIZE);
  }, [status, loadMore]);

  const complete = useMemo(
    () =>
      status === "Exhausted"
        ? results.reduce(combineValueOverTime, [])
        : undefined,
    [results, status],
  );
  const previous = useRef<MonthValue[]>(undefined);
  useEffect(() => {
    if (complete) previous.current = complete;
  }, [complete]);
  return complete ?? previous.current;
}
