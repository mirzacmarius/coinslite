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
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import {
  isPolarSandbox,
  isPremiumProduct,
  polarApi,
  premiumProducts,
} from "./billing/polar";
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
 * sandbox, and whether Polar's customer portal can be opened on it. A
 * Premium member also gets their subscription: interval, price, and the end
 * of the current period, which renews unless `cancelAtPeriodEnd`.
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
      portalAvailable: v.boolean(),
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
      portalAvailable: polarApi() !== null,
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

const billingInterval = v.union(v.literal("month"), v.literal("year"));

/** How long a checkout being opened holds the place of the person's one checkout. */
const checkoutOpeningMs = 2 * 60 * 1000;
/** How long an open checkout stays the person's one checkout when Polar doesn't say. */
const checkoutLifetimeMs = 60 * 60 * 1000;

/**
 * Opens a Polar checkout for Premium, monthly or yearly, and returns the page
 * to send the buyer to. Polar charges in the currency of the buyer's location,
 * read from the IP their request came from. After paying they come back to
 * the confirmation page; Premium starts when Polar's webhook confirms.
 *
 * A person has one checkout open at a time, so they can't pay twice: asking
 * again for the same plan returns the one that's open, and one for the other
 * plan is refused (CHECKOUT_PENDING) until it expires.
 */
export const checkout = action({
  args: { interval: billingInterval },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, { interval }): Promise<{ url: string }> => {
    const reserved: Reservation = await ctx.runMutation(
      internal.billing.reserveCheckout,
      { interval },
    );
    if (reserved.kind === "open") return { url: reserved.url };
    const polar = polarApi();
    const products = premiumProducts();
    const siteUrl = env.SITE_URL;
    if (!polar || !products || !siteUrl) {
      throw new ConvexError(billingErrors.unavailable);
    }
    const { ip } = await ctx.meta.getRequestMetadata();
    try {
      const { url, expiresAt } = await polar.createCheckout({
        productId: products[interval],
        userId: reserved.userId,
        email: reserved.email,
        customerIp: ip ?? undefined,
        successUrl: `${siteUrl}/settings/billing/confirmation?checkout_id={CHECKOUT_ID}`,
        returnUrl: `${siteUrl}/settings/billing`,
      });
      await ctx.runMutation(internal.billing.checkoutOpened, {
        checkoutId: reserved.checkoutId,
        url,
        expiresAt: expiresAt ?? Date.now() + checkoutLifetimeMs,
      });
      return { url };
    } catch (error) {
      console.error("Polar didn't open a checkout", error);
      await ctx.runMutation(internal.billing.releaseCheckout, {
        checkoutId: reserved.checkoutId,
      });
      throw new ConvexError(billingErrors.checkoutFailed);
    }
  },
});

type Reservation =
  | { kind: "open"; url: string }
  | {
      kind: "new";
      checkoutId: Id<"pendingCheckouts">;
      userId: Id<"users">;
      email?: string;
    };

/**
 * Holds the signed-in, set-up person's one checkout for `interval`, or
 * returns the one they have open. Refuses someone on Premium, an account
 * being deleted, a deployment that can't sell Premium, and a checkout while
 * another (for the other plan, or still opening) is open.
 */
