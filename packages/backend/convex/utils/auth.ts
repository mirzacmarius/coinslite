import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

export const NOT_SIGNED_IN = "NOT_SIGNED_IN";

/** The signed-in user's id; anyone else is turned away. */
export async function requireUserId(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError(NOT_SIGNED_IN);
  }
  return userId;
}
