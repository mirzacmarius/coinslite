"use client";

import {
  useConvertingTo,
  useMoney,
} from "@/components/account/home-currency-change";
import { totalsOpen } from "@/components/collection/collection-display";
import {
  useCollectionDisplay,
  useViewportSize,
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
import type { HomeCurrency } from "@coinslite/i18n";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coinslite/ui/collapsible";
import { cn } from "@coinslite/ui/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import { seriesColorVariables } from "./chart-card";
import {
  type ShownTotals,
  useCollectionTotals,
  useValueOverTime,
} from "./use-collection-totals";
import { ValueChart } from "./value-chart";
import { ValueDistributionChart } from "./value-distribution-chart";

const itemTypes = ["coin", "banknote", "stamp"] as const;

/**
 * Until the viewport's size is known (on the server and the first paint),
 * CSS opens the section where `totalsOpen` would: in a viewport at least
 * 1024 px wide and 1000 px tall.
 */
const firstPaint = {
  chevron: "[@media(min-width:1024px)_and_(min-height:1000px)]:rotate-90",
  summary: "[@media(min-width:1024px)_and_(min-height:1000px)]:hidden",
  details: "hidden [@media(min-width:1024px)_and_(min-height:1000px)]:block",
  skeleton: "hidden [@media(min-width:1024px)_and_(min-height:1000px)]:flex",
};

/**
 * What the whole Collection holds and is worth (spec 7), whatever the list
 * is filtered to: totals, today's Spot prices and two charts, under a row
 * that opens and collapses them and sums them up while they're collapsed.
 * When they start open is `totalsOpen`'s call, which follows the window as it
 * resizes; a choice made here sticks for the rest of the visit and is
 * remembered on the device. An empty Collection
 * shows only the Spot prices.
 */
export function CollectionTotalsSection({
  narrowed,
  sold,
}: {
  narrowed: boolean;
  /** The sold view's: the sold Items' sale figures instead. */
  sold?: boolean;
}) {
  const t = useI18n();
  const titleId = useId();
  const totals = useCollectionTotals(sold ? "sold" : undefined);
  const [display, changeDisplay] = useCollectionDisplay();
  const viewport = useViewportSize();
  const [chosen, setChosen] = useState<boolean>();
  // Undefined until the viewport's size is known: `firstPaint` then decides.
  const open = chosen ?? totalsOpen(display, { narrowed, viewport });

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
        aria-busy={totals === undefined || totals.counting}
        className={cn("border-b", seriesColorVariables)}
      >
        <h2 className="flex h-10 items-center px-2">
          <CollapsibleTrigger className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-ui outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                open === true && "rotate-90",
                open === undefined && firstPaint.chevron,
              )}
              aria-hidden="true"
            />
            <span id={titleId} className="shrink-0 font-medium">
              {t(
                sold
                  ? "collectionTotals.soldSection"
                  : "collectionTotals.section",
              )}
            </span>
            <TotalsSummary
              totals={totals}
              sold={sold}
              className={cn(
                open === true && "hidden",
                open === undefined && firstPaint.summary,
              )}
            />
          </CollapsibleTrigger>
        </h2>
        {/* A display class here would beat the hidden attribute a collapsed section gets. */}
        <CollapsibleContent
          className={cn(open === undefined && firstPaint.details)}
        >
          <div className="flex flex-col gap-4 px-4 pb-4">
            <TotalsDetails totals={totals} sold={sold} />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

/**
 * The collapsed totals in one line: Items, total Market value, Gain/loss and
 * any Metal value. The line holds as many whole figures as fit, in that
 * order; the rest wrap out of sight rather than being cut. It pulses while
 * the totals are still counting.
 */
