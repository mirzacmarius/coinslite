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

/** A validator accepting exactly the given strings, e.g. the supported locales. */
function literalUnion<T extends string>(values: readonly [T, T, ...T[]]) {
  const [first, second, ...rest] = values;
  return v.union(
    v.literal(first),
    v.literal(second),
    ...rest.map((value) => v.literal(value)),
  );
}

export const language = literalUnion(locales);
export const homeCurrency = literalUnion(homeCurrencies);

/** Coin, banknote or stamp. */
export const itemType = v.union(
  v.literal("coin"),
  v.literal("banknote"),
  v.literal("stamp"),
);
