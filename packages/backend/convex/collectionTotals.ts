import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { resolveItems } from "./items/resolve";
import { collectionTotals } from "./items/totals";
import { latestRates } from "./spotPrices";
import { requireSetUpUser } from "./utils/auth";
import { homeCurrency } from "./utils/validators";

/**
 * Totals over the whole Collection (spec 7), read a page of Items at a time.
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
} as const;

/** Time zones run from 12 hours behind UTC to 14 ahead; allow 14 either way. */
const MAX_UTC_OFFSET_MINUTES = 14 * 60;

/**
 * The totals of one page of the signed-in person's Items, as the only entry
 * in `page`. `utcOffsetMinutes` is how far ahead of UTC the person's clock is,
 * for the months of Value by date added.
 */
export const page = query({
  args: {
    paginationOpts: paginationOptsValidator,
    utcOffsetMinutes: v.number(),
  },
  returns: paginationResultValidator(totals),
  handler: async (ctx, { paginationOpts, utcOffsetMinutes }) => {
    const owner = await requireSetUpUser(ctx);
    if (
      !Number.isInteger(utcOffsetMinutes) ||
      Math.abs(utcOffsetMinutes) > MAX_UTC_OFFSET_MINUTES
    ) {
      throw new ConvexError(collectionTotalsErrors.invalidUtcOffset);
    }
    const rates = await latestRates(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", owner._id))
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
