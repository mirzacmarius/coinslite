import { homeCurrencies, locales } from "@coinslite/i18n";
import { v } from "convex/values";
import { z } from "zod";

export const username = z
  .string()
  .min(3)
  .max(32)
  .toLowerCase()
  .trim()
  .regex(
    /^[a-zA-Z0-9]+$/,
    "Username may only contain alphanumeric characters.",
  );

const [firstLocale, secondLocale, ...otherLocales] = locales;
export const language = v.union(
  v.literal(firstLocale),
  v.literal(secondLocale),
  ...otherLocales.map((locale) => v.literal(locale)),
);

const [firstCurrency, secondCurrency, ...otherCurrencies] = homeCurrencies;
export const homeCurrency = v.union(
  v.literal(firstCurrency),
  v.literal(secondCurrency),
  ...otherCurrencies.map((currency) => v.literal(currency)),
);
