import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireUserId } from "../utils/auth";
import { homeCurrency, language } from "../utils/validators";
import { localPart } from "./linking";

/**
 * The last step of signing up with Google or a sign-in link: the same choices
 * the sign-up form asks for. Password sign-ups make them on the form instead.
 */
export const completeSignUp = mutation({
  args: { homeCurrency, language, acceptTerms: v.literal(true) },
  returns: v.null(),
  handler: async (ctx, { homeCurrency, language }) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("NOT_SIGNED_IN");
    await ctx.db.patch(userId, {
      homeCurrency,
      language,
      termsAcceptedAt: user.termsAcceptedAt ?? Date.now(),
      ...(user.displayName === undefined &&
        user.email && { displayName: localPart(user.email) }),
    });
    return null;
  },
});
