"use client";

import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type CollectionTotals,
  TOTALS_PAGE_SIZE,
  combineTotals,
  withMetalValues,
} from "@coinslite/backend/convex/items/totals";
import {
  type MonthValue,
  VALUE_OVER_TIME_PAGE_SIZE,
  combineValueOverTime,
  monthOf,
} from "@coinslite/backend/convex/items/valueOverTime";
import { spotPricesPerGram } from "@coinslite/backend/convex/spotPrices/rates";
import {
  type PaginationStatus,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
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

/** Something added up from pages, and whether some are still to come. */
export type Counted<T> = {
  sum: T;
  /**
   * Only some pages are in yet: `sum` is what those add up to, and grows as
   * the rest arrive.
   */
  counting: boolean;
};

/**
 * The pages of a paginated query (`results`, one sum each) added up with
 * `combine`, live: what the pages so far add up to, `counting` until the
 * last is in, or undefined before the first. Once complete, the sum stays on
 * screen while a change is counted again, unless `key` (what the pages are
 * of) changed.
 */
function useAddedUp<T>(
  results: T[],
  status: PaginationStatus,
  combine: (a: T, b: T) => T,
  key = "",
): Counted<T> | undefined {
  const sum = useMemo(
    () => (results.length > 0 ? results.reduce(combine) : undefined),
    [results, combine],
  );
  const complete = status === "Exhausted" ? sum : undefined;
  const previous = useRef<{ key: string; sum: T }>(undefined);
  useEffect(() => {
    if (complete !== undefined) previous.current = { key, sum: complete };
  }, [complete, key]);

  const prior = previous.current;
  const kept = prior && prior.key === key ? prior.sum : undefined;
  const shown = complete ?? kept ?? sum;
  const counting = complete === undefined && kept === undefined;
  return useMemo(
    () => (shown === undefined ? undefined : { sum: shown, counting }),
    [shown, counting],
  );
}

/** Totals as the app shows them. */
export type ShownTotals = CollectionTotals & {
  /** Only some pages are in yet: the figures grow as the rest arrive. */
  counting: boolean;
};

/**
 * Totals over the Items the signed-in person owns, or with `status` "sold"
 * over the ones they sold, live, or undefined while the first page loads.
 * The server sums a page of Items at a time; this reads every page and adds
 * them up (collectionTotals.ts explains why), showing what the pages so far
 * add up to until the last is in. The Metal values are worked out here, at
 * the latest Spot prices, so a Spot price refresh re-reads no page.
 */
export function useCollectionTotals(sold?: "sold"): ShownTotals | undefined {
  const utcOffsetMinutes = useUtcOffsetMinutes();
  const { results, status, loadMore } = usePaginatedQuery(
    api.collectionTotals.unpricedPage,
    utcOffsetMinutes === null
      ? "skip"
      : { utcOffsetMinutes, ...(sold && { status: sold }) },
    { initialNumItems: TOTALS_PAGE_SIZE },
  );
  const perDollar = useQuery(
    api.collectionTotals.perDollar,
    utcOffsetMinutes === null ? "skip" : {},
  );

  useEffect(() => {
    if (status === "CanLoadMore") loadMore(TOTALS_PAGE_SIZE);
  }, [status, loadMore]);

  // Kept per status: owned totals never stand in for sold ones.
  const added = useAddedUp(results, status, combineTotals, sold);
  return useMemo(
    () =>
      added === undefined || perDollar === undefined
        ? undefined
        : {
            ...withMetalValues(
              added.sum,
              perDollar && spotPricesPerGram(perDollar, added.sum.currency),
            ),
            counting: added.counting,
          },
    [added, perDollar],
  );
}

/**
 * "Value over time" for the signed-in person's Collection, live, or undefined
 * while the first page loads: the server works out a page of Items at a
 * time, this reads every page and adds them up, through the viewer's current
 * month, showing what the pages so far add up to until the last is in.
 */
export function useValueOverTime(): Counted<MonthValue[]> | undefined {
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

  return useAddedUp(results, status, combineValueOverTime);
}
