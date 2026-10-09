import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { env, internalMutation } from "../_generated/server";
import { normalizeEmail } from "../accounts/credentials";

export const testingErrors = {
  /** Asked of a deployment that sends real email, i.e. not a test backend. */
  testDeploymentsOnly: "TEST_DEPLOYMENTS_ONLY",
  userNotFound: "USER_NOT_FOUND",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Test backends only: makes the account with this email Premium for a month
 * without Polar, so the smoke tests can reach Premium features such as the
 * Insurance report. The subscription is recorded the way Polar's webhook
 * records one. Refused unless the deployment keeps emails in its outbox,
 * which only local and CI test backends do (scripts/setup-e2e-backend.sh):
 *   npx convex run testing/premium:grant '{"email":"you@example.com"}'
 */
export const grant = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    if (env.EMAIL_DELIVERY !== "outbox")
      throw new ConvexError(testingErrors.testDeploymentsOnly);
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizeEmail(email)))
      .first();
    if (!user) throw new ConvexError(testingErrors.userNotFound);
    const now = Date.now();
    await ctx.runMutation(internal.billing.recordSubscription, {
      polarId: `test_${user._id}`,
      polarCustomerId: `test_${user._id}`,
      productId: "test_premium_monthly",
      status: "active",
      interval: "month",
      currency: "EUR",
      amount: 349,
      currentPeriodEnd: now + 30 * DAY_MS,
      cancelAtPeriodEnd: false,
      modifiedAt: now,
      buyer: [user._id],
    });
    return null;
  },
});
