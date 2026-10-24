"use client";

import { useMoney } from "@/components/account/home-currency-change";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import type { Material } from "@coinslite/backend/convex/items/rules";
import {
  type CollectionTotals,
  type GroupTotal,
  notRecorded,
} from "@coinslite/backend/convex/items/totals";
import type { HomeCurrency } from "@coinslite/i18n";
import { useId } from "react";
import { seriesColors } from "./chart-card";
import { type BreakdownRow, breakdownRows } from "./breakdown-rows";

/**
 * The Overview's breakdown (spec 9): the Items and Market value of each
 * country, decade and material the owned Items span, largest first with a
 * bar per row, the rest folded into "Other" and the Items without the fact
 * last.
 */
export function Insights({ totals }: { totals: CollectionTotals }) {
  const t = useI18n();
  const format = useFormatters();
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-xl bg-card">
      <div className="border-b px-4 py-2">
        <h2 id={titleId} className="text-ui font-medium">
          {t("collectionTotals.breakdown")}
        </h2>
      </div>
      <div className="grid gap-x-6 gap-y-4 p-4 lg:grid-cols-3">
        <Breakdown
          title={t("collectionTotals.byCountry")}
          groups={totals.byCountry}
          currency={totals.currency}
          name={(key) => format.country(key)}
        />
        <Breakdown
          title={t("collectionTotals.byDecade")}
          groups={totals.byDecade}
          currency={totals.currency}
          name={(key) => t("collection.decade", { decade: key })}
        />
        <Breakdown
          title={t("collectionTotals.byMaterial")}
          groups={totals.byMaterial}
          currency={totals.currency}
          name={(key) => t(`items.materials.${key as Material}`)}
        />
      </div>
    </section>
  );
}

/** One breakdown: its rows, each with its name, Items, Market value and bar. */
function Breakdown({
  title,
  groups,
  currency,
  name,
}: {
  title: string;
  groups: GroupTotal[];
  currency: HomeCurrency;
  /** A group's name from its key. */
  name: (key: string) => string;
}) {
  const t = useI18n();
  const format = useFormatters();
  const money = useMoney();
  const rows = breakdownRows(groups);
  const label = (row: BreakdownRow) =>
    row.others !== undefined
      ? t("collectionTotals.otherGroups", { count: format.number(row.others) })
      : row.key === notRecorded
        ? t("collectionTotals.notRecorded")
        : name(row.key);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">–</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-ui">{label(row)}</span>
                <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">
                  {t("collectionTotals.summaryItems", { count: row.items })}
                  {row.marketValue > 0 && (
                    <>
                      {" · "}
                      <span className="text-foreground">
                        {money(row.marketValue, currency)}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    // A sliver for any row that counts something, so none reads as nothing.
                    width: `${row.share > 0 ? Math.max(row.share * 100, 2) : 0}%`,
                    background: seriesColors.marketValue,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
