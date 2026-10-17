"use client";

import { gainLossColour } from "@/components/collection-totals/collection-totals";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { itemFigures } from "@coinslite/backend/convex/items/totals";
import { TROY_OUNCE_GRAMS } from "@coinslite/backend/convex/spotPrices/rates";
import type { MoneyFormatOptions } from "@coinslite/i18n";
import { Badge } from "@coinslite/ui/badge";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import { cn } from "@coinslite/ui/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { StaleSpotPrices, useMetalValue } from "./metal-value";

/**
 * How the Item page shows an amount in the Item's Home currency, undefined
 * for none. Every amount on the page goes through the one the page makes.
 */
export type ItemMoney = (
  amount: number | undefined,
  options?: MoneyFormatOptions,
) => string | undefined;

/**
 * What the Item page leads with, beside its photos: the Item type, the title,
 * the key facts (year · denomination · country), `tags` such as its Grade and
 * Album, then its figures, by the Collection totals' rules (itemFigures): the
 * Market value (the total, with the value per piece, when there are several),
 * the Gain/loss, what was paid and, for an owned gold or silver coin, its
 * Metal value. A sold Item shows what it sold for and its realised Gain/loss.
 * `children` follow, such as the notes. The bar above already holds the
 * page's heading, so the title here isn't a second one.
 */
export function ItemHeader({
  item,
  money,
  tags,
  children,
}: {
  item: Doc<"items">;
  money: ItemMoney;
  tags?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = useI18n();
  const format = useFormatters();
  const { value, gainLoss } = itemFigures(item);
  const several = item.quantity > 1;
  const sold = item.soldOn !== undefined;
  const keyFacts = [
    item.year,
    item.denomination,
    item.country && format.country(item.country),
  ]
    .filter((fact) => fact !== undefined && fact !== "")
    .join(" · ");
  const missing = <span className="text-muted-foreground">–</span>;
  // "2 × €515.00" under a total of several pieces.
  const perPiece = (amount: number | undefined) =>
    several && amount !== undefined
      ? `${format.number(item.quantity)} × ${money(amount)}`
      : undefined;
  const paid =
    item.purchasePrice === undefined
      ? undefined
      : item.purchasePrice * item.quantity;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-ui text-muted-foreground">
          <ItemTypeIcon type={item.type} className="size-6 rounded" />
          {t(`items.types.${item.type}`)}
          {sold && <Badge variant="outline">{t("sale.soldBadge")}</Badge>}
        </p>
        <p className="text-balance break-words text-2xl font-semibold leading-tight tracking-tight">
          {item.title}
        </p>
        {keyFacts && (
          <p className="text-base text-muted-foreground">{keyFacts}</p>
        )}
      </div>
      {tags}
      <div className="overflow-hidden rounded-xl bg-card">
        <dl className={figuresLayout}>
          <Figure
            label={t(
              value.kind === "salePrice"
                ? "collectionTotals.summarySalePrice"
                : several
                  ? "collectionTotals.marketValue"
                  : "items.marketValue",
            )}
            value={money(value.total) ?? missing}
            hint={perPiece(value.perPiece)}
          />
          <Figure
            label={t(`collectionTotals.${gainLoss.kind}`)}
            value={
              gainLoss.amount === undefined ? (
                missing
              ) : (
                <span className={gainLossColour(gainLoss.amount)}>
                  {money(gainLoss.amount, { signed: true })}
                </span>
              )
            }
            hint={
              gainLoss.amount === undefined
                ? t(`items.${gainLoss.kind}None`)
                : undefined
            }
          />
          <Figure
            label={t(
              several
                ? "collectionTotals.purchasePrice"
                : "items.purchasePrice",
            )}
            value={money(paid) ?? missing}
            hint={perPiece(item.purchasePrice)}
          />
          {!sold && item.type === "coin" && item.metal && (
            <MetalValueFigure item={item} />
          )}
        </dl>
      </div>
      {children}
    </div>
  );
}

/**
 * The figures share out each row they fill, two to a row on a phone, and a
 * figure too wide for its share takes the whole row, as the Collection
 * totals' do. Amounts never wrap.
 */
const figuresLayout = "-mb-px -mr-px flex flex-wrap";
const figureLayout =
  "flex min-w-min flex-[1_1_8.5rem] flex-col gap-0.5 border-b border-r px-4 py-3";

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className={figureLayout}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-nowrap text-lg font-semibold proportional-nums sm:text-xl">
        {value}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/**
 * An owned gold or silver coin's Metal value at the latest Spot prices, with
 * its fine weight; or what it still needs to have one.
 */
function MetalValueFigure({ item }: { item: Doc<"items"> }) {
  const t = useI18n();
  const format = useFormatters();
  const { complete, value } = useMetalValue(item);
  const note = (text: string) => (
    <span className="whitespace-normal text-sm font-normal text-muted-foreground">
      {text}
    </span>
  );
  const fineWeight =
    item.weight !== undefined && item.purity !== undefined
      ? item.weight * item.purity * item.quantity
      : undefined;
  return (
    <Figure
      label={t("preciousMetal.metalValue")}
      value={
        !complete ? (
          note(t("preciousMetal.needsWeightAndPurity"))
        ) : value === undefined ? (
          <span
            className="my-1 block h-5 w-24 animate-pulse rounded bg-muted"
            aria-hidden="true"
          />
        ) : value === null ? (
          note(t("preciousMetal.noSpotPrices"))
        ) : (
          format.money(value.amount, value.currency)
        )
      }
      hint={
        value?.stale ? (
          <StaleSpotPrices />
        ) : (
          fineWeight !== undefined &&
          t("collectionTotals.fineWeight", {
            grams: format.number(fineWeight, { maximumFractionDigits: 2 }),
            ounces: format.number(fineWeight / TROY_OUNCE_GRAMS, {
              maximumFractionDigits: 2,
            }),
          })
        )
      }
    />
  );
}

/**
 * One of the facts the Item page sums the Item up with under its title, such
 * as its Grade or Album: an `icon` and text, opening `href` when given (in a
 * new tab, marked, when `external`).
 */
export function ItemTag({
  icon,
  href,
  external = false,
  children,
}: {
  icon: React.ReactNode;
  href?: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const layout =
    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2 text-ui [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";
  const content = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  );
  if (!href) return <li className={layout}>{content}</li>;
  const link = cn(
    layout,
    "outline-none transition-colors duration-100 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
  );
  return (
    <li className="flex max-w-full">
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={link}>
          {content}
          <ArrowUpRight strokeWidth={1.75} aria-hidden="true" />
        </a>
      ) : (
        <Link href={href} className={link}>
          {content}
        </Link>
      )}
    </li>
  );
}

/** ItemHeader while the Item loads. */
export function ItemHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <div className="flex flex-col gap-2.5">
        <span className="h-6 w-24 animate-pulse rounded bg-muted" />
        <span className="h-7 w-72 max-w-[85%] animate-pulse rounded bg-muted" />
        <span className="h-5 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="overflow-hidden rounded-xl bg-card">
        <div className={figuresLayout}>
          {[0, 1, 2].map((figure) => (
            <div key={figure} className={cn(figureLayout, "gap-2")}>
              <span className="h-3 w-20 animate-pulse rounded bg-muted" />
              <span className="h-6 w-28 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
