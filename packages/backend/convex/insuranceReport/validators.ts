import { type Infer, v } from "convex/values";
import {
  gradingScale,
  homeCurrency,
  itemType,
  language,
  reportColumn,
  reportValues,
  strike,
} from "../utils/validators";

/** Which Items a report covers: the whole Collection, or chosen Albums and/or Items without an Album. */
export const reportScope = v.union(
  v.object({ kind: v.literal("collection") }),
  v.object({
    kind: v.literal("albums"),
    albumIds: v.array(v.id("albums")),
    withoutAlbum: v.boolean(),
  }),
);
export type ReportScope = Infer<typeof reportScope>;

/** What a report is asked for: its scope and its value columns. */
export const reportArgs = {
  scope: reportScope,
  columns: v.array(reportColumn),
};

/** A Spot price in whole minor units of the Home currency. */
const spotPrice = v.object({ perGram: v.number(), perOunce: v.number() });

/** Everything the Insurance report PDF shows, read in one transaction. */
export const reportContents = v.object({
  owner: v.object({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    /** ISO 3166-1 alpha-2. */
    country: v.optional(v.string()),
    language: v.optional(language),
  }),
  currency: homeCurrency,
  scope: v.union(
    v.object({ kind: v.literal("collection") }),
    v.object({
      kind: v.literal("albums"),
      /** The chosen Albums' names. */
      albums: v.array(v.string()),
      withoutAlbum: v.boolean(),
    }),
  ),
  /** The chosen columns, in report order. */
  columns: v.array(reportColumn),
  /** The Spot prices the Metal values use; null before the first ones arrive. */
  spotPrices: v.union(
    v.null(),
    v.object({
      quotedAt: v.number(),
      stale: v.boolean(),
      gold: spotPrice,
      silver: spotPrice,
    }),
  ),
  rows: v.array(
    v.object({
      type: itemType,
      title: v.string(),
      year: v.optional(v.number()),
      denomination: v.optional(v.string()),
      gradingScale: v.optional(gradingScale),
      grade: v.optional(v.string()),
      strike: v.optional(strike),
      quantity: v.number(),
      values: reportValues,
    }),
  ),
  totals: v.object({
    items: v.number(),
    pieces: v.number(),
    values: reportValues,
  }),
});
export type ReportContents = Infer<typeof reportContents>;
