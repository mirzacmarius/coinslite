"use client";

import {
  FiguresSkeleton,
  TotalsFigures,
} from "@/components/collection-totals/collection-totals";
import { useCollectionTotals } from "@/components/collection-totals/use-collection-totals";
import { ImportDialog } from "@/components/collection/import-dialog";
import { StartCard } from "@/components/collection/start-card";
import { AddShortcuts } from "@/components/overview/add-shortcuts";
import { isFirstRun } from "@/components/overview/first-run";
import { LatestItems } from "@/components/overview/latest-items";
import { WantlistCard } from "@/components/overview/wantlist-card";
import { OverviewPlanUsage } from "@/components/plans/plan-usage";
import { SpotPrices } from "@/components/spot-prices/spot-prices";
import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { useQuery } from "convex/react";
import { useId, useState } from "react";

/**
 * Where the Collection stands (spec 9): shortcuts to add an Item of each type,
 * the totals, the latest Items, how many entries are on the Wantlist, and on
 * phones the Spot prices and how much of the Free plan is used (wider screens
 * have them in the sidebar).
 * An empty Collection shows the start card instead (StartCard): its first
 * way in holds the shortcuts, and there are no totals or Items yet.
 * The header appears the moment a link is clicked. Until it's known whether
 * the Collection is empty, the shortcuts' place is held blank and the totals
 * and Items show skeletons, so neither the shortcuts nor the start card
 * appear and then vanish.
 */
export function Overview() {
  const t = useI18n();
  const totalsId = useId();
  const [importing, setImporting] = useState(false);
  const latest = useQuery(api.overview.latestItems, {});
  const totals = useCollectionTotals();
  const soldTotals = useCollectionTotals("sold");
  const firstRun = isFirstRun(latest?.length, soldTotals?.items);
  const deciding = firstRun === undefined;
  const counting = totals?.counting === true || soldTotals?.counting === true;

  return (
    <>
      <HeaderBar title={t("dashboard.headerTitle")} />
      {/* Outside the start card, so it stays open as the first imported rows replace the card. */}
      <ImportDialog open={importing} onOpenChange={setImporting} />
      <div className="flex flex-col gap-4 p-4">
        {/* While deciding, invisible: the same height however they wrap, and out of reach. */}
        {!firstRun && (
          <AddShortcuts className={deciding ? "invisible" : undefined} />
        )}
        {!firstRun && (
          <section
            aria-labelledby={totalsId}
            aria-busy={totals === undefined || deciding || counting}
          >
            <h2 id={totalsId} className="sr-only">
              {t("collectionTotals.title")}
            </h2>
            {totals === undefined || deciding ? (
              <FiguresSkeleton figures={4} />
            ) : (
              <TotalsFigures
                totals={totals}
                sold={soldTotals}
                variant="overview"
                counting={counting}
              />
            )}
          </section>
        )}
        {firstRun ? (
          <StartCard
            title={t("overview.firstRunTitle")}
            description={t("overview.firstRunDescription")}
            onImport={() => setImporting(true)}
          />
        ) : (
          <LatestItems items={deciding ? undefined : latest} />
        )}
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
