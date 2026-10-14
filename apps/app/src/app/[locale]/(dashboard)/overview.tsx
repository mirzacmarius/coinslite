"use client";

import { seriesColorVariables } from "@/components/collection-totals/chart-card";
import {
  FiguresSkeleton,
  TotalsFigures,
} from "@/components/collection-totals/collection-totals";
import {
  type ShownTotals,
  useCollectionTotals,
  useValueOverTime,
} from "@/components/collection-totals/use-collection-totals";
import { ValueChart } from "@/components/collection-totals/value-chart";
import { ImportDialog } from "@/components/collection/import-dialog";
import { StartCard } from "@/components/collection/start-card";
import { useAddItem } from "@/components/items/add-item";
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
import { Button } from "@coinslite/ui/button";
import { HeaderBar } from "@coinslite/ui/header-bar";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useId, useState } from "react";

/**
 * Where the Collection stands (spec 9): the totals, the value over time,
 * the latest Items, the Sets closest to complete, what needs attention, how
 * many entries are on the Wantlist, and on phones a large Add Item button,
 * the Spot prices and how much of the Free plan is used (wider screens have
 * them in the sidebar). The value chart, Set progress and Needs attention
 * are each left out when they would be empty.
 * An empty Collection shows the start card instead (StartCard): its first
 * way in adds an Item, and there are no totals or Items yet.
 * The header appears the moment a link is clicked. Until it's known whether
 * the Collection is empty, the button's place is held blank and the totals
 * and Items show skeletons, so neither the button nor the start card
 * appear and then vanish.
 */
export function Overview() {
  const t = useI18n();
  const addItem = useAddItem();
  const totalsId = useId();
  const [importing, setImporting] = useState(false);
  const latest = useQuery(api.overview.latestItems, {});
  const totals = useCollectionTotals();
  const soldTotals = useCollectionTotals("sold");
  const pages = useOverviewPages();
  const firstRun = isFirstRun(latest?.length, soldTotals?.items);
  const deciding = firstRun === undefined;
  const counting = totals?.counting === true || soldTotals?.counting === true;

  return (
    <>
      <HeaderBar title={t("dashboard.headerTitle")} />
      {/* Outside the start card, so it stays open as the first imported rows replace the card. */}
      <ImportDialog open={importing} onOpenChange={setImporting} />
      <div className="flex flex-col gap-4 p-4">
        {/* While deciding, invisible: the same height, and out of reach. */}
        {!firstRun && (
          <Button
            size="lg"
            className={cn("w-full md:hidden", deciding && "invisible")}
            onClick={() => addItem()}
          >
            <Plus aria-hidden="true" />
            {t("items.add")}
          </Button>
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
        {firstRun === false && totals !== undefined && totals.items > 0 && (
          <OverviewValueChart totals={totals} />
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

/**
 * The Collection page's "over time" value chart, compact, from the same
 * data, pulsing while the totals or the months are still counting.
 */
function OverviewValueChart({ totals }: { totals: ShownTotals }) {
  const overTime = useValueOverTime();
  return (
    <div
      className={cn(
        seriesColorVariables,
        (totals.counting || overTime?.counting) && "animate-pulse",
      )}
    >
      <ValueChart totals={totals} overTime={overTime?.sum} compact />
    </div>
  );
}
