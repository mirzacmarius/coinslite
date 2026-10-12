"use client";

import { useI18n } from "@/locales/client";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
import { localToday } from "./item-fields";
import { DetailGroup, MoneyField, TextField } from "./item-form-fields";

/**
 * What the person paid for an Item and what it's worth, per piece, under
 * "More details". While the Home currency is being changed the amounts wait
 * (`locked` says why; COIN-125).
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
    </DetailGroup>
  );
}
