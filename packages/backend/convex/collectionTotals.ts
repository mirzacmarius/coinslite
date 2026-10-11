import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { resolveItems } from "./items/resolve";
import { collectionTotals } from "./items/totals";
import { historyOf } from "./items/valueHistory";
import {
  VALUE_OVER_TIME_PAGE_SIZE,
  lastDayOf,
  monthOf,
  monthsBetween,
  startOf,
  valueOverTime,
} from "./items/valueOverTime";
import { latestRates, ratesForDays } from "./spotPrices";
import { requireSetUpUser } from "./utils/auth";
import { homeCurrency } from "./utils/validators";

/**
 * Totals over the whole Collection (spec 7), read a page of Items at a time.
 * They describe what the person owns, so sold Items are left out unless
 * asked for: the sold view sums those instead, for its sale figures.
 *
 * Why pages: a Premium Collection can hold many thousands of Items, more than
 * one query may read. A stored running total would need every way of adding,
 * editing, deleting and converting Items to keep it in step, and Metal values
 * move with every Spot price refresh anyway. Instead each page of Items is
 * summed here with the pure `collectionTotals`, and the app reads page after
 * page (TOTALS_PAGE_SIZE Items each) and adds them up with `combineTotals`.
 * Every page stays well inside the read limits however large the Collection,
 * stays live, and a Free plan Collection (at most 50 Items) is one page.
 */

const amounts = v.object({
  purchasePrice: v.number(),
  marketValue: v.number(),
});

const metalTotal = v.object({
  fineWeight: v.number(),
  value: v.union(v.number(), v.null()),
});

const totals = v.object({
  currency: homeCurrency,
  items: v.number(),
  pieces: v.object({
    coin: v.number(),
    banknote: v.number(),
    stamp: v.number(),
  }),
  purchasePrice: v.number(),
  marketValue: v.number(),
  gainLoss: v.object({ amount: v.number(), items: v.number() }),
  salePrice: v.number(),
  realised: v.object({ amount: v.number(), items: v.number() }),
  byType: v.object({ coin: amounts, banknote: amounts, stamp: amounts }),
  metals: v.object({ gold: metalTotal, silver: metalTotal }),
  addedByMonth: v.array(
    v.object({
      month: v.string(),
      purchasePrice: v.number(),
      marketValue: v.number(),
    }),
  ),
});

export const collectionTotalsErrors = {
  invalidUtcOffset: "INVALID_UTC_OFFSET",
  invalidMonth: "INVALID_MONTH",
} as const;

/** Time zones run from 12 hours behind UTC to 14 ahead; allow 14 either way. */
const MAX_UTC_OFFSET_MINUTES = 14 * 60;

function requireUtcOffset(utcOffsetMinutes: number) {
  if (
    !Number.isInteger(utcOffsetMinutes) ||
    Math.abs(utcOffsetMinutes) > MAX_UTC_OFFSET_MINUTES
  ) {
    throw new ConvexError(collectionTotalsErrors.invalidUtcOffset);
  }
}

/**
 * The totals of one page of the signed-in person's Items, as the only entry
 * in `page`: the ones they own, or with `status` "sold" the ones they sold.
 * `utcOffsetMinutes` is how far ahead of UTC the person's clock is, for the
 * months of Value by date added.
 */
export const page = query({
  args: {
    paginationOpts: paginationOptsValidator,
    utcOffsetMinutes: v.number(),
    status: v.optional(v.literal("sold")),
  },
  returns: paginationResultValidator(totals),
  handler: async (ctx, { paginationOpts, utcOffsetMinutes, status }) => {
    const owner = await requireSetUpUser(ctx);
    requireUtcOffset(utcOffsetMinutes);
    const rates = await latestRates(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId_and_soldOn", (q) =>
        status === "sold"
          ? // Every sold-on date is a non-empty "YYYY-MM-DD".
            q
              .eq("ownerId", owner._id)
              .gt("soldOn", "")
          : q.eq("ownerId", owner._id).eq("soldOn", undefined),
      )
      .paginate(paginationOpts);
    // Linked Items' metal facts come from their Catalog entries.
    const pageTotals = collectionTotals(await resolveItems(ctx, items.page), {
      currency: owner.homeCurrency,
      rates,
      utcOffsetMinutes,
    });
    return { ...items, page: [pageTotals] };
  },
});

const monthValue = v.object({
  month: v.string(),
  purchasePrice: v.number(),
  marketValue: v.number(),
  metalValue: v.union(v.number(), v.null()),
});

/**
 * "Value over time" for one page of the signed-in person's Items, owned and
 * sold, as the only entry in `page`: each month from the page's first Item
 * through `throughMonth` (the person's current month, "YYYY-MM"), from their
 * Market value history and each month's Spot prices (items/valueOverTime.ts).
 * The app adds the pages up with `combineValueOverTime`, as it does the
 * totals.
 */
export const valueOverTimePage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    utcOffsetMinutes: v.number(),
    throughMonth: v.string(),
  },
  returns: paginationResultValidator(v.array(monthValue)),
  handler: async (ctx, { paginationOpts, utcOffsetMinutes, throughMonth }) => {
    const owner = await requireSetUpUser(ctx);
    requireUtcOffset(utcOffsetMinutes);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(throughMonth))
      throw new ConvexError(collectionTotalsErrors.invalidMonth);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, VALUE_OVER_TIME_PAGE_SIZE),
      });
    if (items.page.length === 0) return { ...items, page: [[]] };
    // Linked Items' metal facts come from their Catalog entries.
    const resolved = await resolveItems(ctx, items.page);
    const withHistory = await Promise.all(
      resolved.map(async (item) => ({
        ...item,
        history: await historyOf(ctx, item._id),
      })),
    );
    const firstMonth = withHistory
      .map((item) => monthOf(startOf(item), utcOffsetMinutes))
      .reduce((a, b) => (a < b ? a : b));
    const months =
      firstMonth <= throughMonth ? monthsBetween(firstMonth, throughMonth) : [];
    const rates = await ratesForDays(ctx, months.map(lastDayOf));
    const series = valueOverTime(withHistory, {
      months,
      currency: owner.homeCurrency,
      utcOffsetMinutes,
      ratesFor: (month) => rates[months.indexOf(month)] ?? null,
    });
    return { ...items, page: [series] };
  },
});
