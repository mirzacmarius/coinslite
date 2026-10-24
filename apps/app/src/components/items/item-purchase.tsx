"use client";

import { useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
import { useQuery } from "convex/react";
import { localToday } from "./item-fields";
import { DetailGroup, MoneyField, TextField } from "./item-form-fields";

/**
 * What the person paid for an Item and what it's worth, per piece, where it
 * came from and where it's kept, under "More details". While the Home
 * currency is being changed the amounts wait (`locked` says why; COIN-125).
 * Kept in suggests the places the person's other Items are kept in, so the
 * same place is written the same way and the Collection's Kept in filter
 * lists it once.
 */
export function PurchaseSection({
  currency,
  locked,
}: {
  /** The currency amounts are typed in. */
  currency: string;
  locked: string | undefined;
}) {
  const t = useI18n();
  const places = useQuery(api.collection.storagePlaces, {});
  return (
    <DetailGroup title={t("items.purchase")}>
      <MoneyField
        name="purchasePrice"
        label={t("items.purchasePrice")}
        currency={currency}
        locked={locked}
      />
      <MoneyField
        name="marketValue"
        label={t("items.marketValue")}
        currency={currency}
        locked={locked}
      />
      <TextField
        name="purchaseDate"
        label={t("items.purchaseDate")}
        type="date"
        max={localToday()}
      />
      <TextField
        name="source"
        label={t("items.source")}
        placeholder={t("items.sourcePlaceholder")}
        maxLength={itemLimits.source}
      />
      <TextField
        name="storage"
        label={t("items.storage")}
        placeholder={t("items.storagePlaceholder")}
        maxLength={itemLimits.storage}
        suggestions={places}
      />
    </DetailGroup>
  );
}
