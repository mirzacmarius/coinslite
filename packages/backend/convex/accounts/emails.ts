import { isLocale } from "@coinslite/i18n";
import { v } from "convex/values";
import {
  type QueryCtx,
  internalMutation,
  internalQuery,
} from "../_generated/server";

/** The language to write a user's emails in, by their email address. */
export const languageFor = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    return isLocale(user?.language) ? user.language : null;
  },
});

/** Captures an email instead of sending it (EMAIL_DELIVERY=outbox only). */
export const recordInOutbox = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    code: v.optional(v.string()),
  },
  handler: async (ctx, email) => {
    await ctx.db.insert("devOutbox", email);
    return null;
  },
});

/** The newest email sent to an address, from the outbox. */
async function latestEmailTo(ctx: QueryCtx, email: string) {
  return await ctx.db
    .query("devOutbox")
    .withIndex("by_to", (q) => q.eq("to", email))
    .order("desc")
    .first();
}

/** The newest one-time code sent to an address; used by end-to-end tests via `convex run`. */
export const latestCodeFor = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { email }) =>
    (await latestEmailTo(ctx, email))?.code ?? null,
});

/** The link in the newest email sent to an address; used by end-to-end tests via `convex run`. */
export const latestLinkFor = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { email }) =>
    (await latestEmailTo(ctx, email))?.text.match(/https?:\/\/\S+/)?.[0] ??
    null,
});
