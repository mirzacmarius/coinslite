"use client";

import { useConvertingTo } from "@/components/account/home-currency-change";
import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { hasMetalValue } from "@coinslite/backend/convex/items/preciousMetal";
import { TROY_OUNCE_GRAMS } from "@coinslite/backend/convex/spotPrices/rates";
import { useQuery } from "convex/react";
import { Clock } from "lucide-react";

/**
 * An Item's Metal value at the latest Spot prices: undefined while it loads,
 * null without Spot prices, and `complete: false` while the Item lacks the
 * weight or purity it needs. It updates live as Spot prices are refreshed.
 */
function useMetalValue(item: Doc<"items">) {
  const complete = hasMetalValue(item);
  const value = useQuery(
    api.metalValues.ofItem,
    complete ? { itemId: item._id } : "skip",
  );
  return { complete, value };
}

/**
 * An Item's Metal value at the latest Spot prices, in the Home currency, with
 * its fine weight and, for an owned Item with a Market value, how far that
 * stands above or below the Metal value (the premium). It updates live as
 * Spot prices are refreshed, and says when they're out of date.
 */
export function MetalValue({ item }: { item: Doc<"items"> }) {
  const t = useI18n();
  const format = useFormatters();
  const { complete, value } = useMetalValue(item);
  const convertingTo = useConvertingTo();

  if (!complete) {
    return (
      <span className="text-muted-foreground">
        {t("preciousMetal.needsWeightAndPurity")}
      </span>
    );
  }
  if (value === undefined) {
    return (
      <span
        className="block h-3.5 w-20 animate-pulse rounded bg-muted"
        aria-hidden="true"
      />
    );
  }
  if (value === null) {
    return (
      <span className="text-muted-foreground">
        {t("preciousMetal.noSpotPrices")}
      </span>
    );
  }
  const note = "block text-xs text-muted-foreground";
  // All the pieces' fine weight; a complete Item has a weight and purity.
  const fineWeight =
    item.weight !== undefined && item.purity !== undefined
      ? item.weight * item.purity * item.quantity
      : undefined;
  // The Market value of all the pieces against their Metal value, though not
  // while a Home currency change converts the Market value; a sold Item's
  // last Market value isn't weighed against today's Spot prices.
  const premium =
    item.soldOn === undefined &&
    convertingTo === undefined &&
    value.amount > 0 &&
    item.marketValue !== undefined
      ? (item.marketValue * item.quantity - value.amount) / value.amount
      : undefined;
  const premiumLine = (share: number) => {
    const percent = format.number(Math.abs(share) * 100, {
      maximumFractionDigits: 1,
    });
    if (percent === format.number(0)) return t("preciousMetal.premium.equal");
    return t(
      share > 0 ? "preciousMetal.premium.above" : "preciousMetal.premium.below",
      { percent },
    );
  };
  return (
    <>
      <span className="block font-medium">
        {format.money(value.amount, value.currency)}
      </span>
      {value.stale && <StaleSpotPrices />}
      {fineWeight !== undefined && (
        <span className={note}>
          {t("collectionTotals.fineWeight", {
            grams: format.number(fineWeight, { maximumFractionDigits: 2 }),
            ounces: format.number(fineWeight / TROY_OUNCE_GRAMS, {
              maximumFractionDigits: 2,
            }),
          })}
        </span>
      )}
      {premium !== undefined && (
        <span className={note}>{premiumLine(premium)}</span>
      )}
    </>
  );
}

/** Says the Spot prices a Metal value was worked out at may be out of date. */
export function StaleSpotPrices() {
  const t = useI18n();
  return (
    <span className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
      <Clock
        className="mt-px size-3.5 shrink-0"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {t("preciousMetal.stale")}
    </span>
  );
}
