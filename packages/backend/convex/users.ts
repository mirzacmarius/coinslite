import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { polar } from "./subscriptions";

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
