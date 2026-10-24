"use client";

import { useConvertingTo } from "@/components/account/home-currency-change";
import { seriesColorVariables } from "@/components/collection-totals/chart-card";
import {
  Charts,
  ChartsSkeleton,
  FiguresSkeleton,
  TotalsFigures,
} from "@/components/collection-totals/collection-totals";
import { Insights } from "@/components/collection-totals/insights";
import { useCollectionTotals } from "@/components/collection-totals/use-collection-totals";
import { ImportDialog } from "@/components/collection/import-dialog";
import { StartCard } from "@/components/collection/start-card";
import { isFirstRun } from "@/components/overview/first-run";
import { LatestItems } from "@/components/overview/latest-items";
import { NeedsAttentionCard } from "@/components/overview/needs-attention";
import { SetProgressCard } from "@/components/overview/set-progress";
import { useOverviewPages } from "@/components/overview/use-overview-pages";
import { WantlistCard } from "@/components/overview/wantlist-card";
import { OverviewPlanUsage } from "@/components/plans/plan-usage";
import { SpotPrices } from "@/components/spot-prices/spot-prices";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { useId, useState } from "react";

/**
 * Where the Collection stands (spec 9): the totals, the value charts, the
 * latest Items, the Sets closest to complete, what needs attention, the
 * breakdown, how many entries are on the Wantlist, and on phones the Spot
 * prices and how much of the Free plan is used (wider screens have them in
 * the sidebar). The charts, breakdown, Set progress and Needs attention are
 * each left out when they would be empty; the charts and breakdown also
 * while a Home currency change converts the amounts. Adding an Item is the
 * shell's: the sidebar, or the middle of the phone tabs.
 * An empty Collection shows the start card instead (StartCard): its first
 * way in adds an Item, and there are no totals or Items yet.
 * The header appears the moment a link is clicked. Until it's known whether
 * the Collection is empty, the totals, charts and Items show skeletons, so
 * the start card doesn't appear and then vanish, nor the charts push the
 * Items down.
 */
export function Overview() {
  const t = useI18n();
  const totalsId = useId();
  const [importing, setImporting] = useState(false);
  const latest = useQuery(api.overview.latestItems, {});
  const totals = useCollectionTotals();
  const soldTotals = useCollectionTotals("sold");
  const pages = useOverviewPages();
  const firstRun = isFirstRun(latest?.length, soldTotals?.items);
  const deciding = firstRun === undefined;
  const counting = totals?.counting === true || soldTotals?.counting === true;
  const converting = useConvertingTo() !== undefined;
  // What the charts and the breakdown show: what's owned, once there is some.
  const owned =
    firstRun === false &&
    totals !== undefined &&
    totals.items > 0 &&
    !converting
      ? totals
      : undefined;

  return (
    <>
      <HeaderBar title={t("dashboard.headerTitle")} />
      {/* Outside the start card, so it stays open as the first imported rows replace the card. */}
      <ImportDialog open={importing} onOpenChange={setImporting} />
      <div className={cn("flex flex-col gap-4 p-4", seriesColorVariables)}>
        {!firstRun && (
          <section
            aria-labelledby={totalsId}
            aria-busy={totals === undefined || deciding || counting}
          >
            <h2 id={totalsId} className="sr-only">
              {t("collectionTotals.title")}
            </h2>
            {totals === undefined || deciding ? (
              <FiguresSkeleton />
            ) : (
              <TotalsFigures
                totals={totals}
                sold={soldTotals}
                counting={counting}
              />
            )}
          </section>
        )}
        {owned ? (
          <Charts totals={owned} />
        ) : (
          !firstRun && (totals === undefined || deciding) && <ChartsSkeleton />
        )}
        {firstRun ? (
          <StartCard
            title={t("overview.firstRunTitle")}
            description={t("overview.firstRunDescription")}
            onImport={() => setImporting(true)}
          />
        ) : (
          // Two columns from laptop width; Latest Items takes both when alone.
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:[&>*:only-child]:col-span-2">
            <LatestItems items={deciding ? undefined : latest} />
            {firstRun === false && pages && (
              <>
                <SetProgressCard progress={pages.setProgress} />
                <NeedsAttentionCard counts={pages.needsAttention} />
              </>
            )}
          </div>
        )}
        {owned && <Insights totals={owned} />}
        <WantlistCard />
        {/* From tablet width up, the sidebar's footer shows these. */}
        <div className="flex min-w-0 flex-col gap-4 md:hidden">
          <OverviewPlanUsage />
          <SpotPrices />
        </div>
      </div>
    </>
  );
}
