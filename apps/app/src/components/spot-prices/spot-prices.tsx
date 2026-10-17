"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coinslite/ui/table";
import { cn } from "@coinslite/ui/utils";
import { useQuery } from "convex/react";
import { Clock } from "lucide-react";
import { useId } from "react";

const metals = ["gold", "silver"] as const;

/**
 * Gold and silver Spot prices in the person's Home currency, per gram and per
 * troy ounce. The server refreshes them every 15 minutes; this updates live.
 */
export function SpotPrices({ className }: { className?: string }) {
  const t = useI18n();
  const format = useFormatters();
  const titleId = useId();
  const prices = useQuery(api.spotPrices.current, {});

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={prices === undefined}
      className={cn("rounded-xl bg-card", className)}
    >
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 border-b px-4 py-2">
        <h2 id={titleId} className="text-ui font-medium">
          {t("spotPrices.title")}
        </h2>
        {prices && (
          <p className="text-xs text-muted-foreground">
            {t("spotPrices.updated", {
              time: format.dateTime(prices.quotedAt),
            })}
          </p>
        )}
      </div>
      {prices === undefined ? (
        <div className="flex flex-col divide-y" aria-hidden="true">
          {metals.map((metal) => (
            <div key={metal} className="flex h-9 items-center gap-3 px-4">
              <span className="h-3.5 w-14 animate-pulse rounded bg-muted" />
              <span className="ml-auto h-3.5 w-36 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : prices === null ? (
        <div className="flex flex-col gap-1 px-4 py-6 text-center">
          <p className="text-ui font-medium">{t("spotPrices.emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("spotPrices.emptyDescription")}
          </p>
        </div>
      ) : (
        <>
          <Table aria-labelledby={titleId}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{t("spotPrices.metal")}</TableHead>
                <TableHead className="text-right">
                  {t("spotPrices.perGram")}
                </TableHead>
                <TableHead className="pr-4 text-right">
                  {t("spotPrices.perOunce")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metals.map((metal) => (
                <TableRow key={metal} className="hover:bg-transparent">
                  <TableCell className="pl-4">
                    {t(`items.materials.${metal}`)}
                  </TableCell>
                  <TableCell className="text-right">
                    {format.money(prices[metal].perGram, prices.currency)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {format.money(prices[metal].perOunce, prices.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {prices.stale && (
            <p className="flex items-start gap-1.5 border-t px-4 py-2 text-xs text-muted-foreground">
              <Clock
                className="mt-px size-3.5 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {t("spotPrices.stale")}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The sidebar's Spot prices: each metal per gram and per troy ounce, in a
 * card narrow enough for the sidebar. Nothing shows until prices exist.
 */
export function SidebarSpotPrices() {
  const t = useI18n();
  const format = useFormatters();
  const titleId = useId();
  const prices = useQuery(api.spotPrices.current, {});
  if (!prices) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-1 rounded-xl bg-background px-3 py-2.5"
    >
      <h2 id={titleId} className="text-xs font-medium">
        {t("spotPrices.title")}
      </h2>
      <table
        aria-labelledby={titleId}
        className="w-full whitespace-nowrap text-xs tabular-nums"
      >
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="sr-only">
              {t("spotPrices.metal")}
            </th>
            <th scope="col" className="py-0.5 text-right font-normal">
              {t("spotPrices.perGram")}
            </th>
            <th scope="col" className="py-0.5 pl-1.5 text-right font-normal">
              {t("spotPrices.perOunce")}
            </th>
          </tr>
        </thead>
        <tbody>
          {metals.map((metal) => (
            <tr key={metal}>
              <th
                scope="row"
                className="py-0.5 pr-1.5 text-left font-normal text-muted-foreground"
              >
                {t(`items.materials.${metal}`)}
              </th>
              <td className="py-0.5 text-right">
                {format.money(prices[metal].perGram, prices.currency)}
              </td>
              <td className="py-0.5 pl-1.5 text-right">
                {format.money(prices[metal].perOunce, prices.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {prices.stale && (
        <p className="flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
          <Clock
            className="mt-px size-3 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {t("spotPrices.stale")}
        </p>
      )}
    </section>
  );
}
