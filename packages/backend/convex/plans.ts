import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { premiumSubscriptionOf } from "./billing";
import { type Plan, freePlan, planErrors } from "./plans/rules";
import { requireSetUpUser, setUpUserOrNull } from "./utils/auth";

/**
 * The plan a person is on: Premium while a subscription makes them Premium
 * (the rule is in billing/rules.ts, applied as Polar reports changes and when
 * a paid period runs out), otherwise Free. Decided here and nowhere else.
 */
export async function planOf(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Plan> {
  return (await premiumSubscriptionOf(ctx, userId)) ? "premium" : "free";
}

/**
 * For Premium-only features (the Collection PDF and labels, the Insurance
 * report): the signed-in, set-up person if they're on Premium. Anyone else
 * is turned away: NOT_SIGNED_IN, NOT_SET_UP, or PREMIUM_REQUIRED for the
 * Free plan.
 */
export async function requirePremium(ctx: QueryCtx) {
  const user = await requireSetUpUser(ctx);
  if ((await planOf(ctx, user._id)) !== "premium") {
    throw new ConvexError(planErrors.premiumRequired);
  }
  return user;
}

/**
 * How many Items a person owns (sold ones don't count), counted only as far as one past the Free plan's
 * limit: enough to tell "under", "at" and "over" apart. A bounded read of their
 * own index range rather than a stored counter, so deleting Items (one, an
 * Album's, a whole account's) needs no bookkeeping, and two adds racing for the
 * last place conflict and are retried one after the other.
 */
async function countItemsUpToLimit(ctx: QueryCtx, userId: Id<"users">) {
  const items = await ctx.db
    .query("items")
    .withIndex("by_ownerId_and_soldOn", (q) =>
      q.eq("ownerId", userId).eq("soldOn", undefined),
    )
    .take(freePlan.itemLimit + 1);
  return items.length;
}

/**
 * How many more Items this person may add right now: 0 at or over the Free
 * plan's limit, Infinity on Premium. Every way of adding Items checks this,
 * including adding many at once from the Catalog.
 */
export async function itemsLeftToAdd(ctx: QueryCtx, userId: Id<"users">) {
  if ((await planOf(ctx, userId)) === "premium")
    return Number.POSITIVE_INFINITY;
  const used = await countItemsUpToLimit(ctx, userId);
  return Math.max(0, freePlan.itemLimit - used);
}

/** Turns the person away when `count` more Items wouldn't fit their plan. */
export async function requireRoomForItems(
  ctx: QueryCtx,
  userId: Id<"users">,
  count = 1,
) {
  if ((await itemsLeftToAdd(ctx, userId)) < count) {
    throw new ConvexError(planErrors.itemLimitReached);
  }
}

/**
 * The person's plan and, on the Free plan, how much of it they use: Items
 * against the limit (`used` stops at one past it), whether to warn (from 40)
 * and whether they can still add. Null for someone signed out or not set up:
 * the sidebar asks on every signed-in screen, including the moment of signing
 * out, so it mustn't throw.
 */
export const usage = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      plan: v.literal("free"),
      used: v.number(),
      limit: v.number(),
      warning: v.boolean(),
      canAdd: v.boolean(),
    }),
    v.object({ plan: v.literal("premium") }),
  ),
  handler: async (ctx) => {
    const user = await setUpUserOrNull(ctx);
    if (!user) return null;
    if ((await planOf(ctx, user._id)) === "premium") {
      return { plan: "premium" as const };
    }
    const used = await countItemsUpToLimit(ctx, user._id);
    return {
      plan: "free" as const,
      used,
      limit: freePlan.itemLimit,
      warning: used >= freePlan.warnFrom,
      canAdd: used < freePlan.itemLimit,
    };
  },
});
