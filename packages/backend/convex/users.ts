import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";

/**
 * The signed-in person as the app reads them on every screen: the name and
 * picture the sidebar shows, whether they finished signing up, their
 * language, country and Home currency (with any change of it under way).
 * Null when signed out or the account is gone.
 */
export const getUser = query({
  args: {},
  returns: v.union(
    v.null(),
    schema
      .doc("users")
      .pick(
        "email",
        "image",
        "termsAcceptedAt",
        "language",
        "languageChangedAt",
        "country",
        "homeCurrency",
        "homeCurrencyChange",
      )
      .extend({
        /** The display name they chose, else their sign-in provider's. */
        name: v.optional(v.string()),
      }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user) return null;
    return {
      name: user.displayName ?? user.name,
      email: user.email,
      image: user.image,
      termsAcceptedAt: user.termsAcceptedAt,
      language: user.language,
      languageChangedAt: user.languageChangedAt,
      country: user.country,
      homeCurrency: user.homeCurrency,
      homeCurrencyChange: user.homeCurrencyChange,
    };
  },
});
