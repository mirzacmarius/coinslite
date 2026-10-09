import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
  action,
  env,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { isPolarSandbox, polarApi, premiumProducts } from "./billing/polar";
import {
  type SubscriptionState,
  billingErrors,
  chargesAgain,
  isBillingInterval,
  isPremiumAt,
  premiumCurrencyFor,
  premiumPrices,
  premiumUntil,
} from "./billing/rules";
import { requireSetUpUser } from "./utils/auth";

/**
 * Premium billing through Polar: checkout, the subscription state Polar's
 * webhook keeps (billing/webhook.ts), and the Premium page's view of it.
 * Whether someone is Premium is read by `planOf` in plans.ts.
 */

/** The subscription that makes this person Premium right now, if any. */
export async function premiumSubscriptionOf(
  ctx: QueryCtx,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("subscriptions")
    .withIndex("by_userId_and_premium", (q) =>
      q.eq("userId", userId).eq("premium", true),
    )
    .first();
}

/** Whether this deployment can sell Premium: Polar, both products, and a page to return to. */
const canSellPremium = () =>
  Boolean(polarApi() && premiumProducts() && env.SITE_URL);

const premiumCurrency = v.union(
  v.literal("NOK"),
  v.literal("EUR"),
  v.literal("USD"),
  v.literal("RON"),
);

/**
 * The Premium page: the person's plan, Premium's prices in the currency they
 * would pay (`country` is where the request comes from, when the host knows
 * it), whether checkout works on this deployment and whether it's Polar's
 * sandbox. A Premium member also gets their subscription: interval, price,
 * and the end of the current period, which renews unless `cancelAtPeriodEnd`.
 * Null for someone signed out or not set up.
 */
export const status = query({
  args: { country: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      plan: v.union(v.literal("free"), v.literal("premium")),
      prices: v.object({
        currency: premiumCurrency,
        month: v.number(),
        year: v.number(),
      }),
      checkoutAvailable: v.boolean(),
      testMode: v.boolean(),
      subscription: v.union(
        v.null(),
        v.object({
          interval: v.union(v.literal("month"), v.literal("year"), v.null()),
          currency: v.string(),
          amount: v.number(),
          currentPeriodEnd: v.union(v.number(), v.null()),
          cancelAtPeriodEnd: v.boolean(),
        }),
      ),
    }),
  ),
  handler: async (ctx, { country }) => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user?.termsAcceptedAt || !user.homeCurrency) return null;
    const currency = premiumCurrencyFor({
      country,
      homeCurrency: user.homeCurrency,
    });
    const subscription = await premiumSubscriptionOf(ctx, user._id);
    return {
      plan: subscription ? ("premium" as const) : ("free" as const),
      prices: { currency, ...premiumPrices[currency] },
      checkoutAvailable: canSellPremium(),
      testMode: isPolarSandbox(),
      subscription: subscription && {
        interval: isBillingInterval(subscription.interval)
          ? subscription.interval
          : null,
        currency: subscription.currency,
        amount: subscription.amount,
        currentPeriodEnd: subscription.currentPeriodEnd ?? null,
        cancelAtPeriodEnd:
          subscription.cancelAtPeriodEnd || subscription.status === "canceled",
      },
    };
  },
});

/**
 * Opens a Polar checkout for Premium, monthly or yearly, and returns the page
 * to send the buyer to. Polar charges in the currency of the buyer's location,
 * read from the IP their request came from. After paying they come back to
 * the confirmation page; Premium starts when Polar's webhook confirms.
 */
export const checkout = action({
  args: { interval: v.union(v.literal("month"), v.literal("year")) },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, { interval }) => {
    const buyer = await ctx.runQuery(internal.billing.buyer, {});
    if (buyer.premium) throw new ConvexError(billingErrors.alreadyPremium);
    const polar = polarApi();
    const products = premiumProducts();
    const siteUrl = env.SITE_URL;
    if (!polar || !products || !siteUrl) {
      throw new ConvexError(billingErrors.unavailable);
    }
    const { ip } = await ctx.meta.getRequestMetadata();
    try {
      const url = await polar.createCheckout({
        productId: products[interval],
        userId: buyer.userId,
        email: buyer.email,
        customerIp: ip ?? undefined,
        successUrl: `${siteUrl}/settings/billing/confirmation?checkout_id={CHECKOUT_ID}`,
        returnUrl: `${siteUrl}/settings/billing`,
      });
      return { url };
    } catch (error) {
      console.error("Polar didn't open a checkout", error);
      throw new ConvexError(billingErrors.checkoutFailed);
    }
  },
});

