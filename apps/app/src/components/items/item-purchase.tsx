"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { api } from "@coinslite/backend/convex/_generated/api";
import { itemLimits } from "@coinslite/backend/convex/items/rules";
import type { HomeCurrency } from "@coinslite/i18n";
import { useSelector } from "@tanstack/react-form";
import { useQuery } from "convex/react";
import { localToday } from "./item-fields";
import {
  DetailGroup,
  MoneyField,
  TextField,
  useItemFields,
} from "./item-form-fields";
import {
  type StoredPurchase,
  usePaidHint,
  usePaidPicker,
} from "./paid-in-currency";

/**
 * What the person paid for an Item and what it's worth, per piece, where it
 * came from and where it's kept, under "More details". The Purchase price
 * may be typed in the currency it was paid in, and is converted at the ECB
 * rates of the purchase date (paid-in-currency.ts). While the Home
 * currency is being changed the amounts wait (`locked` says why; COIN-125).
 * Kept in suggests the places the person's other Items are kept in, so the
 * same place is written the same way and the Collection's Kept in filter
 * lists it once.
 */
export function PurchaseSection({
  currency,
  locked,
  stored,
}: {
  /** The Home currency amounts are typed in. */
  currency: HomeCurrency | undefined;
  locked: string | undefined;
  /** The edited Item's purchase as stored. */
  stored?: StoredPurchase;
}) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const { form } = useItemFields();
  const places = useQuery(api.collection.storagePlaces, {});
  const paidIn = useSelector(
    form.store,
    (state) => state.values.purchaseCurrency,
  );
  const amountText = useSelector(
    form.store,
    (state) => state.values.purchasePrice,
  );
  const purchaseDate = useSelector(
    form.store,
    (state) => state.values.purchaseDate,
  );
  const picker = usePaidPicker(currency ?? "EUR", (picked) =>
    form.setFieldValue("purchaseCurrency", picked),
  );
  const { hint, problem } = usePaidHint({
    amountText,
    currency: paidIn,
    home: currency,
    purchaseDate,
    locale,
    stored,
  });
  return (
    <DetailGroup title={t("items.purchase")}>
      <MoneyField
        name="purchasePrice"
        label={t("items.purchasePrice")}
        currency={paidIn ?? currency ?? ""}
        locked={locked}
        currencyPicker={currency ? picker : undefined}
        hint={hint}
        problem={problem}
      />
      <MoneyField
        name="marketValue"
        label={t("items.marketValue")}
        currency={currency ?? ""}
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
