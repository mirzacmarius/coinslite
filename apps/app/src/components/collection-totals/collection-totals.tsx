"use client";

import { useConvertingTo } from "@/components/account/home-currency-change";
import { useAlbums } from "@/components/albums/use-albums";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  type CollectionTotals,
  type PageTotals,
  totalPieces,
} from "@coinslite/backend/convex/items/totals";
import {
  TROY_OUNCE_GRAMS,
  metals,
} from "@coinslite/backend/convex/spotPrices/rates";
import type { HomeCurrency } from "@coinslite/i18n";
import { cn } from "@coinslite/ui/utils";
import Link from "next/link";
import { type ReactNode, useId } from "react";
import {
  type ShownTotals,
  useCollectionTotals,
  useValueOverTime,
} from "./use-collection-totals";
import { ValueChart } from "./value-chart";
import { ValueDistributionChart } from "./value-distribution-chart";

const itemTypes = ["coin", "banknote", "stamp"] as const;

/**
 * What the strip's figures read, which totals have before any Spot price
 * (a view's, as collection.page sums them) as well as after.
 */
type Sums = Pick<
  PageTotals,
  | "currency"
  | "items"
  | "pieces"
  | "purchasePrice"
  | "marketValue"
  | "gainLoss"
  | "salePrice"
  | "realised"
>;

/**
 * The Collection page's summary strip (spec 7), above its Items: the
 * pieces, the Albums (opening them), and the total Market value and
 * Gain/loss of what's owned. With a search or filter on (`viewTotals`) it's
 * headed "This view" and sums the view's Items instead, leaving out the
 * Albums; the sold view's sums the sold Items' purchase and sale. The full
 * totals, breakdown and charts are the Overview's.
 */
export function CollectionStrip({
  sold,
  viewTotals,
}: {
  /** The sold view's: the sold Items' sale figures instead. */
  sold?: boolean;
  /**
   * The current view's totals while a search or filter narrows it; null
   * while they load, undefined when nothing narrows the view beyond owned
   * or sold.
   */
  viewTotals?: PageTotals | null;
}) {
  const t = useI18n();
  const titleId = useId();
  const whole = useCollectionTotals(sold ? "sold" : undefined);
  const shown = viewTotals === undefined ? whole : viewTotals;
  const counting = viewTotals === undefined && whole?.counting === true;
  return (
    <section
      aria-labelledby={titleId}
      aria-busy={shown == null || counting}
      className="flex flex-col gap-1.5"
    >
      <h2
        id={titleId}
        className={cn(
          "px-1 text-xs font-medium text-muted-foreground",
          // Owned and unnarrowed, they're plainly the Collection's.
          viewTotals === undefined && !sold && "sr-only",
        )}
      >
        {viewTotals !== undefined
          ? t("collectionTotals.thisView")
          : sold
            ? t("collectionTotals.soldSection")
            : t("collectionTotals.title")}
      </h2>
      {shown == null ? (
        <FiguresSkeleton figures={4} />
      ) : (
        <StripFigures
          totals={shown}
          sold={sold}
          albums={viewTotals === undefined && !sold}
          counting={counting}
        />
      )}
    </section>
  );
}

/**
 * The strip's figures in one card: the pieces, the Albums with `albums`,
 * then the Market value and Gain/loss, or for sold Items the Purchase price,
 * sale price and Realised Gain/loss.
 */
function StripFigures({
  totals,
  sold,
  albums,
  counting,
}: {
  totals: Sums;
  sold?: boolean;
  albums: boolean;
  counting: boolean;
}) {
  const t = useI18n();
  const format = useFormatters();
  const convertingTo = useConvertingTo();
  if (convertingTo) return <ConvertingNotice currency={convertingTo} />;
  const money = (amount: number) => format.money(amount, totals.currency);
  return (
    <FiguresCard counting={counting}>
      <PiecesFigure totals={totals} />
      {albums && <AlbumsFigure />}
      {sold ? (
        <>
          <Figure
            label={t("collectionTotals.purchasePrice")}
            value={money(totals.purchasePrice)}
          />
          <Figure
            label={t("collectionTotals.salePrice")}
            value={money(totals.salePrice)}
          />
          <GainLossFigure kind="realised" totals={totals} />
        </>
      ) : (
        <>
          <Figure
            label={t("collectionTotals.marketValue")}
            value={money(totals.marketValue)}
          />
          <GainLossFigure kind="gainLoss" totals={totals} />
        </>
      )}
    </FiguresCard>
  );
}

