import {
  type PaginationOptions,
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { resolveItems } from "./items/resolve";
import { TOTALS_PAGE_SIZE, pageTotals, withMetalValues } from "./items/totals";
import { historyOf } from "./items/valueHistory";
import {
  VALUE_OVER_TIME_PAGE_SIZE,
  lastDayOf,
  seriesMonths,
  valueOverTime,
} from "./items/valueOverTime";
import { latestSnapshot, ratesForDays } from "./spotPrices";
import { spotPricesPerGram } from "./spotPrices/rates";
import { requireSetUpUser } from "./utils/auth";
import { capped } from "./utils/pagination";
import { homeCurrency, perDollar as perDollarTable } from "./utils/validators";

/**
 * Totals over the whole Collection (spec 7), read a page of Items at a time.
 * They describe what the person owns, so sold Items are left out unless
 * asked for: the sold view sums those instead, for its sale figures.
 *
 * Why pages: a Premium Collection can hold many thousands of Items, more than
 * one query may read. A stored running total would need every way of adding,
 * editing, deleting and converting Items to keep it in step. Instead each
 * page of Items is summed here with the pure `pageTotals`, and the app reads
 * page after page (up to TOTALS_PAGE_SIZE Items each) and adds them up with
 * `combineTotals`, showing what it has while the rest arrive. Every page
 * stays inside the read limits however large the Collection, stays live, and
 * a Free plan Collection (at most 50 Items) is one page.
 *
 * Why no Metal values in the pages: they move with every Spot price refresh.
 * Each page says how much of each metal its Items hold instead, and the app
 * works the Metal values out once, at the Spot prices from `perDollar`
 * (`withMetalValues`). A refresh then re-runs that one small query rather
 * than every page of every Collection on screen.
 */

const amounts = v.object({
  purchasePrice: v.number(),
  marketValue: v.number(),
});

const metalTotal = v.object({
  fineWeight: v.number(),
  value: v.union(v.number(), v.null()),
});

const fineWeightGroup = v.object({
  finePerPiece: v.number(),
  quantity: v.number(),
  items: v.number(),
});

/** What every page's totals hold, whether or not they have Metal values. */
const totalsFields = {
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
  addedByMonth: v.array(
    v.object({
      month: v.string(),
      purchasePrice: v.number(),
      marketValue: v.number(),
    }),
  ),
};

/** CollectionTotals in items/totals.ts. */
const totals = v.object({
  ...totalsFields,
  metals: v.object({ gold: metalTotal, silver: metalTotal }),
});

/** PageTotals in items/totals.ts. */
const unpricedTotals = v.object({
  ...totalsFields,
  fineWeights: v.object({
    gold: v.array(fineWeightGroup),
    silver: v.array(fineWeightGroup),
  }),
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
 * The most bytes of Items one page reads: a quarter of the 16 MiB a query may
 * read, leaving the rest for the Catalog entries they link to and, for "Value
 * over time", their history. Items with long notes make a page shorter
 * rather than the query fail.
 *
 * A page can't stop part way and still hand back a cursor (a query makes one
 * paginated read), so rather than watch what it has read as
 * collection/browse.ts does, each page is sized from the read limits with
 * room to spare (TOTALS_PAGE_SIZE, VALUE_OVER_TIME_PAGE_SIZE) and its Items'
 * bytes are capped.
 */
const PAGE_BYTES = 4 * 1024 * 1024;

/**
 * A page of the person's Items, up to TOTALS_PAGE_SIZE: the ones they own,
 * or with `status` "sold" the ones they sold.
 */
const itemsPage = (
  ctx: QueryCtx,
  ownerId: Id<"users">,
  status: "sold" | undefined,
  paginationOpts: PaginationOptions,
) =>
  ctx.db
    .query("items")
    .withIndex("by_ownerId_and_soldOn", (q) =>
      status === "sold"
        ? // Every sold-on date is a non-empty "YYYY-MM-DD".
          q
            .eq("ownerId", ownerId)
            .gt("soldOn", "")
        : q.eq("ownerId", ownerId).eq("soldOn", undefined),
    )
    .paginate(
      capped(paginationOpts, { numItems: TOTALS_PAGE_SIZE, bytes: PAGE_BYTES }),
    );

const pageArgs = {
  paginationOpts: paginationOptsValidator,
  utcOffsetMinutes: v.number(),
  status: v.optional(v.literal("sold")),
};

/** `unpricedPage`, which the legacy `page` prices. */
async function unpricedTotalsPage(
  ctx: QueryCtx,
  {
    paginationOpts,
    utcOffsetMinutes,
    status,
  }: {
    paginationOpts: PaginationOptions;
    utcOffsetMinutes: number;
    status?: "sold";
  },
) {
  const owner = await requireSetUpUser(ctx);
  requireUtcOffset(utcOffsetMinutes);
  const items = await itemsPage(ctx, owner._id, status, paginationOpts);
  // Linked Items' metal facts come from their Catalog entries.
  const sum = pageTotals(await resolveItems(ctx, items.page), {
    currency: owner.homeCurrency,
    utcOffsetMinutes,
  });
  return { ...items, page: [sum] };
}

/**
 * The totals of one page of the signed-in person's Items, before any Spot
 * price (PageTotals), as the only entry in `page`: the ones they own, or with
 * `status` "sold" the ones they sold. `utcOffsetMinutes` is how far ahead of
 * UTC the person's clock is, for the months of Value by date acquired. The
 * app adds the pages up and prices them (use-collection-totals.ts).
 */
export const unpricedPage = query({
  args: pageArgs,
  returns: paginationResultValidator(unpricedTotals),
  handler: unpricedTotalsPage,
});

/**
 * What the totals' Metal values are worked out at: the stored table of what
 * one US dollar buys, from which the app takes the Spot prices in the
 * totals' currency (`spotPricesPerGram`); null before the first successful
 * refresh. It reads only the stored prices, so only a successful refresh
 * re-runs it.
 */
export const perDollar = query({
  args: {},
  returns: v.union(v.null(), perDollarTable),
  handler: async (ctx) => {
    await requireSetUpUser(ctx);
    return (await latestSnapshot(ctx))?.perDollar ?? null;
  },
});

/**
 * `unpricedPage` with the Metal values worked out here, at the latest Spot
 * prices, so every successful refresh re-runs it. Kept for app tabs opened
 * before `unpricedPage` came; nothing calls it once those have reloaded.
 */
export const page = query({
  args: pageArgs,
  returns: paginationResultValidator(totals),
  handler: async (ctx, args) => {
    const unpriced = await unpricedTotalsPage(ctx, args);
    const snapshot = await latestSnapshot(ctx);
    return {
      ...unpriced,
      page: unpriced.page.map((sum) =>
        withMetalValues(
          sum,
          snapshot && spotPricesPerGram(snapshot.perDollar, sum.currency),
        ),
      ),
    };
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
 * sold, up to VALUE_OVER_TIME_PAGE_SIZE, as the only entry in `page`: each
 * month from when the page's earliest Item was acquired through
 * `throughMonth` (the person's current month, "YYYY-MM"), from their Market
 * value history and each month's Spot prices (items/valueOverTime.ts). Those
 * are the prices kept once a day (spotPriceDays), not the latest, so the
 * refreshes in between re-run no page. The app adds the pages up with
 * `combineValueOverTime`, as it does the totals.
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
      .paginate(
        capped(paginationOpts, {
          numItems: VALUE_OVER_TIME_PAGE_SIZE,
          bytes: PAGE_BYTES,
        }),
      );
    if (items.page.length === 0) return { ...items, page: [[]] };
    // Linked Items' metal facts come from their Catalog entries.
    const resolved = await resolveItems(ctx, items.page);
    const withHistory = await Promise.all(
      resolved.map(async (item) => ({
        ...item,
        history: await historyOf(ctx, item._id),
      })),
    );
    const months = seriesMonths(withHistory, throughMonth, utcOffsetMinutes);
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
