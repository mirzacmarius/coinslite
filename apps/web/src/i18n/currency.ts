import type { PremiumCurrency } from "@coinslite/backend/convex/billing/rules";
import type { Locale } from "@coinslite/i18n";

/** The currency each language's readers most likely pay in, shown first. */
export const likelyCurrency: Record<Locale, PremiumCurrency> = {
  en: "USD",
  nb: "NOK",
  de: "EUR",
  fr: "EUR",
  ro: "RON",
};