function TotalsSummary({
  totals,
  sold,
  className,
}: {
  totals: ShownTotals | undefined;
  sold?: boolean;
  className?: string;
}) {
  const t = useI18n();
  const formatMoney = useMoney();
  // While a Home currency change converts the amounts, only that's said of them.
  const converting = useConvertingTo() !== undefined;
  if (totals === undefined)
    return (
      <span
        className={cn("h-3.5 w-48 animate-pulse rounded bg-muted", className)}
        aria-hidden="true"
      />
    );
  if (totals.items === 0) return null;

  const money = (amount: number) => formatMoney(amount, totals.currency);
  const gainLoss = sold ? totals.realised : totals.gainLoss;
  const figures: { key: string; label?: string; value: ReactNode }[] = [
    {
      key: "items",
      value: t("collectionTotals.summaryItems", { count: totals.items }),
    },
    sold
      ? {
          key: "salePrice",
          label: t("collectionTotals.summarySalePrice"),
          value: money(totals.salePrice),
        }
      : {
          key: "marketValue",
          label: t("collectionTotals.summaryMarketValue"),
          value: money(totals.marketValue),
        },
  ];
  if (gainLoss.items > 0 && !converting)
    figures.push({
      key: "gainLoss",
      label: t(
        sold ? "collectionTotals.realised" : "collectionTotals.gainLoss",
      ),
      value: (
        <SignedMoney amount={gainLoss.amount} currency={totals.currency} />
      ),
    });
  for (const metal of sold || converting ? [] : metals) {
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
        totals.counting && "animate-pulse",
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

/**
 * The totals, Spot prices and charts, with placeholders while they load. The
 * sold view's are its sale figures, with no charts: those show what's owned.
 * While a Home currency change converts the amounts, the charts wait too.
 */
function TotalsDetails({
  totals,
  sold,
}: {
  totals: ShownTotals | undefined;
  sold?: boolean;
}) {
  const converting = useConvertingTo() !== undefined;
  const empty = totals?.items === 0;
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        {totals === undefined ? (
          <FiguresSkeleton />
        ) : (
          !empty && (
            <TotalsFigures
              totals={totals}
              variant={sold ? "sold" : "collection"}
              counting={totals.counting}
            />
          )
        )}
        <SpotPrices className={cn(empty && "max-w-xl xl:col-span-2")} />
      </div>
      {sold || converting ? null : totals === undefined ? (
        <ChartsSkeleton />
      ) : (
        !empty && <Charts totals={totals} />
      )}
    </>
  );
}

/**
 * The value chart and the value distribution of what's owned, pulsing while
 * the totals or "Value over time" are still counting.
 */
function Charts({ totals }: { totals: ShownTotals }) {
  const overTime = useValueOverTime();
  return (
    <div
      className={cn(
        "grid gap-4 lg:grid-cols-2",
        (totals.counting || overTime?.counting) && "animate-pulse",
      )}
    >
      <ValueChart totals={totals} overTime={overTime?.sum} />
      <ValueDistributionChart totals={totals} />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      <div className="h-72 animate-pulse rounded-xl bg-card" />
      <div className="h-72 animate-pulse rounded-xl bg-card" />
    </div>
  );
}

/**
 * CollectionTotalsSection before the page knows its URL: open only in a
 * viewport at least 1024 × 1000 px, as it opens when nothing says otherwise.
 */
export function CollectionTotalsSkeleton() {
  return (
    <div className="border-b" aria-hidden="true">
      <div className="flex h-10 items-center px-4">
        <span className="h-3.5 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className={cn("flex-col gap-4 px-4 pb-4", firstPaint.skeleton)}>
        <FiguresSkeleton />
        <ChartsSkeleton />
      </div>
    </div>
  );
}

/** The colour of a Gain/loss wherever it shows: green for a gain, red for a loss. */
export const gainLossColour = (amount: number) =>
  cn(amount > 0 && "text-success", amount < 0 && "text-destructive");

/** An amount with its sign, green for a gain and red for a loss. */
function SignedMoney({
  amount,
  currency,
}: {
  amount: number;
  currency: CollectionTotals["currency"];
}) {
  const format = useFormatters();
  return (
    <span className={gainLossColour(amount)}>
      {format.money(amount, currency, { signed: true })}
    </span>
  );
}

/**
 * The totals as figures in one card: counts, money, then each metal held. The
 * Overview's keep to pieces and money (spec 9), plus the Realised Gain/loss
 * once something is sold (`sold`, the sold Items' totals). The sold view's
 * show the sale total and the Realised Gain/loss instead of Market value.
 * The card pulses while the totals are still `counting`.
 */
export function TotalsFigures({
  totals,
  variant = "collection",
  sold,
  counting,
}: {
  totals: CollectionTotals;
  variant?: "collection" | "overview" | "sold";
  sold?: CollectionTotals;
  counting?: boolean;
}) {
  const t = useI18n();
  const format = useFormatters();
  const convertingTo = useConvertingTo();
  if (convertingTo) return <ConvertingNotice currency={convertingTo} />;
  const money = (amount: number) => format.money(amount, totals.currency);
  /**
   * Gain/loss over what's owned, or realised over what's sold, with a dash
   * and a hint until an Item has both of the prices it needs.
   */
  const gainLossFigure = (
    kind: "gainLoss" | "realised",
    of: CollectionTotals,
  ) => {
    const figure = of[kind];
    return (
      <Figure
        label={t(`collectionTotals.${kind}`)}
        value={
          figure.items === 0 ? (
            <span className="text-muted-foreground">–</span>
          ) : (
            <SignedMoney amount={figure.amount} currency={of.currency} />
          )
        }
        hint={
          figure.items === 0
            ? t(`collectionTotals.${kind}None`)
            : figure.items < of.items
              ? t(`collectionTotals.${kind}Partial`, {
                  count: format.number(figure.items),
                  total: format.number(of.items),
                })
              : undefined
        }
      />
    );
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card",
        counting && "animate-pulse",
      )}
    >
      <dl className={figuresLayout}>
        {variant !== "overview" && (
          <Figure
            label={t("collectionTotals.items")}
            value={format.number(totals.items)}
            hint={t("collectionTotals.itemsHint")}
          />
        )}
        <Figure
          label={t("collectionTotals.pieces")}
          // On the Overview, the way into what they add up to.
          href={variant === "overview" ? "/collection" : undefined}
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
        {variant === "sold" ? (
          <>
            <Figure
              label={t("collectionTotals.salePrice")}
              value={money(totals.salePrice)}
            />
            {gainLossFigure("realised", totals)}
          </>
        ) : (
          <>
            <Figure
              label={t("collectionTotals.marketValue")}
              value={money(totals.marketValue)}
            />
            {gainLossFigure("gainLoss", totals)}
          </>
        )}
        {variant === "overview" &&
          sold &&
          sold.items > 0 &&
          gainLossFigure("realised", sold)}
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
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Makes the whole card a link, named by its label. */
  href?: string;
}) {
  return (
    <div
      className={cn(
        figureLayout,
        "flex flex-col gap-0.5 border-b border-r px-4 py-3",
        href &&
          "relative transition-colors hover:bg-accent/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring",
      )}
    >
      <dt className="text-xs text-muted-foreground">
        {href ? (
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0"
          >
            {label}
          </Link>
        ) : (
          label
        )}
      </dt>
      <dd className="whitespace-nowrap text-lg font-semibold proportional-nums sm:text-xl">
        {value}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/**
 * In place of the totals while a Home currency change converts the
 * Collection's amounts in the background: added up, they'd mix currencies.
 */
function ConvertingNotice({ currency }: { currency: HomeCurrency }) {
  const t = useI18n();
  return (
    <p
      role="status"
      className="rounded-xl bg-card px-4 py-3 text-ui text-muted-foreground"
    >
      {t("homeCurrency.convertingTotals", { currency })}
    </p>
  );
}

/** TotalsFigures while the totals load: up to five grey placeholders. */
export function FiguresSkeleton({ figures = 5 }: { figures?: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card" aria-hidden="true">
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
