import { homeCurrencies, locales } from "@coinslite/i18n";
import { v } from "convex/values";
import { planFilters, sortOrders, userSorts } from "../admin/userList";
import { albumColours } from "../albums/rules";
import {
  alloyMetals,
  catalogItemTypes,
  catalogKinds,
  coinEdges,
  preciousMetals,
} from "../catalog/fields";
import { scannerAvailabilities } from "../featureFlags/rules";
import { reportColumns } from "../insuranceReport/rules";
import { type GradingScale, gradingScaleIds, strikes } from "../items/grades";
import { materials } from "../items/rules";
import { photoSides } from "../photos/rules";
import { metals } from "../spotPrices/rates";

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

/** A Catalog node: a country or Theme root, a grouping, or a Catalog entry. */
export const catalogKind = literalUnion(catalogKinds);
/** The Catalog holds coins and banknotes, no stamps. */
export const catalogItemType = literalUnion(catalogItemTypes);
/** A metal with a Spot price, for Metal value. */
export const preciousMetal = literalUnion(preciousMetals);
/** A metal in a Catalog entry's alloy. */
export const alloyMetal = literalUnion(alloyMetals);
/** How a coin's edge is finished. */
export const coinEdge = literalUnion(coinEdges);
/** What a Catalog entry's alloy is made of, in percent of its weight. */
export const composition = v.array(
  v.object({ metal: alloyMetal, percent: v.number() }),
);
/**
 * A Catalog entry's facts Items have no field for (items/catalogFacts.ts
 * entryDetails): read live from a linked entry, or frozen on an Item whose
 * entry left the Catalog.
 */
export const catalogDetails = v.object({
  noMintMark: v.optional(v.literal(true)),
  mint: v.optional(v.string()),
  composition: v.optional(composition),
  edge: v.optional(coinEdge),
  edgeLettering: v.optional(v.string()),
  designers: v.optional(v.array(v.string())),
  issueDate: v.optional(v.string()),
  withdrawalDate: v.optional(v.string()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
});
/** Where a group of Catalog facts, its notes or its image come from. */
export const provenance = v.object({
  source: v.string(),
  author: v.optional(v.string()),
  licence: v.optional(v.string()),
  link: v.optional(v.string()),
});

/** A Catalog node's notes in another of the app's languages, with their own credit. */
export const notesTranslation = v.object({
  technicalDetails: v.optional(v.string()),
  historicalNotes: v.optional(v.string()),
  provenance,
});
/** A node's translated notes by language; another language of the app adds a field. */
export const notesTranslations = v.object({
  en: v.optional(notesTranslation),
  nb: v.optional(notesTranslation),
  de: v.optional(notesTranslation),
  fr: v.optional(notesTranslation),
  ro: v.optional(notesTranslation),
});

/** One of the Album colours in albums/rules.ts. */
export const albumColour = literalUnion(albumColours);
/** Which side of an Item a photo shows: front or back. */
export const photoSide = literalUnion(photoSides);

/**
 * What one US dollar buys: units of each Home currency, and troy ounces of
 * gold (XAU) and silver (XAG). See spotPrices/rates.ts.
 */
export const perDollar = v.object({
  NOK: v.number(),
  SEK: v.number(),
  DKK: v.number(),
  EUR: v.number(),
  RON: v.number(),
  GBP: v.number(),
  USD: v.number(),
  CHF: v.number(),
  XAU: v.number(),
  XAG: v.number(),
});

/** A precious metal with a Spot price: gold or silver. */
export const metal = literalUnion(metals);

/** What the admin user list sorts by (admin/userList.ts). */
export const userSort = literalUnion(userSorts);
/** Ascending or descending. */
export const sortOrder = literalUnion(sortOrders);
/** Everyone, or the people on one plan. */
export const planFilter = literalUnion(planFilters);

/** Who may use the scanner: off, admins only, or Premium beta. */
export const scannerAvailability = literalUnion(scannerAvailabilities);
/** A feature flag (featureFlags.ts): its key and a value of that flag's type. */
export const featureFlag = v.union(
  v.object({ key: v.literal("catalogVisible"), value: v.boolean() }),
  v.object({
    key: v.literal("scannerAvailability"),
    value: scannerAvailability,
  }),
);

/** A value column of the Insurance report (insuranceReport/rules.ts). */
export const reportColumn = literalUnion(reportColumns);

/** An amount in each value column of the Insurance report; a missing value is absent. */
export const reportValues = v.object({
  purchasePrice: v.optional(v.number()),
  marketValue: v.optional(v.number()),
  metalValue: v.optional(v.number()),
  insuredValue: v.optional(v.number()),
});