/** How many Albums the person has, opening them; a dash while they load. */
function AlbumsFigure() {
  const t = useI18n();
  const format = useFormatters();
  const albums = useAlbums();
  return (
    <Figure
      label={t("nav.albums")}
      href="/albums"
      value={
        albums === undefined ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          format.number(albums.length)
        )
      }
    />
  );
}

/**
 * The Overview's totals (spec 9) as figures in one card: the Items and
 * pieces (opening the Collection), the money, the Realised Gain/loss once
 * something is sold (`sold`, the sold Items' totals), then each metal held.
 * The card pulses while the totals are still `counting`.
 */
export function TotalsFigures({
  totals,
  sold,
  counting,
}: {
  totals: CollectionTotals;
  sold?: CollectionTotals;
  counting?: boolean;
}) {
  const t = useI18n();
  const format = useFormatters();
  const convertingTo = useConvertingTo();
  if (convertingTo) return <ConvertingNotice currency={convertingTo} />;
  const money = (amount: number) => format.money(amount, totals.currency);
  return (
    <FiguresCard counting={counting}>
      <Figure
        label={t("collectionTotals.items")}
        value={format.number(totals.items)}
        hint={t("collectionTotals.itemsHint")}
      />
      {/* The way into what they add up to. */}
      <PiecesFigure totals={totals} href="/collection" />
      <Figure
        label={t("collectionTotals.purchasePrice")}
        value={money(totals.purchasePrice)}
      />
      <Figure
        label={t("collectionTotals.marketValue")}
        value={money(totals.marketValue)}
      />
      <GainLossFigure kind="gainLoss" totals={totals} />
      {sold && sold.items > 0 && (
        <GainLossFigure kind="realised" totals={sold} />
      )}
      {metals
        .filter((metal) => totals.metals[metal].fineWeight > 0)
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
    </FiguresCard>
  );
}

/**
 * The value chart and the value distribution of what's owned (spec 9),
 * pulsing while the totals or "Value over time" are still counting.
 */
export function Charts({ totals }: { totals: ShownTotals }) {
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

/** Figures in one card, pulsing while their totals are still `counting`. */
function FiguresCard({
  counting,
  children,
}: {
  counting?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card",
        counting && "animate-pulse",
      )}
    >
      <dl className={figuresLayout}>{children}</dl>
    </div>
  );
}

/**
 * The pieces, with how many of each Item type beneath; `href` makes the
 * card the way to them.
 */
function PiecesFigure({ totals, href }: { totals: Sums; href?: string }) {
  const t = useI18n();
  const format = useFormatters();
  return (
    <Figure
      label={t("collectionTotals.pieces")}
      href={href}
      value={format.number(totalPieces(totals))}
      hint={itemTypes
        .filter((type) => totals.pieces[type] > 0)
        .map(
          (type) =>
            `${t(`collectionTotals.typesPlural.${type}`)} ${format.number(totals.pieces[type])}`,
        )
        .join(" · ")}
    />
  );
}

/**
 * Gain/loss over what's owned, or realised over what's sold, with a dash
 * and a hint until an Item has both of the prices it needs.
 */
function GainLossFigure({
  kind,
  totals,
}: {
  kind: "gainLoss" | "realised";
  totals: Sums;
}) {
  const t = useI18n();
  const format = useFormatters();
  const figure = totals[kind];
  return (
    <Figure
      label={t(`collectionTotals.${kind}`)}
      value={
        figure.items === 0 ? (
          <span className="text-muted-foreground">–</span>
        ) : (
          <SignedMoney amount={figure.amount} currency={totals.currency} />
        )
      }
      hint={
        figure.items === 0
          ? t(`collectionTotals.${kind}None`)
          : figure.items < totals.items
            ? t(`collectionTotals.${kind}Partial`, {
                count: format.number(figure.items),
                total: format.number(totals.items),
              })
            : undefined
      }
    />
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
 * Amounts never wrap: a lone digit or minus sign on its own line reads as a
 * different amount. The figures wrap as rows of cards instead, two to a row on
 * a phone (9rem each fits twice in a 360 px wide one, at the app's 18 px
 * root), and a figure too wide for its share takes the whole row. Every row
 * shares out its full width, so however many figures there are (three or four
 * on the Collection page, up to eight on the Overview) no row ends in an
 * empty cell.
 */
const figuresLayout = "-mb-px -mr-px flex flex-wrap";
const figureLayout = "min-w-min flex-[1_1_9rem] sm:flex-[1_1_12.5rem]";

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
