import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

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