export const reserveCheckout = internalMutation({
  args: { interval: billingInterval },
  returns: v.union(
    v.object({ kind: v.literal("open"), url: v.string() }),
    v.object({
      kind: v.literal("new"),
      checkoutId: v.id("pendingCheckouts"),
      userId: v.id("users"),
      email: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { interval }) => {
    const user = await requireSetUpUser(ctx);
    if (await premiumSubscriptionOf(ctx, user._id))
      throw new ConvexError(billingErrors.alreadyPremium);
    if (await isClosing(ctx, user._id))
      throw new ConvexError(billingErrors.accountClosing);
    if (!canSellPremium()) throw new ConvexError(billingErrors.unavailable);
    const now = Date.now();
    const pending = await pendingCheckoutOf(ctx, user._id);
    if (pending && pending.expiresAt > now) {
      if (pending.interval === interval && pending.url)
        return { kind: "open" as const, url: pending.url };
      throw new ConvexError(billingErrors.checkoutPending);
    }
    if (pending) await ctx.db.delete(pending._id);
    const checkoutId = await ctx.db.insert("pendingCheckouts", {
      userId: user._id,
      interval,
      expiresAt: now + checkoutOpeningMs,
    });
    return {
      kind: "new" as const,
      checkoutId,
      userId: user._id,
      email: user.email,
    };
  },
});

/** Keeps the checkout Polar opened as the person's one open checkout. */
export const checkoutOpened = internalMutation({
  args: {
    checkoutId: v.id("pendingCheckouts"),
    url: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { checkoutId, url, expiresAt }) => {
    if (await ctx.db.get(checkoutId))
      await ctx.db.patch(checkoutId, { url, expiresAt });
    return null;
  },
});

/** Lets go of a checkout Polar didn't open, so the next try isn't held up. */
export const releaseCheckout = internalMutation({
  args: { checkoutId: v.id("pendingCheckouts") },
  returns: v.null(),
  handler: async (ctx, { checkoutId }) => {
    if (await ctx.db.get(checkoutId)) await ctx.db.delete(checkoutId);
    return null;
  },
});

const pendingCheckoutOf = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("pendingCheckouts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

/** Deletes a person's open checkout, if any. */
export async function deletePendingCheckoutOf(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const pending = await pendingCheckoutOf(ctx, userId);
  if (pending) await ctx.db.delete(pending._id);
}

const closureOf = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("accountClosures")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

/** Whether this account is being deleted. */
async function isClosing(ctx: QueryCtx, userId: Id<"users">) {
  const closure = await closureOf(ctx, userId);
  return closure !== null && closure.closedAt === undefined;
}

/**
 * Opens Polar's customer portal, where a member switches between monthly and
 * yearly, updates their card or cancels, and returns the page to send them
 * to. Only ever for the signed-in person's own Polar customer, looked up here
 * from their subscription. The portal leads back to Plans.
 */
export const customerPortal = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx) => {
    const customerId = await ctx.runQuery(internal.billing.customer, {});
    if (!customerId) throw new ConvexError(billingErrors.noSubscription);
    const polar = polarApi();
    if (!polar) throw new ConvexError(billingErrors.unavailable);
    try {
      const url = await polar.createCustomerPortal({
        customerId,
        returnUrl: env.SITE_URL
          ? `${env.SITE_URL}/settings/billing`
          : undefined,
      });
      return { url };
    } catch (error) {
      console.error("Polar didn't open the customer portal", error);
      throw new ConvexError(billingErrors.portalFailed);
    }
  },
});

/**
 * The Polar customer behind the signed-in, set-up person's Premium
 * subscription; null when they aren't on Premium.
 */
export const customer = internalQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const user = await requireSetUpUser(ctx);
    const subscription = await premiumSubscriptionOf(ctx, user._id);
    return subscription?.polarCustomerId ?? null;
  },
});

/**
 * Keeps a subscription's state as Polar reports it. Events can arrive late or
 * twice: one older than what's stored is ignored. A subscription stays with
 * the person it was first recorded for; a new one is matched to its buyer
 * through the ids checkout gave Polar, and one naming nobody is ignored. One
 * that names a deleted account (paid in a checkout left open, or reported
 * late) is ended at Polar if it would charge again.
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
      if ((await closedAccountAmong(ctx, buyer)) && chargesAgain(reported)) {
        await scheduleRevoke(ctx, reported.polarId);
        return null;
      }
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
    if (subscription.premium) await deletePendingCheckoutOf(ctx, userId);
    await updatePlanCopies(ctx, userId);
    return null;
  },
});

/** Whether any of `ids` is a deleted CoinsLite account. */
async function closedAccountAmong(ctx: QueryCtx, ids: string[]) {
  for (const id of ids) {
    const userId = ctx.db.normalizeId("users", id);
    const closure = userId && (await closureOf(ctx, userId));
    if (closure) return true;
  }
  return false;
}

/** Ends a subscription at Polar in the background, trying again a few times. */
export async function scheduleRevoke(ctx: MutationCtx, polarId: string) {
  await ctx.scheduler.runAfter(0, internal.billing.revokeAtPolar, {
    polarId,
    attempt: 0,
  });
}

const revokeAttempts = 6;

/**
 * Ends at Polar a subscription of a deleted account. Polar being out of
 * reach is retried, waiting longer each time.
 */
export const revokeAtPolar = internalAction({
  args: { polarId: v.string(), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { polarId, attempt }) => {
    const polar = polarApi();
    if (!polar) {
      console.error(
        `Polar isn't configured, so subscription ${polarId} of a deleted account can't be ended`,
      );
      return null;
    }
    try {
      await polar.revokeSubscription(polarId);
    } catch (error) {
      if (attempt + 1 >= revokeAttempts) {
        console.error(
          `Polar didn't end subscription ${polarId} of a deleted account`,
          error,
        );
        return null;
      }
      await ctx.scheduler.runAfter(
        60_000 * 2 ** attempt,
        internal.billing.revokeAtPolar,
        { polarId, attempt: attempt + 1 },
      );
    }
    return null;
  },
});

