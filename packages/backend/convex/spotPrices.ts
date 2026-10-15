import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
  env,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { fetchMetals } from "./spotPrices/goldApi";
import { fetchQuote } from "./spotPrices/metalPriceApi";
import {
  type MarketRates,
  type Metal,
  marketRates,
  spotPriceOf,
} from "./spotPrices/rates";
import { nextSnapshot } from "./spotPrices/snapshot";
import { setUpUserOrNull } from "./utils/auth";
import { homeCurrency, perDollar } from "./utils/validators";

/**
 * The one stored snapshot, or null before the first refresh with exchange
 * rates. Only a refresh that brings prices changes it, so a query that reads
 * the prices this way isn't re-run by one that brings none.
 */
export async function latestSnapshot(ctx: QueryCtx) {
  const snapshot = await ctx.db
    .query("spotPriceSnapshots")
    .order("desc")
    .first();
  return (
    snapshot && {
      ...snapshot,
      ratesQuotedAt: snapshot.ratesQuotedAt ?? snapshot.quotedAt,
    }
  );
}

/**
 * When a refresh was last attempted, kept apart from the prices
 * (spotPriceChecks); before that is first written, where the snapshot kept it.
 */
async function lastCheckedAt(
  ctx: QueryCtx,
  snapshot: Doc<"spotPriceSnapshots">,
) {
  const check = await ctx.db.query("spotPriceChecks").unique();
  return check?.checkedAt ?? snapshot.checkedAt ?? snapshot.fetchedAt;
}

/** When MetalpriceAPI was last asked. */
async function lastRatesCheckedAt(
  ctx: QueryCtx,
  snapshot: Doc<"spotPriceSnapshots">,
) {
  const check = await ctx.db.query("spotPriceChecks").unique();
  return check?.ratesCheckedAt ?? (await lastCheckedAt(ctx, snapshot));
}

/** Notes a refresh attempt, successful or not. */
async function recordCheck(
  ctx: MutationCtx,
  times: { checkedAt: number; ratesCheckedAt?: number },
) {
  const check = await ctx.db.query("spotPriceChecks").unique();
  if (check) {
    await ctx.db.patch("spotPriceChecks", check._id, times);
  } else {
    await ctx.db.insert("spotPriceChecks", times);
  }
}

/**
 * The latest Spot prices and exchange rates, or null before the first refresh
 * with exchange rates. Every conversion uses these stored values: Metal values
 * (`spotPricePerGram`) and Home currency changes (`rate`, `convert`). Knowing
 * whether they're out of date (`stale`) means reading when a refresh was
 * last attempted, so every attempt re-runs a query that calls this.
 */
export async function latestRates(ctx: QueryCtx): Promise<MarketRates | null> {
  const snapshot = await latestSnapshot(ctx);
  return (
    snapshot &&
    marketRates({ ...snapshot, checkedAt: await lastCheckedAt(ctx, snapshot) })
  );
}

/** Spot prices and exchange rates as kept for one day; never stale. */
const ratesOfDay = (day: Doc<"spotPriceDays">) =>
  marketRates({
    quotedAt: day.quotedAt,
    ratesQuotedAt: day.quotedAt,
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
      // Months before the first kept day, back to the earliest purchase
      // date, need no read each.
      if (lastDay < earliest.day) return ratesOfDay(earliest);
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
 * troy ounce, with the time they were quoted. Null until the first refresh,
 * and without a set-up account: the sidebar asks on every signed-in screen,
 * so it never throws, not even while signing out or deleting the account.
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
    const user = await setUpUserOrNull(ctx);
    if (!user) return null;
    const currency = user.homeCurrency;
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
 * How long to wait after a MetalpriceAPI request before the next one, so its
 * plan's monthly quota lasts the month with a tenth to spare. Without a known
 * quota, every scheduled run asks.
 */
function waitBetweenRequests(requestsPerMonth: number | undefined) {
  if (!requestsPerMonth) return 0;
  return MONTH_MS / (requestsPerMonth * 0.9) - SCHEDULE_SLACK_MS;
}

/** When MetalpriceAPI was last asked, and the plan's quota it stated. */
export const lastRequest = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      ratesCheckedAt: v.number(),
      requestsPerMonth: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const snapshot = await latestSnapshot(ctx);
    if (!snapshot) return null;
    return {
      ratesCheckedAt: await lastRatesCheckedAt(ctx, snapshot),
      requestsPerMonth: snapshot.requestsPerMonth,
    };
  },
});

/** Whether MetalpriceAPI's quota allows asking it now. */
async function ratesDue(ctx: ActionCtx) {
  const last = await ctx.runQuery(internal.spotPrices.lastRequest, {});
  return (
    !last ||
    Date.now() - last.ratesCheckedAt >=
      waitBetweenRequests(last.requestsPerMonth)
  );
}

/**
 * Fetches the latest prices and stores them. Runs every 15 minutes (crons.ts)
 * and makes the same requests however many people use CoinsLite: gold and
 * silver from gold-api.com every run, and exchange rates from MetalpriceAPI
 * as often as its plan allows. Whatever a provider fails to bring, or isn't
 * asked for, stays as last stored.
 */
export const refresh = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const apiKey = env.METALPRICE_API_KEY;
    if (!apiKey) {
      console.warn(
        "Exchange rates not refreshed: METALPRICE_API_KEY isn't set. Keeping the last stored rates.",
      );
    }
    const ratesKey = apiKey && (await ratesDue(ctx)) ? apiKey : null;
    const [metals, rates] = await Promise.all([
      fetchMetals().catch((error: unknown) => {
        console.error(
          "Spot prices not refreshed from gold-api.com; keeping the last stored prices.",
          error,
        );
        return undefined;
      }),
      ratesKey
        ? fetchQuote(ratesKey).catch((error: unknown) => {
            console.error(
              "Exchange rates not refreshed from MetalpriceAPI; keeping the last stored rates.",
              error,
            );
            return undefined;
          })
        : undefined,
    ]);
    await ctx.runMutation(internal.spotPrices.record, {
      metals,
      rates,
      askedForRates: ratesKey !== null,
    });
    return null;
  },
});

/**
 * Notes a refresh attempt and stores what it brought (spotPrices/snapshot.ts),
 * and keeps the day's first good prices for good (spotPriceDays) for "Value
 * over time".
 */
export const record = internalMutation({
  args: {
    metals: v.optional(
      v.object({
        quotedAt: v.number(),
        perDollar: v.object({ XAU: v.number(), XAG: v.number() }),
      }),
    ),
    rates: v.optional(
      v.object({
        quotedAt: v.number(),
        perDollar,
        requestsPerMonth: v.optional(v.number()),
      }),
    ),
    askedForRates: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { metals, rates, askedForRates }) => {
    const now = Date.now();
    const latest = await latestSnapshot(ctx);
    // Until ratesCheckedAt is first written, its fallback (checkedAt) moves on
    // every run, so the fallback is written once.
    const ratesCheckedAt = askedForRates
      ? now
      : latest && (await lastRatesCheckedAt(ctx, latest));
    await recordCheck(ctx, {
      checkedAt: now,
      ...(ratesCheckedAt && { ratesCheckedAt }),
    });
    const snapshot = nextSnapshot(latest, { metals, rates }, now);
    if (!snapshot) return null;
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
        quotedAt: snapshot.quotedAt,
        perDollar: snapshot.perDollar,
      });
    }
    return null;
  },
});
