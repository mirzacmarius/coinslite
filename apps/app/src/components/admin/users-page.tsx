"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useLatest } from "@/lib/use-latest";
import { useShortcut } from "@/lib/use-shortcut";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  type SortOrder,
  type UserSort,
  firstOrder,
  planFilters,
  userSearchMatches,
} from "@coinslite/backend/convex/admin/userList";
import { Badge } from "@coinslite/ui/badge";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coinslite/ui/table";
import { cn } from "@coinslite/ui/utils";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ChevronDown, ChevronUp, Loader2, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { UserSearch } from "./user-search";
import { type UsersView, useUsersUrl } from "./users-url";

type ListedUser = FunctionReturnType<
  typeof api.admin.users.search
>["users"][number];

/** People per page of the list. */
const pageSize = 50;

/**
 * Every user, for admins to look people up and support them: searched by
 * name or email, narrowed to a plan and sorted by any column. Read-only;
 * a row opens the person's detail. Everyone else finds nothing here; the
 * backend refuses them too.
 */
export function UsersPage() {
  const t = useI18n();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  return (
    <>
      <HeaderBar title={t("adminUsers.title")} />
      {isAdmin === false ? (
        <NotAvailable />
      ) : (
        // The view is in the URL, which is request data (ADR 0004).
        <Suspense fallback={<UsersSkeleton />}>
          <UsersBrowser ready={isAdmin === true} />
        </Suspense>
      )}
    </>
  );
}

/** For anyone who isn't an admin. */
export function NotAvailable() {
  const t = useI18n();
  return (
    <div className="p-4">
      <EmptyState
        icon={
          <ShieldOff className="size-4" strokeWidth={1.75} aria-hidden="true" />
        }
        title={t("adminUsers.notAvailable")}
        description={t("adminUsers.notAvailableDescription")}
      />
    </div>
  );
}

/** The toolbar and the users the URL's view asks for. */
function UsersBrowser({ ready }: { ready: boolean }) {
  const t = useI18n();
  const { view, update } = useUsersUrl();
  const search = useRef<HTMLInputElement>(null);
  const searching = view.search.trim() !== "";
  const shape = { plan: view.plan, sort: view.sort, order: view.order };
  const found = useQuery(
    api.admin.users.search,
    ready && searching ? { ...shape, text: view.search } : "skip",
  );
  const list = usePaginatedQuery(
    api.admin.users.list,
    ready && !searching ? shape : "skip",
    { initialNumItems: pageSize },
  );
  const { shown, loading } = useLatest(
    searching
      ? found?.users
      : list.status === "LoadingFirstPage"
        ? undefined
        : list.results,
  );
  const narrowed = searching || view.plan !== "all";

  // "/" finds.
  useShortcut("/", () => search.current?.focus());

  return (
    <>
      <div className="flex h-10 items-center justify-between gap-2 border-b px-4">
        <UserSearch
          ref={search}
          value={view.search}
          onChange={(text) => update({ search: text }, "replace")}
        />
        <SegmentedControl
          label={t("adminUsers.plan")}
          options={planFilters.map((plan) => ({
            value: plan,
            label: t(`adminUsers.plans.${plan}`),
          }))}
          value={view.plan}
          onChange={(plan) => update({ plan })}
          className="shrink-0 self-center"
        />
      </div>
      {shown === undefined ? (
        <TableSkeleton />
      ) : (
        <div
          aria-busy={loading}
          className={cn(
            "transition-opacity duration-150",
            loading && "opacity-60",
          )}
        >
          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <p>
                {narrowed ? t("adminUsers.noMatches") : t("adminUsers.noUsers")}
              </p>
              {narrowed && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => update({ search: "", plan: "all" })}
                >
                  {t("adminUsers.clearFilters")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <UsersTable
                users={shown}
                view={view}
                onSort={(sort) =>
                  update({
                    sort,
                    order:
                      sort === view.sort
                        ? flipped(view.order)
                        : firstOrder[sort],
                  })
                }
              />
              {searching && found?.more && (
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  {t("adminUsers.moreMatches", { count: userSearchMatches })}
                </p>
              )}
              {!searching &&
                (list.status === "CanLoadMore" ||
                  list.status === "LoadingMore") && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={list.status === "LoadingMore"}
                      onClick={() => list.loadMore(pageSize)}
                    >
                      {list.status === "LoadingMore" && (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      )}
                      {t("adminUsers.showMore")}
                    </Button>
                  </div>
                )}
            </>
          )}
        </div>
      )}
    </>
  );
}

