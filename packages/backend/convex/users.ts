import { getAuthUserId, invalidateSessions } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { deleteUserAndSignInMethods } from "./accounts/linking";
import { polar } from "./subscriptions";
import { requireUserId } from "./utils/auth";

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return;
    }
    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });
    return {
      ...user,
      name: user.displayName ?? user.name,
      subscription,
    };
  },
});

export const deleteUserAccount = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    await deleteUserAndSignInMethods(ctx, userId);
  },
});

export const deleteCurrentUserAccount = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await invalidateSessions(ctx, { userId });
    // The alpha Polar component predates Convex 1.46's action context type.
    // Runtime is compatible; drop this when billing moves to @convex-dev/polar.
    const polarCtx = ctx as unknown as Parameters<
      typeof polar.cancelSubscription
    >[0];
    const subscription = await polar.getCurrentSubscription(polarCtx, {
      userId,
    });
    if (!subscription) {
      console.error("No subscription found");
    } else {
      await polar.cancelSubscription(polarCtx, {
        revokeImmediately: true,
      });
    }
    await ctx.runMutation(internal.users.deleteUserAccount, {
      userId,
    });
  },
});
