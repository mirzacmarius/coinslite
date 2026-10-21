import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

export const NOT_SIGNED_IN = "NOT_SIGNED_IN";
export const NOT_SET_UP = "NOT_SET_UP";
export const NOT_ADMIN = "NOT_ADMIN";
/** The account is deactivated, on its way to being deleted (account/closing.ts). */
export const DEACTIVATED = "DEACTIVATED";

/** The signed-in user's id; anyone else is turned away. */
export async function requireUserId(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError(NOT_SIGNED_IN);
  }
  return userId;
}

/**
 * The signed-in user, once they've finished signing up (terms accepted, Home
 * currency chosen). Anything touching Collection data needs this, not just a
 * session (ADR 0005). A deactivated account is turned away too, unless
 * `deactivated` lets it through.
 */
export async function requireSetUpUser(
  ctx: QueryCtx | MutationCtx,
  { deactivated = false }: { deactivated?: boolean } = {},
) {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError(NOT_SIGNED_IN);
  const { termsAcceptedAt, homeCurrency } = user;
  if (termsAcceptedAt === undefined || homeCurrency === undefined) {
    throw new ConvexError(NOT_SET_UP);
  }
  if (!deactivated && user.deactivatedAt !== undefined)
    throw new ConvexError(DEACTIVATED);
  return { ...user, termsAcceptedAt, homeCurrency };
}

/**
 * The set-up user as `requireSetUpUser` gives it, or null when there's none:
 * signed out, the account deleted or deactivated, or sign-up unfinished. For the queries the
 * app frame asks on every signed-in screen, which mustn't fail while a
 * session ends.
 */
export async function setUpUserOrNull(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId && (await ctx.db.get("users", userId));
  if (!user) return null;
  const { termsAcceptedAt, homeCurrency } = user;
  if (termsAcceptedAt === undefined || homeCurrency === undefined) return null;
  if (user.deactivatedAt !== undefined) return null;
  return { ...user, termsAcceptedAt, homeCurrency };
}

/**
 * The signed-in user, if they hold the admin role. Everyone else is turned
 * away, so every admin-only function starts with this.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError(NOT_SIGNED_IN);
  if (user.role !== "admin") throw new ConvexError(NOT_ADMIN);
  return user;
}
