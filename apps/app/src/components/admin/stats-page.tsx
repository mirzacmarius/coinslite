"use client";

import { useHydrated } from "@/lib/use-hydrated";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { toast } from "@coinslite/ui/toaster";
import { cn } from "@coinslite/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { ChartColumn, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { useId, useState } from "react";

/**
 * How CoinsLite is doing, for admins: users, subscriptions, what everyone's
 * Collections hold and recent activity. The figures are counted in the
 * background every hour; an admin can ask for a fresh count. Everyone else
 * finds nothing here; the backend refuses them too.
 */
export function StatsPage() {
  const t = useI18n();
  const { dateTime } = useFormatters();
  const isAdminQuery = useQuery(api.admin.roles.isAdmin);
  // The workspace menu asks too; see useHydrated.
  const isAdmin = useHydrated() ? isAdminQuery : undefined;
  const stats = useQuery(api.admin.stats.get, isAdmin ? {} : "skip");
  const refresh = useMutation(api.admin.stats.refresh);
  const [starting, setStarting] = useState(false);
  const counting = starting || stats?.refreshing === true;

  const countAgain = async () => {
    setStarting(true);
    try {
      await refresh({});
    } catch {
      toast.error(t("adminStats.refreshFailed"));
    } finally {
      setStarting(false);
    }
  };

  const latest = stats?.latest;
  const figures = latest?.figures;

  return (
    <>
      <HeaderBar
        title={t("adminStats.title")}
        actions={
          latest && (
            <Button
              variant="outline"
              size="xs"
              disabled={counting}
              onClick={() => void countAgain()}
            >
              <RefreshCw
                strokeWidth={1.75}
                className={cn(counting && "animate-spin")}
                aria-hidden="true"
              />
              {counting ? t("adminStats.counting") : t("adminStats.refresh")}
            </Button>
          )
        }
      />
      {isAdmin === false ? (
        <div className="p-4">
          <EmptyState
            icon={
              <ShieldOff
                className="size-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            }
            title={t("adminStats.notAvailable")}
            description={t("adminStats.notAvailableDescription")}
          />
        </div>
      ) : (
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
          aria-busy={stats === undefined || counting}
        >
          {stats === undefined ? (
            <StatsSkeleton />
          ) : !latest || !figures ? (
            <EmptyState
              icon={
                counting ? (
                  <Loader2
                    className="size-4 animate-spin"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <ChartColumn
                    className="size-4"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )
              }
              title={
                counting
                  ? t("adminStats.countingTitle")
                  : t("adminStats.emptyTitle")
              }
              description={
                counting
                  ? t("adminStats.countingDescription")
                  : t("adminStats.emptyDescription")
              }
              action={
                !counting && (
                  <Button onClick={() => void countAgain()}>
                    {t("adminStats.countNow")}
                  </Button>
                )
              }
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {t("adminStats.countedAt", {
                  time: dateTime(latest.countedAt),
                })}
                {" · "}
                {counting ? t("adminStats.counting") : t("adminStats.hourly")}
              </p>
              <FigureSection
                title={t("adminStats.users.title")}
                description={t("adminStats.users.description")}
                figures={[
                  [t("adminStats.users.total"), figures.users.total],
                  [
                    t("adminStats.users.newLast30Days"),
                    figures.users.newLast30Days,
                  ],
                  [t("adminStats.users.premium"), figures.users.premium],
                  [t("adminStats.users.free"), figures.users.free],
                ]}
              />
              <FigureSection
                title={t("adminStats.subscriptions.title")}
                description={t("adminStats.subscriptions.description")}
                figures={[
                  [
                    t("adminStats.subscriptions.active"),
                    figures.subscriptions.active,
                  ],
                  [
                    t("adminStats.subscriptions.endingWithin30Days"),
                    figures.subscriptions.endingWithin30Days,
                  ],
                  [
                    t("adminStats.subscriptions.ended"),
                    figures.subscriptions.ended,
                  ],
                ]}
              />
              <FigureSection
                title={t("adminStats.collection.title")}
                description={t("adminStats.collection.description")}
                figures={[
                  [t("adminStats.collection.items"), figures.collection.items],
                  [t("adminStats.collection.coins"), figures.collection.coins],
                  [
                    t("adminStats.collection.banknotes"),
                    figures.collection.banknotes,
                  ],
                  [
                    t("adminStats.collection.stamps"),
                    figures.collection.stamps,
                  ],
                  [
                    t("adminStats.collection.albums"),
                    figures.collection.albums,
                  ],
                ]}
              />
              <FigureSection
                title={t("adminStats.activity.title")}
                description={t("adminStats.activity.description")}
                figures={[
                  [
                    t("adminStats.activity.itemsAddedLast24Hours"),
                    figures.activity.itemsAddedLast24Hours,
                  ],
                  [
                    t("adminStats.activity.itemsAddedLast7Days"),
                    figures.activity.itemsAddedLast7Days,
                  ],
                  [
                    t("adminStats.activity.albumsCreatedLast30Days"),
                    figures.activity.albumsCreatedLast30Days,
                  ],
                ]}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

/** Columns from phone width up, by how many figures a section has. */
const wideColumns: Record<number, string> = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
};

/**
 * A titled group of figures, each a label over its number. Two to a row on
 * phones (an odd first one takes the whole row), all in one row from there.
 */
function FigureSection({
  title,
  description,
  figures,
}: {
  title: string;
  description: string;
  figures: [label: string, value: number][];
}) {
  const id = useId();
  const { number } = useFormatters();
  const oddCount = figures.length % 2 === 1;
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-xl bg-card"
    >
      <div className="flex flex-col gap-0.5 border-b px-4 py-2.5">
        <h2 id={id} className="text-[13px] font-medium">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {/* Each figure draws its right and bottom border; the outer ones fall outside. */}
      <dl
        className={cn(
          "-mb-px -mr-px grid grid-cols-2",
          wideColumns[figures.length],
        )}
      >
        {figures.map(([label, value], index) => (
          <div
            key={label}
            className={cn(
              "flex flex-col justify-between gap-1 border-b border-r px-4 py-3",
              oddCount && index === 0 && "col-span-2 sm:col-span-1",
            )}
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {number(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The four sections' shape while the figures load. */
const skeleton = [
  ["users", 4],
  ["subscriptions", 3],
  ["collection", 5],
  ["activity", 3],
] as const;

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <span className="h-4 w-56 animate-pulse rounded bg-muted" />
      {skeleton.map(([section, count]) => (
        <div key={section} className="overflow-hidden rounded-xl bg-card">
          <div className="flex flex-col gap-1.5 border-b px-4 py-3">
            <span className="h-3.5 w-24 animate-pulse rounded bg-muted" />
            <span className="h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className={cn("grid grid-cols-2", wideColumns[count])}>
            {Array.from({ length: count }, (_, figure) => figure).map(
              (figure) => (
                <div key={figure} className="flex flex-col gap-2 px-4 py-3">
                  <span className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <span className="h-6 w-12 animate-pulse rounded bg-muted" />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
