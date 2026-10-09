import { homeCurrencies, locales } from "@coinslite/i18n";
import { v } from "convex/values";
import { albumColours } from "../albums/rules";
import { type GradingScale, gradingScaleIds, strikes } from "../items/grades";
import { materials } from "../items/rules";

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

/** One of the Grading scales in items/grades.ts. */
export const gradingScale = literalUnion(
  gradingScaleIds as [GradingScale, GradingScale, ...GradingScale[]],
);
/** Circulation, BU or proof. */
export const strike = literalUnion(strikes);
/** One of the coin materials in items/rules.ts. */
export const material = literalUnion(materials);
/** One of the Album colours in albums/rules.ts. */
export const albumColour = literalUnion(albumColours);
