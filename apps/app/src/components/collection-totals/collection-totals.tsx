"use client";

import { totalsOpen } from "@/components/collection/collection-display";
import {
  useCollectionDisplay,
  usePhoneWidth,
} from "@/components/collection/use-collection-display";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coinslite/ui/collapsible";
import { cn } from "@coinslite/ui/utils";
import { ChevronRight } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { seriesColorVariables } from "./chart-card";
import { useCollectionTotals } from "./use-collection-totals";
import { ValueByDateAddedChart } from "./value-by-date-added-chart";
import { ValueDistributionChart } from "./value-distribution-chart";

const itemTypes = ["coin", "banknote", "stamp"] as const;

/**
 * What the whole Collection holds and is worth (spec 7), whatever the list
 * is filtered to: totals, today's Spot prices and two charts, under a row
 * that opens and collapses them and sums them up while they're collapsed.
 * When they start open is `totalsOpen`'s call; a choice made here sticks for
 * the rest of the visit and is remembered on the device. An empty Collection
 * shows only the Spot prices.
 */
export function CollectionTotalsSection({ narrowed }: { narrowed: boolean }) {
  const t = useI18n();
  const titleId = useId();
  const totals = useCollectionTotals();
  const [display, changeDisplay] = useCollectionDisplay();
  const phone = usePhoneWidth();
  const [chosen, setChosen] = useState<boolean>();
  // Undefined until the screen size is known: CSS then opens it from `sm` up.
  const open = chosen ?? totalsOpen(display, { narrowed, phone });

  return (
    <Collapsible
      asChild
      open={open ?? true}
      onOpenChange={(next) => {
        setChosen(next);
        changeDisplay({ totalsOpen: next });
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-busy={totals === undefined}
        className={cn("border-b", seriesColorVariables)}
      >
        <h2 className="flex h-10 items-center px-2">
          <CollapsibleTrigger className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-[13px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                open === true && "rotate-90",
                open === undefined && "sm:rotate-90",
              )}
              aria-hidden="true"
            />
            <span id={titleId} className="shrink-0 font-medium">
              {t("collectionTotals.section")}
            </span>
            <TotalsSummary
              totals={totals}
              className={cn(
                open === true && "hidden",
                open === undefined && "sm:hidden",
              )}
            />
          </CollapsibleTrigger>
        </h2>
        {/* A display class here would beat the hidden attribute a collapsed section gets. */}
        <CollapsibleContent
          className={cn(open === undefined && "max-sm:hidden")}
        >
          <div className="flex flex-col gap-4 px-4 pb-4">
            <TotalsDetails totals={totals} />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

/**
 * The collapsed totals in one line: Items, total Market value, Gain/loss and
 * any Metal value. The line holds as many whole figures as fit, in that
 * order; the rest wrap out of sight rather than being cut.
 */
function TotalsSummary({
  totals,
  className,
}: {
  totals: CollectionTotals | undefined;
  className?: string;
}) {
  const t = useI18n();
  const format = useFormatters();
  if (totals === undefined)
    return (
      <span
        className={cn("h-3.5 w-48 animate-pulse rounded bg-muted", className)}
        aria-hidden="true"
      />
    );
  if (totals.items === 0) return null;

  const money = (amount: number) => format.money(amount, totals.currency);
  const { gainLoss } = totals;
  const figures: { key: string; label?: string; value: ReactNode }[] = [
    {
      key: "items",
      value: t("collectionTotals.summaryItems", { count: totals.items }),
    },
    {
      key: "marketValue",
      label: t("collectionTotals.summaryMarketValue"),
      value: money(totals.marketValue),
    },
  ];
  if (gainLoss.items > 0)
    figures.push({
      key: "gainLoss",
      label: t("collectionTotals.gainLoss"),
      value: (
        <span
          className={cn(
            gainLoss.amount > 0 && "text-success",
            gainLoss.amount < 0 && "text-destructive",
          )}
        >
          {format.money(gainLoss.amount, totals.currency, { signed: true })}
        </span>
      ),
    });
  for (const metal of metals) {
    const { value } = totals.metals[metal];
    if (value)
      figures.push({
        key: metal,
        label: t(`collectionTotals.metalValue.${metal}`),
        value: money(value),
      });
  }

  return (
    <span
      className={cn(
        "flex h-5 min-w-0 flex-1 flex-wrap gap-x-3 overflow-hidden text-muted-foreground",
        className,
      )}
    >
      {figures.map(({ key, label, value }) => (
        <span key={key} className="whitespace-nowrap">
          {label && <>{label} </>}
          <span className="text-foreground">{value}</span>
        </span>
      ))}
    </span>
  );
}

/** The totals, Spot prices and charts, with placeholders while they load. */
function TotalsDetails({ totals }: { totals: CollectionTotals | undefined }) {
  const empty = totals?.items === 0;
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        {totals === undefined ? (
          <FiguresSkeleton />
        ) : (
          !empty && <TotalsFigures totals={totals} />
        )}
        <SpotPrices className={cn(empty && "max-w-xl xl:col-span-2")} />
      </div>
      {totals === undefined ? (
        <ChartsSkeleton />
      ) : (
        !empty && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ValueByDateAddedChart totals={totals} />
            <ValueDistributionChart totals={totals} />
          </div>
        )
      )}
    </>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      <div className="h-72 animate-pulse rounded-lg border bg-card" />
      <div className="h-72 animate-pulse rounded-lg border bg-card" />
    </div>
  );
}

/**
 * CollectionTotalsSection before the page knows its URL: collapsed on a
 * phone and open on anything wider, as it opens when nothing says otherwise.
 */
export function CollectionTotalsSkeleton() {
  return (
    <div className="border-b" aria-hidden="true">
      <div className="flex h-10 items-center px-4">
        <span className="h-3.5 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-4 px-4 pb-4 max-sm:hidden">
        <FiguresSkeleton />
        <ChartsSkeleton />
      </div>
    </div>
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
