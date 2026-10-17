"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  type CollectionTotals,
  type DistributionEntry,
  valueDistribution,
} from "@coinslite/backend/convex/items/totals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coinslite/ui/table";
import { useMemo } from "react";
import { ChartCard, Legend, type Series, seriesColors } from "./chart-card";

const columns = ["purchasePrice", "marketValue", "metalValue"] as const;

/** The amounts an entry shows, by series: two for an Item type, one for a metal. */
const barsOf = (entry: DistributionEntry): [Series, number][] =>
  "metalValue" in entry
    ? [["metalValue", entry.metalValue]]
    : [
        ["purchasePrice", entry.purchasePrice],
        ["marketValue", entry.marketValue],
      ];

/**
 * Value distribution (spec 7): Purchase price and Market value by Item type,
 * plus the Metal value of gold and silver, as bars on one money scale. The
 * Metal value is part of what the coins are worth, so the bars aren't meant
 * to add up.
 */
export function ValueDistributionChart({
  totals,
}: {
  totals: CollectionTotals;
}) {
  const t = useI18n();
  const format = useFormatters();
  const entries = useMemo(() => valueDistribution(totals), [totals]);
  const money = (amount: number) => format.money(amount, totals.currency);
  const names: Record<Series, string> = {
    purchasePrice: t("items.purchasePrice"),
    marketValue: t("items.marketValue"),
    metalValue: t("preciousMetal.metalValue"),
  };
  const labelOf = ({ kind }: DistributionEntry) =>
    kind === "gold" || kind === "silver"
      ? t(`items.materials.${kind}`)
      : t(`collectionTotals.typesPlural.${kind}`);
  const max = Math.max(
    0,
    ...entries.flatMap((entry) => barsOf(entry).map(([, amount]) => amount)),
  );
  const hasMetal = entries.some((entry) => "metalValue" in entry);
  const shownColumns = columns.filter(
    (column) => column !== "metalValue" || hasMetal,
  );

  return (
    <ChartCard
      title={t("collectionTotals.valueDistribution")}
      description={t("collectionTotals.valueDistributionDescription")}
      chart={
        <>
          <Legend
            shape="bar"
            entries={shownColumns.map((series) => ({
              series,
              label: names[series],
            }))}
          />
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.kind}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3"
              >
                <span className="truncate text-ui">{labelOf(entry)}</span>
                <div className="flex flex-col gap-0.5">
                  {barsOf(entry).map(([series, amount]) => (
                    <div key={series} className="flex h-4 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2.5 shrink-0 rounded-r"
                        style={{
                          width: `calc((100% - 6.5rem) * ${max > 0 ? amount / max : 0})`,
                          minWidth: amount > 0 ? 2 : 0,
                          background: seriesColors[series],
                        }}
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        <span className="sr-only">{names[series]} </span>
                        {money(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      }
      table={(titleId) => (
        <Table aria-labelledby={titleId}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">
                {t("collectionTotals.part")}
              </TableHead>
              {shownColumns.map((column) => (
                <TableHead key={column} className="text-right last:pr-4">
                  {names[column]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const amounts = new Map(barsOf(entry));
              return (
                <TableRow key={entry.kind}>
                  <TableCell className="pl-4">{labelOf(entry)}</TableCell>
                  {shownColumns.map((column) => {
                    const amount = amounts.get(column);
                    return (
                      <TableCell key={column} className="text-right last:pr-4">
                        {amount === undefined ? "–" : money(amount)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    />
  );
}
