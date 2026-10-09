import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  type QueryCtx,
  env,
  internalAction,
  internalMutation,
  query,
} from "./_generated/server";
import { type Quote, fetchQuote } from "./spotPrices/metalPriceApi";
import {
  type MarketRates,
  type Metal,
  TROY_OUNCE_GRAMS,
  marketRates,
} from "./spotPrices/rates";
import { requireSetUpUser } from "./utils/auth";
import { homeCurrency, perDollar } from "./utils/validators";

/** The one stored snapshot, or null before the first successful refresh. */
async function latestSnapshot(ctx: QueryCtx) {
  return await ctx.db.query("spotPriceSnapshots").order("desc").first();
}

/**
 * The latest Spot prices and exchange rates, or null before the first
 * successful refresh. Every conversion uses these stored values: Metal values
 * (`spotPricePerGram`) and Home currency changes (`rate`, `convert`).
 */
export async function latestRates(ctx: QueryCtx): Promise<MarketRates | null> {
  const snapshot = await latestSnapshot(ctx);
  return snapshot && marketRates(snapshot);
}

/** A Spot price in whole minor units of the Home currency. */
const spotPrice = v.object({ perGram: v.number(), perOunce: v.number() });

/**
 * Gold and silver Spot prices in the caller's Home currency, per gram and per
 * troy ounce, with the time they were quoted. Null until the first refresh.
 */
export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      currency: homeCurrency,
      quotedAt: v.number(),
      stale: v.boolean(),
      gold: spotPrice,
      silver: spotPrice,
    }),
  ),
  handler: async (ctx) => {
    const { homeCurrency: currency } = await requireSetUpUser(ctx);
    const rates = await latestRates(ctx);
    if (!rates) return null;
    const priceOf = (metal: Metal) => {
      const perGram = rates.spotPricePerGram(metal, currency);
      return {
        perGram: Math.round(perGram),
        perOunce: Math.round(perGram * TROY_OUNCE_GRAMS),
      };
    };
    return {
      currency,
      quotedAt: rates.quotedAt,
      stale: rates.stale,
      gold: priceOf("gold"),
      silver: priceOf("silver"),
    };
  },
});

/**
 * Fetches the latest prices and stores them. Runs every 15 minutes (crons.ts)
 * and makes one provider request however many people use CoinsLite. When the
 * provider fails, or no key is set, the last good snapshot stays in place.
 */
export const refresh = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const apiKey = env.METALPRICE_API_KEY;
    if (!apiKey) {
      console.warn(
        "Spot prices not refreshed: METALPRICE_API_KEY isn't set. Keeping the last stored prices.",
      );
      await ctx.runMutation(internal.spotPrices.recordFailedRefresh, {});
      return null;
    }
    let quote: Quote;
    try {
      quote = await fetchQuote(apiKey);
    } catch (error) {
      console.error(
        "Spot prices not refreshed; keeping the last stored prices.",
        error,
      );
      await ctx.runMutation(internal.spotPrices.recordFailedRefresh, {});
      return null;
    }
    await ctx.runMutation(internal.spotPrices.record, quote);
    return null;
  },
});

/** Replaces the stored snapshot with freshly fetched prices. */
export const record = internalMutation({
  args: { quotedAt: v.number(), perDollar },
  returns: v.null(),
  handler: async (ctx, quote) => {
    const now = Date.now();
    const snapshot = { ...quote, fetchedAt: now, checkedAt: now };
    const latest = await latestSnapshot(ctx);
    if (latest) {
      await ctx.db.replace("spotPriceSnapshots", latest._id, snapshot);
    } else {
      await ctx.db.insert("spotPriceSnapshots", snapshot);
    }
    return null;
  },
});

/** Notes a failed refresh; the stored prices stay, and age into being out of date. */
export const recordFailedRefresh = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const latest = await latestSnapshot(ctx);
    if (latest) {
      await ctx.db.patch("spotPriceSnapshots", latest._id, {
        checkedAt: Date.now(),
      });
    }
    return null;
  },
});
