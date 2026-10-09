import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import {
  type MutationCtx,
  internalMutation,
  query,
} from "../_generated/server";
import { normalizeEmail } from "../accounts/credentials";

/**
 * Who is an admin. The role is granted from the Convex dashboard or CLI, never
 * from the app:
 *   npx convex run admin/roles:grant '{"email":"you@example.com"}'
 *   npx convex run admin/roles:revoke '{"email":"you@example.com"}'
 * Admin-only functions check it with requireAdmin (utils/auth.ts).
 */

export const USER_NOT_FOUND = "USER_NOT_FOUND";

/** Whether the signed-in person is an admin, so the app shows admin areas; false when signed out. */
export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get("users", userId) : null;
    return user?.role === "admin";
  },
});

async function userByEmail(ctx: MutationCtx, email: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", normalizeEmail(email)))
    .unique();
  if (!user) throw new ConvexError(USER_NOT_FOUND);
  return user;
}

/** Makes the account with this email an admin. */
export const grant = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    const user = await userByEmail(ctx, email);
    await ctx.db.patch("users", user._id, { role: "admin" });
    return null;
  },
});

/** Takes the admin role away from the account with this email. */
export const revoke = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, { email }) => {
    const user = await userByEmail(ctx, email);
    await ctx.db.patch("users", user._id, { role: undefined });
    return null;
  },
});
