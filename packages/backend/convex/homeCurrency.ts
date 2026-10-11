import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, mutation, query } from "./_generated/server";
import { homeCurrencyErrors, homeCurrencyLimits } from "./homeCurrency/rules";
import {
  type ItemMoneyField,
  itemLimits,
  itemMoneyFields,
} from "./items/rules";
import { latestRates } from "./spotPrices";
import { requireSetUpUser } from "./utils/auth";
import { homeCurrency } from "./utils/validators";

/**
 * The person's Items and the Market value history with an amount, each as far
 * as one past the most a change converts: enough to tell whether the whole
 * Collection fits in one change.
 */
async function collectionOf(ctx: QueryCtx, ownerId: Id<"users">) {
  const items = await ctx.db
    .query("items")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
    .take(homeCurrencyLimits.items + 1);
  const history = (
    await ctx.db
      .query("marketValueHistory")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .take(homeCurrencyLimits.historyPoints + 1)
  ).filter((point) => point.marketValue !== undefined);
  return {
    items,
    history,
    tooLarge:
      items.length > homeCurrencyLimits.items ||
      history.length > homeCurrencyLimits.historyPoints,
  };
}

/** The money fields an Item has a value in. */
const amountsOn = (item: Doc<"items">) =>
  itemMoneyFields.filter((field) => item[field] !== undefined);

/**
 * What changing the Home currency to `homeCurrency` would do: how many stored
 * amounts (Purchase prices and Market values) on how many Items get converted,
 * and the stored exchange rate they'd be converted at. `rate` is null before
 * the first exchange rates are stored.
 */
export const preview = query({
  args: { homeCurrency },
  returns: v.object({
    from: homeCurrency,
    to: homeCurrency,
    amounts: v.number(),
    items: v.number(),
    tooLarge: v.boolean(),
    rate: v.union(
      v.null(),
      v.object({ value: v.number(), quotedAt: v.number(), stale: v.boolean() }),
    ),
  }),
  handler: async (ctx, { homeCurrency: to }) => {
    const owner = await requireSetUpUser(ctx);
    const from = owner.homeCurrency;
    const { items, tooLarge } = await collectionOf(ctx, owner._id);
    const rates = await latestRates(ctx);
    return {
      from,
      to,
      amounts: items.flatMap(amountsOn).length,
      items: items.filter((item) => amountsOn(item).length > 0).length,
      tooLarge,
      rate: rates && {
        value: rates.rate(from, to),
        quotedAt: rates.quotedAt,
        stale: rates.stale,
      },
    };
  },
});

/**
 * Changes the signed-in person's Home currency and converts every stored
 * amount into it at `rate`, the stored exchange rate the preview showed,
 * rounded to whole minor units: the Items' and their Market value history's.
 *
 * It all happens in this one transaction, so nobody ever sees a Collection
 * with some amounts in the old currency and some in the new: if any Item
 * can't be converted, or the database refuses the write, nothing changes.
 * That is why one change converts at most `homeCurrencyLimits.items` Items.
 */
export const change = mutation({
  args: {
    homeCurrency,
    /** The exchange rate the person confirmed; needed when there are amounts to convert. */
    rate: v.optional(v.number()),
  },
  returns: v.object({ converted: v.number() }),
  handler: async (ctx, { homeCurrency: to, rate }) => {
    const owner = await requireSetUpUser(ctx);
    const from = owner.homeCurrency;
    if (to === from) throw new ConvexError(homeCurrencyErrors.sameCurrency);
    const { items, history, tooLarge } = await collectionOf(ctx, owner._id);
    if (tooLarge) throw new ConvexError(homeCurrencyErrors.collectionTooLarge);
    const withAmounts = items.filter((item) => amountsOn(item).length > 0);
    let converted = 0;
    if (withAmounts.length > 0 || history.length > 0) {
      const rates = await latestRates(ctx);
      if (!rates) throw new ConvexError(homeCurrencyErrors.rateUnavailable);
      // Amounts are only ever converted at the rate the person saw and confirmed.
      if (rate !== rates.rate(from, to)) {
        throw new ConvexError(homeCurrencyErrors.rateChanged);
      }
      for (const item of withAmounts) {
        const amounts: Partial<Record<ItemMoneyField, number>> = {};
        for (const field of amountsOn(item)) {
          const amount = rates.convert(item[field] as number, from, to);
          if (amount > itemLimits.amount) {
            throw new ConvexError(homeCurrencyErrors.amountTooLarge);
          }
          amounts[field] = amount;
          converted += 1;
        }
        await ctx.db.patch("items", item._id, amounts);
      }
      // The Market value history is in the Home currency too.
      for (const point of history) {
        const marketValue = rates.convert(point.marketValue ?? 0, from, to);
        if (marketValue > itemLimits.amount) {
          throw new ConvexError(homeCurrencyErrors.amountTooLarge);
        }
        await ctx.db.patch(point._id, { marketValue });
      }
    }
    await ctx.db.patch("users", owner._id, { homeCurrency: to });
    return { converted };
  },
});