/** Who is buying: the signed-in, set-up person, and whether they're Premium already. */
export const buyer = internalQuery({
  args: {},
  returns: v.object({
    userId: v.id("users"),
    email: v.optional(v.string()),
    premium: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await requireSetUpUser(ctx);
    return {
      userId: user._id,
      email: user.email,
      premium: (await premiumSubscriptionOf(ctx, user._id)) !== null,
    };
  },
});

/**
 * Keeps a subscription's state as Polar reports it. Events can arrive late or
 * twice: one older than what's stored is ignored. A subscription stays with
 * the person it was first recorded for; a new one is matched to its buyer
 * through the ids checkout gave Polar, and one naming nobody is ignored.
 */
export const recordSubscription = internalMutation({
  args: {
    polarId: v.string(),
    polarCustomerId: v.string(),
    productId: v.string(),
    status: v.string(),
    interval: v.string(),
    currency: v.string(),
    amount: v.number(),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    endedAt: v.optional(v.number()),
    modifiedAt: v.number(),
    buyer: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { buyer, ...reported }) => {
    const stored = await ctx.db
      .query("subscriptions")
      .withIndex("by_polarId", (q) => q.eq("polarId", reported.polarId))
      .unique();
    if (stored && stored.modifiedAt > reported.modifiedAt) return null;
    const userId = stored?.userId ?? (await buyerOf(ctx, buyer));
    if (!userId) {
      console.warn(
        `Polar subscription ${reported.polarId} names no CoinsLite account; ignored`,
      );
      return null;
    }
    const subscription = { ...reported, userId, ...premiumState(reported) };
    if (stored) {
      await cancelPremiumCheck(ctx, stored.premiumCheck);
      await ctx.db.replace(stored._id, subscription);
    }
    const subscriptionId =
      stored?._id ?? (await ctx.db.insert("subscriptions", subscription));
    await bookPremiumCheck(ctx, subscriptionId, subscription.premiumUntil);
    return null;
  },
});

/** The Premium status rule (billing/rules.ts) applied as of now. */
function premiumState(subscription: SubscriptionState) {
  const until = premiumUntil(subscription);
  const premium = isPremiumAt(until, Date.now());
  return {
    premium,
    premiumUntil: premium && typeof until === "number" ? until : undefined,
  };
}

/** Cancels a booked Premium check that hasn't run yet. */
async function cancelPremiumCheck(
  ctx: MutationCtx,
  check: Id<"_scheduled_functions"> | undefined,
) {
  const job = check && (await ctx.db.system.get(check));
  if (job?.state.kind === "pending") await ctx.scheduler.cancel(job._id);
}

/** Books the check that ends Premium at `premiumUntil`; none when there's no end. */
async function bookPremiumCheck(
  ctx: MutationCtx,
  subscriptionId: Id<"subscriptions">,
  premiumUntil: number | undefined,
) {
  await ctx.db.patch(subscriptionId, {
    premiumCheck:
      premiumUntil === undefined
        ? undefined
        : await ctx.scheduler.runAt(
            premiumUntil,
            internal.billing.endPremiumIfDue,
            { subscriptionId },
          ),
  });
}

/** The first of `ids` that is an existing CoinsLite user. */
async function buyerOf(ctx: MutationCtx, ids: string[]) {
  for (const id of ids) {
    const userId = ctx.db.normalizeId("users", id);
    if (userId && (await ctx.db.get(userId))) return userId;
  }
  return null;
}

/**
 * Runs when a subscription's paid period (and any renewal grace) is over:
 * unless Polar has reported a renewal since, the person is no longer Premium.
 * Run early, it books itself again for the end.
 */
export const endPremiumIfDue = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  returns: v.null(),
  handler: async (ctx, { subscriptionId }) => {
    const subscription = await ctx.db.get(subscriptionId);
    if (!subscription) return null;
    const state = premiumState(subscription);
    await ctx.db.patch(subscriptionId, state);
    await bookPremiumCheck(ctx, subscriptionId, state.premiumUntil);
    return null;
  },
});

/** Every subscription record a person has; a handful at most. */
const subscriptionsOf = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("subscriptions")
    .withIndex("by_userId_and_premium", (q) => q.eq("userId", userId))
    .take(100);

/** The Polar ids of a person's subscriptions that would charge again. */
export const subscriptionsThatCharge = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(v.string()),
  handler: async (ctx, { userId }) =>
    (await subscriptionsOf(ctx, userId))
      .filter(chargesAgain)
      .map((subscription) => subscription.polarId),
});

/**
 * Before an account is deleted: revokes at Polar every subscription that
 * would charge again. Throws when that isn't possible, so no account is
 * deleted while it's still being billed.
 */
export async function stopBilling(ctx: ActionCtx, userId: Id<"users">) {
  const charging = await ctx.runQuery(
    internal.billing.subscriptionsThatCharge,
    {
      userId,
    },
  );
  if (charging.length === 0) return;
  const polar = polarApi();
  if (!polar) {
    throw new Error(
      "Polar isn't configured, so the subscription can't be ended",
    );
  }
  for (const polarId of charging) await polar.revokeSubscription(polarId);
}

/** Deletes a person's subscription records: their link to Polar. */
export async function deleteSubscriptionsOf(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  for (const subscription of await subscriptionsOf(ctx, userId)) {
    await cancelPremiumCheck(ctx, subscription.premiumCheck);
    await ctx.db.delete(subscription._id);
  }
}
