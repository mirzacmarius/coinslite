import { v } from "convex/values";
import { query } from "./_generated/server";
import { metalValue } from "./items/preciousMetal";
import { itemResolver } from "./items/resolve";
import { latestRates } from "./spotPrices";
import { requireSetUpUser } from "./utils/auth";
import { homeCurrency } from "./utils/validators";

/**
 * One of the signed-in person's Items' Metal value, in their Home currency,
 * from the latest stored Spot prices. Null when the Item isn't theirs, lacks a
 * metal, weight or purity, or before the first Spot prices arrive. `stale`
 * says the Spot prices haven't been refreshed for a while.
 */
export const ofItem = query({
  args: { itemId: v.id("items") },
  returns: v.union(
    v.null(),
    v.object({
      amount: v.number(),
      currency: homeCurrency,
      quotedAt: v.number(),
      stale: v.boolean(),
    }),
  ),
  handler: async (ctx, { itemId }) => {
    const owner = await requireSetUpUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.ownerId !== owner._id) return null;
    const rates = await latestRates(ctx);
    if (!rates) return null;
    // A linked Item's metal, weight and purity may be its Catalog entry's.
    const resolved = await itemResolver(ctx).resolve(item);
    const amount = metalValue(resolved, rates, owner.homeCurrency);
    if (amount === undefined) return null;
    return {
      amount,
      currency: owner.homeCurrency,
      quotedAt: rates.quotedAt,
      stale: rates.stale,
    };
  },
});
