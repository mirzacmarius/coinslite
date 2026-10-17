"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import { api } from "@coinslite/backend/convex/_generated/api";
import type { Doc } from "@coinslite/backend/convex/_generated/dataModel";
import { hasMetalValue } from "@coinslite/backend/convex/items/preciousMetal";
import { useQuery } from "convex/react";
import { Clock } from "lucide-react";

/**
 * An Item's Metal value at the latest Spot prices: undefined while it loads,
 * null without Spot prices, and `complete: false` while the Item lacks the
 * weight or purity it needs. It updates live as Spot prices are refreshed.
 */
export function useMetalValue(item: Doc<"items">) {
  const complete = hasMetalValue(item);
  const value = useQuery(
    api.metalValues.ofItem,
    complete ? { itemId: item._id } : "skip",
  );
  return { complete, value };
}

/**
 * An Item's Metal value at the latest Spot prices, in the Home currency. It
 * updates live as Spot prices are refreshed, and says when they're out of date.
 */
export function MetalValue({ item }: { item: Doc<"items"> }) {
  const t = useI18n();
  const format = useFormatters();
  const { complete, value } = useMetalValue(item);

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
  return (
    <>
      <span className="block font-medium">
        {format.money(value.amount, value.currency)}
      </span>
      {value.stale && <StaleSpotPrices />}
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