const flipped = (order: SortOrder): SortOrder =>
  order === "asc" ? "desc" : "asc";

/** The columns, each sorting the list by what it shows. */
const columns: { sort: UserSort; numeric?: boolean }[] = [
  { sort: "name" },
  { sort: "email" },
  { sort: "created" },
  { sort: "plan" },
  { sort: "planEnd" },
  { sort: "items", numeric: true },
  { sort: "albums", numeric: true },
  { sort: "lastSignIn" },
];

function UsersTable({
  users,
  view,
  onSort,
}: {
  users: ListedUser[];
  view: UsersView;
  onSort: (sort: UserSort) => void;
}) {
  const t = useI18n();
  const router = useRouter();
  const { date, number } = useFormatters();
  return (
    <Table aria-label={t("adminUsers.title")} className="whitespace-nowrap">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map(({ sort, numeric }, index) => {
            const active = sort === view.sort;
            const Arrow = view.order === "asc" ? ChevronUp : ChevronDown;
            return (
              <TableHead
                key={sort}
                aria-sort={
                  active
                    ? view.order === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                className={cn(
                  numeric && "text-right",
                  index === 0 && "pl-4",
                  index === columns.length - 1 && "pr-4",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSort(sort)}
                  className={cn(
                    "-mx-1 inline-flex h-6 items-center gap-1 rounded px-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                    active && "text-foreground",
                  )}
                >
                  {t(`adminUsers.columns.${sort}`)}
                  {active && (
                    <Arrow
                      className="size-3.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const href = `/admin/users/${user.userId}`;
          return (
            <TableRow
              key={user.userId}
              className="cursor-pointer"
              // The name is the link; the rest of the row opens it too.
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) return;
                router.push(href);
              }}
            >
              <TableCell className="max-w-[280px] pl-4">
                <span className="flex min-w-0 items-center gap-2">
                  <Link
                    href={href}
                    className={cn(
                      "truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
                      user.name === null && "text-muted-foreground",
                    )}
                  >
                    {user.name ?? t("adminUsers.noName")}
                  </Link>
                  {user.admin && (
                    <Badge variant="outline">{t("adminUsers.admin")}</Badge>
                  )}
                  {!user.signedUp && (
                    <Badge>{t("adminUsers.notSignedUp")}</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="max-w-[280px] truncate text-muted-foreground">
                {user.email ?? "–"}
              </TableCell>
              <TableCell>{date(user.createdAt)}</TableCell>
              <TableCell
                className={cn(user.plan === "free" && "text-muted-foreground")}
              >
                {t(`adminUsers.planNames.${user.plan}`)}
              </TableCell>
              <TableCell>
                {user.planEnd === null ? "–" : date(user.planEnd)}
              </TableCell>
              <TableCell className="text-right">{number(user.items)}</TableCell>
              <TableCell className="text-right">
                {number(user.albums)}
              </TableCell>
              <TableCell className="pr-4">
                {user.lastSignInAt === null ? "–" : date(user.lastSignInAt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Rows in the table's rhythm while the users load. */
function TableSkeleton() {
  return (
    <div className="divide-y" aria-hidden="true">
      <div className="h-8" />
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex h-9 items-center gap-6 px-4">
          <span className="h-3.5 w-32 animate-pulse rounded bg-muted" />
          <span className="h-3.5 w-48 animate-pulse rounded bg-muted" />
          <span className="hidden h-3.5 w-24 animate-pulse rounded bg-muted sm:block" />
        </div>
      ))}
    </div>
  );
}

/** The toolbar's place and the rows, before the URL is read. */
function UsersSkeleton() {
  return (
    <>
      <div className="h-10 border-b" aria-hidden="true" />
      <TableSkeleton />
    </>
  );
}
