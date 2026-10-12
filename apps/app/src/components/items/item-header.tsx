"use client";

import { gainLossColour } from "@/components/collection-totals/collection-totals";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { itemFigures } from "@coinslite/backend/convex/items/totals";
import type { MoneyFormatOptions } from "@coinslite/i18n";
import { Badge } from "@coinslite/ui/badge";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";
import type * as React from "react";

/**
 * How the Item page shows an amount in the Item's Home currency, undefined
 * for none. Every amount on the page goes through the one the page makes.
 */
export type ItemMoney = (
  amount: number | undefined,
  options?: MoneyFormatOptions,
) => string | undefined;

const headerLayout = "flex flex-col gap-3 border-b p-4";

/**
 * What the Item page leads with: the title, the key facts (year ·
 * denomination · country), the Market value (the total, with the value per
 * piece, when there are several) and the Gain/loss, by the Collection totals'
 * rules (itemFigures): a sold Item shows what it sold for and its realised
 * Gain/loss. The bar above already holds the page's heading, so the title
 * here isn't a second one.
 */
export function ItemHeader({
  item,
  money,
}: {
  item: Doc<"items">;
  money: ItemMoney;
}) {
  const t = useI18n();
  const format = useFormatters();
  const { value, gainLoss } = itemFigures(item);
  const several = item.quantity > 1;
  const keyFacts = [
    item.year,
    item.denomination,
    item.country && format.country(item.country),
  ]
    .filter((fact) => fact !== undefined && fact !== "")
    .join(" · ");
  const missing = <span className="text-muted-foreground">–</span>;

  return (
    <div className={headerLayout}>
      <div className="flex items-center gap-3">
        <ItemTypeIcon type={item.type} />
        <p className="min-w-0 break-words text-lg font-semibold leading-snug">
          {item.title}
        </p>
        {item.soldOn !== undefined && (
          <Badge variant="outline">{t("sale.soldBadge")}</Badge>
        )}
      </div>
      {keyFacts && <p className="text-sm text-muted-foreground">{keyFacts}</p>}
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <HeaderFigure
          label={t(
            value.kind === "salePrice"
              ? "collectionTotals.summarySalePrice"
              : several
                ? "collectionTotals.marketValue"
                : "items.marketValue",
          )}
          value={money(value.total) ?? missing}
          hint={
            several && value.perPiece !== undefined
              ? `${format.number(item.quantity)} × ${money(value.perPiece)}`
              : undefined
          }
        />
        <HeaderFigure
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
      </dl>
    </div>
  );
}

function HeaderFigure({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-nowrap text-xl font-semibold proportional-nums">
        {value}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** ItemHeader while the Item loads. */
export function ItemHeaderSkeleton() {
  return (
    <div className={headerLayout} aria-hidden="true">
      <div className="flex items-center gap-3">
        <span className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
        <span className="h-5 w-56 max-w-[70%] animate-pulse rounded bg-muted" />
      </div>
      <span className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="flex gap-8">
        {[0, 1].map((figure) => (
          <div key={figure} className="flex flex-col gap-1.5">
            <span className="h-3 w-20 animate-pulse rounded bg-muted" />
            <span className="h-6 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
