import { isLocale } from "@coinslite/i18n";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  type QueryCtx,
  env,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { sendEmail } from "../email";

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

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Sends an email, with an optional link, through Resend; on deployments with
 * EMAIL_DELIVERY=outbox it lands in the dev outbox instead. Replies go to
 * `replyTo` when it's given.
 */
export const send = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    link: v.optional(v.object({ url: v.string(), label: v.string() })),
    replyTo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { to, subject, body, link, replyTo }) => {
    const text = link ? `${body}\n\n${link.label}: ${link.url}` : body;
    if (env.EMAIL_DELIVERY === "outbox") {
      await ctx.runMutation(internal.accounts.emails.recordInOutbox, {
        to,
        subject,
        text,
      });
      return null;
    }
    const linkHtml = link
      ? `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></p>`
      : "";
    const html = `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>${linkHtml}`;
    await sendEmail({ to, subject, text, html, replyTo });
    return null;
  },
});