/**
 * The Premium status rule (billing/rules.ts) applied as of now. Only the
 * Premium products count.
 */
function premiumState(subscription: SubscriptionState & { productId: string }) {
  if (!isPremiumProduct(subscription.productId))
    return { premium: false, premiumUntil: undefined };
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
 * Runs when a subscription's paid period is over:
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
    await updatePlanCopies(ctx, subscription.userId);
    return null;
  },
});

/**
 * The person's plan as the admin user list sorts and filters by it
 * (admin/users.ts): "premium" while a subscription makes them Premium, with
 * the end of its paid period if it has one; nothing on the Free plan.
 */
export async function planCopiesOf(ctx: QueryCtx, userId: Id<"users">) {
  const subscription = await premiumSubscriptionOf(ctx, userId);
  return {
    plan: subscription ? ("premium" as const) : undefined,
    planEnd: subscription?.currentPeriodEnd,
  };
}

/**
 * Brings the copies of a person's plan up to date: on their profile and on
 * their Collection counts, where the admin user list finds them. Runs after
 * every change to whether, or until when, a subscription makes them Premium.
 */
export async function updatePlanCopies(ctx: MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) return;
  const { plan, planEnd } = await planCopiesOf(ctx, userId);
  if (user.plan !== plan || user.planEnd !== planEnd) {
    await ctx.db.patch(userId, { plan, planEnd });
  }
  const counts = await ctx.db
    .query("collectionCounts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (counts && counts.plan !== plan) await ctx.db.patch(counts._id, { plan });
}

/** Every subscription record a person has; a handful at most. */
const subscriptionsOf = (ctx: QueryCtx, userId: Id<"users">) =>
  ctx.db
    .query("subscriptions")
    .withIndex("by_userId_and_premium", (q) => q.eq("userId", userId))
    .take(100);

/** The Polar ids of the subscriptions recorded for a person that would charge again. */
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
 * would charge again, both those recorded here and those Polar has for the
 * person whose events haven't arrived yet. Throws when that isn't possible,
 * so no account is deleted while it's still being billed.
 */
export async function stopBilling(ctx: ActionCtx, userId: Id<"users">) {
  const recorded = await ctx.runQuery(
    internal.billing.subscriptionsThatCharge,
    { userId },
  );
  const polar = polarApi();
  if (!polar) {
    if (recorded.length === 0) return;
    throw new Error(
      "Polar isn't configured, so the subscription can't be ended",
    );
  }
  const atPolar = await polar.subscriptionsThatCharge(userId);
  for (const polarId of new Set([...recorded, ...atPolar]))
    await polar.revokeSubscription(polarId);
}

/**
 * Deletes a person's subscription records, their link to Polar, and their
 * open checkout. One that would still charge again (reported after billing
 * stopped) is ended at Polar in the background.
 */
export async function deleteSubscriptionsOf(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  for (const subscription of await subscriptionsOf(ctx, userId)) {
    await cancelPremiumCheck(ctx, subscription.premiumCheck);
    if (chargesAgain(subscription))
      await scheduleRevoke(ctx, subscription.polarId);
    await ctx.db.delete(subscription._id);
  }
  await deletePendingCheckoutOf(ctx, userId);
}

/**
 * Marks an account as being deleted, so no checkout opens meanwhile. Returns
 * false when it was already being deleted.
 */
export async function beginClosing(ctx: MutationCtx, userId: Id<"users">) {
  if (await closureOf(ctx, userId)) return false;
  await ctx.db.insert("accountClosures", { userId });
  return true;
}

/** Undoes `beginClosing` when the deletion didn't go ahead. */
export async function cancelClosing(ctx: MutationCtx, userId: Id<"users">) {
  const closure = await closureOf(ctx, userId);
  if (closure && closure.closedAt === undefined)
    await ctx.db.delete(closure._id);
}

/** Records that the account is deleted, for Polar's events still to come. */
export async function markClosed(ctx: MutationCtx, userId: Id<"users">) {
  const closure = await closureOf(ctx, userId);
  if (closure) await ctx.db.patch(closure._id, { closedAt: Date.now() });
  else await ctx.db.insert("accountClosures", { userId, closedAt: Date.now() });
}
