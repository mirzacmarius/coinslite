import { homeCurrencies, locales } from "@coinslite/i18n";
import { v } from "convex/values";

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
