import { getAuthUserId } from "@convex-dev/auth/server";
import { asyncMap } from "convex-helpers";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { polar } from "./subscriptions";
import { requireUserId } from "./utils/auth";
import { username } from "./utils/validators";

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
      name: user.displayName ?? user.username ?? user.name,
      subscription,
      avatarUrl: user.imageId
        ? await ctx.storage.getUrl(user.imageId)
        : undefined,
    };
  },
});

export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const validatedUsername = username.safeParse(args.username);

    if (!validatedUsername.success) {
      throw new Error(validatedUsername.error.message);
    }
    await ctx.db.patch(userId, { username: validatedUsername.data });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateUserImage = mutation({
  args: {
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, { imageId: args.imageId });
  },
});

export const removeUserImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, { imageId: undefined, image: undefined });
  },
});

export const deleteUserAccount = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await asyncMap(
      ["google" /* add other providers as needed */],
      async (provider) => {
        const authAccount = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) =>
            q.eq("userId", args.userId).eq("provider", provider),
          )
          .unique();
        if (!authAccount) {
          return;
        }
        await ctx.db.delete(authAccount._id);
      },
    );
    await ctx.db.delete(args.userId);
  },
});

export const deleteCurrentUserAccount = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
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
