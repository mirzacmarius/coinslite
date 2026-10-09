import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

export const NOT_SIGNED_IN = "NOT_SIGNED_IN";
export const NOT_SET_UP = "NOT_SET_UP";

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
 * session (ADR 0005).
 */
export async function requireSetUpUser(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError(NOT_SIGNED_IN);
  const { termsAcceptedAt, homeCurrency } = user;
  if (termsAcceptedAt === undefined || homeCurrency === undefined) {
    throw new ConvexError(NOT_SET_UP);
  }
  return { ...user, termsAcceptedAt, homeCurrency };
}
