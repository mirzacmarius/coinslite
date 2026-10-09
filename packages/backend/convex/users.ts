import { getAuthUserId, invalidateSessions } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";
import { deleteUserAndSignInMethods } from "./accounts/linking";
import { deleteSubscriptionsOf, stopBilling } from "./billing";
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
    return {
      ...user,
      name: user.displayName ?? user.name,
    };
  },
});

export const deleteUserAccount = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    await deleteSubscriptionsOf(ctx, userId);
    await deleteUserAndSignInMethods(ctx, userId);
  },
});

export const deleteCurrentUserAccount = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    // First, so a deleted account is never charged again.
    await stopBilling(ctx, userId);
    await invalidateSessions(ctx, { userId });
    await ctx.runMutation(internal.users.deleteUserAccount, {
      userId,
    });
  },
});
