import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  type QueryCtx,
  env,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { type Quote, fetchQuote } from "./spotPrices/metalPriceApi";
import {
  type MarketRates,
  type Metal,
  marketRates,
  spotPriceOf,
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

/** Spot prices and exchange rates as kept for one day; never stale. */
const ratesOfDay = (day: Doc<"spotPriceDays">) =>
  marketRates({
    quotedAt: day.quotedAt,
    fetchedAt: day.quotedAt,
    checkedAt: day.quotedAt,
    perDollar: day.perDollar,
  });

/**
 * The Spot prices of each month's end, by its last day ("YYYY-MM-DD"): the
 * last kept day up to it, or for months before the first kept day the
 * earliest. Before any day is kept, the latest prices; null before any.
 */
export async function ratesForDays(ctx: QueryCtx, lastDays: string[]) {
  const earliest = await ctx.db
    .query("spotPriceDays")
    .withIndex("by_day")
    .order("asc")
    .first();
  if (!earliest) {
    const latest = await latestRates(ctx);
    return lastDays.map(() => latest);
  }
  return await Promise.all(
    lastDays.map(async (lastDay) => {
      const day = await ctx.db
        .query("spotPriceDays")
        .withIndex("by_day", (q) => q.lte("day", lastDay))
        .order("desc")
        .first();
      return ratesOfDay(day ?? earliest);
    }),
  );
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
    const priceOf = (metal: Metal) =>
      spotPriceOf(rates.spotPricePerGram(metal, currency));
    return {
      currency,
      quotedAt: rates.quotedAt,
      stale: rates.stale,
      gold: priceOf("gold"),
      silver: priceOf("silver"),
    };
  },
});

/** A month, rounded up to 31 days. */
const MONTH_MS = 31 * 24 * 60 * 60 * 1000;
/** Half the refresh schedule's 15 minutes (crons.ts): a run may start a little early. */
const SCHEDULE_SLACK_MS = 7.5 * 60 * 1000;

/**
 * How long to wait after a provider request before the next one, so a plan's
 * monthly quota lasts the month with a tenth to spare. Without a known quota,
 * every scheduled run asks.
 */
function waitBetweenRequests(requestsPerMonth: number | undefined) {
  if (!requestsPerMonth) return 0;
  return MONTH_MS / (requestsPerMonth * 0.9) - SCHEDULE_SLACK_MS;
}

/** When the provider was last asked, and the plan's quota it stated. */
export const lastRequest = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      checkedAt: v.number(),
      requestsPerMonth: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const snapshot = await latestSnapshot(ctx);
    return (
      snapshot && {
        checkedAt: snapshot.checkedAt,
        requestsPerMonth: snapshot.requestsPerMonth,
      }
    );
  },
});

/**
 * Fetches the latest prices and stores them. Runs every 15 minutes (crons.ts)
 * and makes one provider request however many people use CoinsLite, fewer
 * when the provider's plan allows fewer a month. When the provider fails, or
 * no key is set, the last good snapshot stays in place.
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
    const last = await ctx.runQuery(internal.spotPrices.lastRequest, {});
    if (
      last &&
      Date.now() - last.checkedAt < waitBetweenRequests(last.requestsPerMonth)
    ) {
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

/**
 * Replaces the stored snapshot with freshly fetched prices, and keeps the
 * day's first good prices for good (spotPriceDays) for "Value over time".
 */
export const record = internalMutation({
  args: {
    quotedAt: v.number(),
    perDollar,
    requestsPerMonth: v.optional(v.number()),
  },
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
    const day = new Date(now).toISOString().slice(0, 10);
    const kept = await ctx.db
      .query("spotPriceDays")
      .withIndex("by_day", (q) => q.eq("day", day))
      .first();
    if (!kept) {
      await ctx.db.insert("spotPriceDays", {
        day,
        quotedAt: quote.quotedAt,
        perDollar: quote.perDollar,
      });
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
