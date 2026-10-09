"use client";

import {
  type PlanFilter,
  type SortOrder,
  type UserSort,
  defaultUserSort,
  firstOrder,
  planFilters,
  sortOrders,
  userSearchLimit,
  userSorts,
} from "@coinslite/backend/convex/admin/userList";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * The admin user list's view lives in the URL, so Back undoes a change and a
 * view can be shared with another admin: ?q=ada&plan=premium&sort=items
 * &order=asc. Defaults are left out; anything that doesn't parse is ignored.
 */
export type UsersView = {
  search: string;
  plan: PlanFilter;
  sort: UserSort;
  order: SortOrder;
};

const oneOf = <T extends string>(values: readonly T[], value: string | null) =>
  values.find((candidate) => candidate === value);

export function readUsersUrl(params: URLSearchParams): UsersView {
  const sort = oneOf(userSorts, params.get("sort")) ?? defaultUserSort;
  return {
    search: params.get("q")?.slice(0, userSearchLimit) ?? "",
    plan: oneOf(planFilters, params.get("plan")) ?? "all",
    sort,
    order: oneOf(sortOrders, params.get("order")) ?? firstOrder[sort],
  };
}

export function writeUsersUrl({ search, plan, sort, order }: UsersView) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search);
  if (plan !== "all") params.set("plan", plan);
  if (sort !== defaultUserSort) params.set("sort", sort);
  if (order !== firstOrder[sort]) params.set("order", order);
  return params;
}

/**
 * The view in the URL, and a way to change it through the browser's history
 * without reloading. Reads the URL, so it must sit inside Suspense (ADR 0004).
 */
export function useUsersUrl() {
  const params = useSearchParams();
  const view = useMemo(
    () => readUsersUrl(new URLSearchParams(params.toString())),
    [params],
  );
  const update = useCallback(
    (change: Partial<UsersView>, history: "push" | "replace" = "push") => {
      const query = writeUsersUrl({ ...view, ...change }).toString();
      const url = query ? `?${query}` : window.location.pathname;
      if (history === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [view],
  );
  return { view, update };
}
