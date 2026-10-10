"use client";

import { SpotPrices } from "@/components/spot-prices/spot-prices";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  type CollectionTotals,
  totalPieces,
} from "@coinslite/backend/convex/items/totals";
import {
  TROY_OUNCE_GRAMS,
  metals,
} from "@coinslite/backend/convex/spotPrices/rates";
import { cn } from "@coinslite/ui/utils";
import { type ReactNode, useId } from "react";
import { seriesColorVariables } from "./chart-card";
import { useCollectionTotals } from "./use-collection-totals";
import { ValueByDateAddedChart } from "./value-by-date-added-chart";
import { ValueDistributionChart } from "./value-distribution-chart";

const itemTypes = ["coin", "banknote", "stamp"] as const;

/**
 * What the whole Collection holds and is worth (spec 7), whatever the list
 * below is filtered to: totals, today's Spot prices and two charts. An empty
 * Collection shows only the Spot prices.
 */
export function CollectionTotalsSection() {
  const t = useI18n();
  const titleId = useId();
  const totals = useCollectionTotals();
  const empty = totals?.items === 0;

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={totals === undefined}
      className={cn("flex flex-col gap-4 border-b p-4", seriesColorVariables)}
    >
      <h2 id={titleId} className="sr-only">
        {t("collectionTotals.title")}
      </h2>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        {totals === undefined ? (
          <FiguresSkeleton />
        ) : (
          !empty && <TotalsFigures totals={totals} />
        )}
        <SpotPrices className={cn(empty && "max-w-xl xl:col-span-2")} />
      </div>
      {totals === undefined ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
          <div className="h-72 animate-pulse rounded-lg border bg-card" />
          <div className="h-72 animate-pulse rounded-lg border bg-card" />
        </div>
      ) : (
        !empty && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ValueByDateAddedChart totals={totals} />
            <ValueDistributionChart totals={totals} />
          </div>
        )
      )}
    </section>
  );
}

/**
 * The totals as figures in one card: counts, money, then each metal held. The
 * Overview's keep to pieces and money (spec 9).
 */
export function TotalsFigures({
  totals,
  variant = "collection",
}: {
  totals: CollectionTotals;
  variant?: "collection" | "overview";
}) {
  const t = useI18n();
  const format = useFormatters();
  const money = (amount: number) => format.money(amount, totals.currency);
  const { gainLoss } = totals;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <dl className={figuresLayout}>
        {variant === "collection" && (
          <Figure
            label={t("collectionTotals.items")}
            value={format.number(totals.items)}
            hint={t("collectionTotals.itemsHint")}
          />
        )}
        <Figure
          label={t("collectionTotals.pieces")}
          value={format.number(totalPieces(totals))}
          hint={itemTypes
            .filter((type) => totals.pieces[type] > 0)
            .map(
              (type) =>
                `${t(`collectionTotals.typesPlural.${type}`)} ${format.number(totals.pieces[type])}`,
            )
            .join(" · ")}
        />
        <Figure
          label={t("collectionTotals.purchasePrice")}
          value={money(totals.purchasePrice)}
        />
        <Figure
          label={t("collectionTotals.marketValue")}
          value={money(totals.marketValue)}
        />
        <Figure
          label={t("collectionTotals.gainLoss")}
          value={
            gainLoss.items === 0 ? (
              <span className="text-muted-foreground">–</span>
            ) : (
              <span
                className={cn(
                  gainLoss.amount > 0 && "text-success",
                  gainLoss.amount < 0 && "text-destructive",
                )}
              >
                {format.money(gainLoss.amount, totals.currency, {
                  signed: true,
                })}
              </span>
            )
          }
          hint={
            gainLoss.items === 0
              ? t("collectionTotals.gainLossNone")
              : gainLoss.items < totals.items
                ? t("collectionTotals.gainLossPartial", {
                    count: format.number(gainLoss.items),
                    total: format.number(totals.items),
                  })
                : undefined
          }
        />
        {metals
          .filter(
            (metal) =>
              variant === "collection" && totals.metals[metal].fineWeight > 0,
          )
          .map((metal) => {
            const { fineWeight, value } = totals.metals[metal];
            return (
              <Figure
                key={metal}
                label={t(`collectionTotals.metalValue.${metal}`)}
                value={
                  value === null ? (
                    <span className="whitespace-normal text-sm font-normal text-muted-foreground">
                      {t("collectionTotals.noSpotPrices")}
                    </span>
                  ) : (
                    money(value)
                  )
                }
                hint={t("collectionTotals.fineWeight", {
                  grams: format.number(fineWeight, {
                    maximumFractionDigits: 2,
                  }),
                  ounces: format.number(fineWeight / TROY_OUNCE_GRAMS, {
                    maximumFractionDigits: 2,
                  }),
                })}
              />
            );
          })}
      </dl>
    </div>
  );
}

/**
 * Amounts never wrap: a lone digit or minus sign on its own line reads as a
 * different amount. The figures wrap as rows of cards instead, two to a row on
 * a phone, and a figure too wide for its share takes the whole row. Every row
 * shares out its full width, so however many figures there are (four on the
 * Overview, up to seven on the Collection page) no row ends in an empty cell.
 */
const figuresLayout = "-mb-px -mr-px flex flex-wrap";
const figureLayout = "min-w-min flex-[1_1_10rem] sm:flex-[1_1_12.5rem]";

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        figureLayout,
        "flex flex-col gap-0.5 border-b border-r px-4 py-3",
      )}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-nowrap text-lg font-semibold proportional-nums sm:text-xl">
        {value}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** TotalsFigures while the totals load: up to five grey placeholders. */
export function FiguresSkeleton({ figures = 5 }: { figures?: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border bg-card"
      aria-hidden="true"
    >
      <div className={figuresLayout}>
        {[0, 1, 2, 3, 4].slice(0, figures).map((figure) => (
          <div
            key={figure}
            className={cn(
              figureLayout,
              "flex flex-col gap-2 border-b border-r px-4 py-3",
            )}
          >
            <span className="h-3 w-16 animate-pulse rounded bg-muted" />
            <span className="h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
