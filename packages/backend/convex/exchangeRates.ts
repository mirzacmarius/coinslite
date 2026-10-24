import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  type QueryCtx,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { fetchRates } from "./exchangeRates/ecb";
import {
  type DayRates,
  RATES_FRESH_MS,
  exchangeRateErrors,
  isRateDay,
  ratesFinal,
} from "./exchangeRates/rules";
import { latestPurchaseDate } from "./items/rules";
import { requireSetUpUser } from "./utils/auth";
import { perEuro } from "./utils/validators";

/**
 * A purchase in another currency (spec §4) is converted at the European
 * Central Bank's reference rates of its day. The app asks for a day's rates
 * as the person types (`ofDay`), which fetches them from the ECB once and
 * keeps them (`exchangeRateDays`); saving the Item converts at the kept
 * rates, and is refused should they be newer than those the form showed,
 * so what's stored is what the form showed.
 */

const dayRates = v.object({ rateDay: v.string(), perEuro });

/** The rates kept for a day, as stored. */
export async function storedRates(
  ctx: QueryCtx,
  day: string,
): Promise<Doc<"exchangeRateDays"> | null> {
  return await ctx.db
    .query("exchangeRateDays")
    .withIndex("by_day", (q) => q.eq("day", day))
    .unique();
}

/** The rates kept for a day the signed-in person may ask for, or null; turns anyone else away. */
export const stored = internalQuery({
  args: { day: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      rateDay: v.string(),
      perEuro,
      fetchedAt: v.number(),
    }),
  ),
  handler: async (ctx, { day }) => {
    await requireSetUpUser(ctx);
    if (!isRateDay(day, latestPurchaseDate()))
      throw new ConvexError(exchangeRateErrors.invalidDay);
    const kept = await storedRates(ctx, day);
    return (
      kept && {
        rateDay: kept.rateDay,
        perEuro: kept.perEuro,
        fetchedAt: kept.fetchedAt,
      }
    );
  },
});

/** Keeps a day's rates as fetched, in place of any kept before. */
export const store = internalMutation({
  args: { day: v.string(), rates: dayRates },
  returns: v.null(),
  handler: async (ctx, { day, rates }) => {
    const kept = await storedRates(ctx, day);
    const row = { day, ...rates, fetchedAt: Date.now() };
    if (kept) await ctx.db.replace("exchangeRateDays", kept._id, row);
    else await ctx.db.insert("exchangeRateDays", row);
    return null;
  },
});

/**
 * The ECB's euro reference rates of a day ("YYYY-MM-DD", from 1999-01-04 to
 * the latest purchase date), for the signed-in person: those of the last
 * working day before it on days the ECB doesn't publish. Kept rates are
 * given as they are once final; the day's, until the ECB publishes them, are
 * asked for again after an hour. Null when the ECB has none for the day.
 * EXCHANGE_RATE_UNAVAILABLE when it can't be reached and none are kept.
 */
export const ofDay = action({
  args: { day: v.string() },
  returns: v.union(v.null(), dayRates),
  handler: async (ctx, { day }): Promise<DayRates | null> => {
    const kept = await ctx.runQuery(internal.exchangeRates.stored, { day });
    const keep = kept && { rateDay: kept.rateDay, perEuro: kept.perEuro };
    if (
      kept &&
      (ratesFinal({ day, ...kept }) ||
        Date.now() - kept.fetchedAt < RATES_FRESH_MS)
    )
      return keep;
    let fetched: DayRates | null;
    try {
      fetched = await fetchRates(day);
    } catch (error) {
      console.error(
        `Exchange rates for ${day} not fetched from the ECB`,
        error,
      );
      if (keep) return keep;
      throw new ConvexError(exchangeRateErrors.unavailable);
    }
    if (!fetched) return keep;
    await ctx.runMutation(internal.exchangeRates.store, {
      day,
      rates: fetched,
    });
    return fetched;
  },
});
