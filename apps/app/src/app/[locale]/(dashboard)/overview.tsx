"use client";

import {
  FiguresSkeleton,
  TotalsFigures,
} from "@/components/collection-totals/collection-totals";
import { useCollectionTotals } from "@/components/collection-totals/use-collection-totals";
import { useAddItem } from "@/components/items/add-item";
import { AddShortcuts } from "@/components/overview/add-shortcuts";
import { LatestItems } from "@/components/overview/latest-items";
import { OverviewPlanUsage } from "@/components/plans/plan-usage";
import { SpotPrices } from "@/components/spot-prices/spot-prices";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { Button } from "@coinslite/ui/button";
import { EmptyState } from "@coinslite/ui/empty-state";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { useQuery } from "convex/react";
import { Library, Plus } from "lucide-react";
import { useId } from "react";

/**
 * Where the Collection stands (spec 9): shortcuts to add an Item of each type,
 * the totals, the latest Items, and on the Free plan how much of it is used.
 * An empty Collection shows a first-run prompt instead of totals and Items.
 * The header and shortcuts need no data, so they appear the moment a link is
 * clicked.
 */
export function Overview() {
  const t = useI18n();
  const addItem = useAddItem();
  const totalsId = useId();
  const latest = useQuery(api.overview.latestItems, {});
  const totals = useCollectionTotals();
  const empty = latest?.length === 0;

  return (
    <>
      <HeaderBar title={t("dashboard.headerTitle")} />
      <div className="flex flex-col gap-4 p-4">
        <AddShortcuts />
        {!empty && (
          <section aria-labelledby={totalsId} aria-busy={totals === undefined}>
            <h2 id={totalsId} className="sr-only">
              {t("collectionTotals.title")}
            </h2>
            {totals === undefined ? (
              <FiguresSkeleton figures={4} />
            ) : (
              <TotalsFigures totals={totals} variant="overview" />
            )}
          </section>
        )}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          {empty ? (
            <EmptyState
              icon={
                <Library
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              }
              title={t("overview.firstRunTitle")}
              description={t("overview.firstRunDescription")}
              action={
                <Button onClick={() => addItem()}>
                  <Plus aria-hidden="true" />
                  {t("items.add")}
                </Button>
              }
            />
          ) : (
            <LatestItems items={latest} />
          )}
          <div className="flex min-w-0 flex-col gap-4">
            <OverviewPlanUsage />
            <SpotPrices />
          </div>
        </div>
      </div>
    </>
  );
}
