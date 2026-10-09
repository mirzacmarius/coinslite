import { defaultLocale } from "@coinslite/i18n";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, env, mutation, query } from "./_generated/server";
import { emailChangeMessages } from "./account/emailChangeMessages";
import { checkContact } from "./account/rules";
import { requireNormalizedEmail } from "./accounts/credentials";
import { requireSetUpUser, requireUserId } from "./utils/auth";
import { language } from "./utils/validators";

export const emailChangeErrors = {
  sameEmail: "SAME_EMAIL",
  emailInUse: "EMAIL_IN_USE",
  invalidLink: "INVALID_LINK",
  tooManyRequests: "TOO_MANY_REQUESTS",
} as const;

const LINK_LIFETIME_MS = 60 * 60 * 1000;

/** No more than five email-change requests an hour per person. */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  emailChange: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
});

/** The Account screen: who the person is, how to reach them, their preferences and plan. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    // Someone who hasn't finished signing up has no Account screen yet (they're sent to /welcome).
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user?.termsAcceptedAt || !user.homeCurrency) return null;
    const pending = await ctx.db
      .query("emailChanges")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    return {
      email: user.email,
      displayName: user.displayName,
      fullName: user.fullName,
      streetAddress: user.streetAddress,
      postalCode: user.postalCode,
      city: user.city,
      country: user.country,
      contactPhone: user.contactPhone,
      language: user.language,
      homeCurrency: user.homeCurrency,
      // Every account is on the Free plan until billing exists (MUS-709).
      plan: "free" as const,
      pendingEmail:
        pending && pending.expiresAt > Date.now()
          ? pending.newEmail
          : undefined,
    };
  },
});

/** Saves the contact and address details; an emptied field is cleared. */
export const updateContact = mutation({
  args: {
    displayName: v.string(),
    fullName: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, contact) => {
    const user = await requireSetUpUser(ctx);
    await ctx.db.patch(user._id, checkContact(contact));
    return null;
  },
});

/** Remembers the language someone picked, so every device they sign in on uses it. */
export const setLanguage = mutation({
  args: { language },
  returns: v.null(),
  handler: async (ctx, { language }) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, { language });
    return null;
  },
});

/**
 * Starts an email change: a link goes to the new address, and nothing changes
 * until it's opened. A newer request replaces an older one.
 */
export const requestEmailChange = mutation({
  args: { newEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, { newEmail }) => {
    const user = await requireSetUpUser(ctx);
    const email = requireNormalizedEmail(newEmail);
    if (email === user.email)
      throw new ConvexError(emailChangeErrors.sameEmail);
    const { ok } = await rateLimiter.limit(ctx, "emailChange", {
      key: user._id,
    });
    if (!ok) throw new ConvexError(emailChangeErrors.tooManyRequests);
    if (await emailTakenByOther(ctx, email, user._id)) {
      throw new ConvexError(emailChangeErrors.emailInUse);
    }
    if (!env.SITE_URL)
      throw new Error("SITE_URL is not set on this deployment");

    await clearPendingChanges(ctx, user._id);
    const token = newToken();
    await ctx.db.insert("emailChanges", {
      userId: user._id,
      newEmail: email,
      tokenHash: await sha256(token),
      expiresAt: Date.now() + LINK_LIFETIME_MS,
    });
    const message = emailChangeMessages[user.language ?? defaultLocale].confirm;
    await ctx.scheduler.runAfter(0, internal.accounts.emails.send, {
      to: email,
      subject: message.subject,
      body: message.body(email),
      link: {
        url: `${env.SITE_URL}/confirm-email#${new URLSearchParams({ token })}`,
        label: message.linkLabel,
      },
    });
    return null;
  },
});

/**
 * Applies an email change from the link sent to the new address. The link
 * proves the inbox; it works signed in or not, once, for 60 minutes.
 */
export const confirmEmailChange = mutation({
  args: { token: v.string() },
  returns: v.object({ email: v.string() }),
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256(token);
    const change = await ctx.db
      .query("emailChanges")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    const user =
      change && change.expiresAt > Date.now()
        ? await ctx.db.get(change.userId)
        : null;
    if (!change || !user) {
      if (change) await ctx.db.delete(change._id);
      throw new ConvexError(emailChangeErrors.invalidLink);
    }
    const email = change.newEmail;
    if (await emailTakenByOther(ctx, email, user._id)) {
      throw new ConvexError(emailChangeErrors.emailInUse);
    }

    const oldEmail = user.email;
    await ctx.db.patch(user._id, { email, emailVerificationTime: Date.now() });
    // Password and sign-in-link accounts are keyed on the email: move them
    // along, and drop codes that went to the old address.
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .take(20);
    for (const account of accounts.filter(({ provider }) =>
      EMAIL_KEYED.includes(provider),
    )) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .take(20);
      for (const code of codes) await ctx.db.delete(code._id);
      await ctx.db.patch(account._id, {
        providerAccountId: email,
        emailVerified: email,
      });
    }
    await clearPendingChanges(ctx, user._id);

    if (oldEmail) {
      const notice = emailChangeMessages[user.language ?? defaultLocale].notice;
      await ctx.scheduler.runAfter(0, internal.accounts.emails.send, {
        to: oldEmail,
        subject: notice.subject,
        body: notice.body(email),
      });
    }
    return { email };
  },
});

/** Sign-in methods whose account is the email address itself. */
const EMAIL_KEYED = ["password", "magic-link"];

/** Whether another person already uses the address, as their email or a sign-in method. */
async function emailTakenByOther(
  ctx: MutationCtx,
  email: string,
  userId: Id<"users">,
) {
  const owner = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  if (owner !== null && owner._id !== userId) return true;
  for (const provider of EMAIL_KEYED) {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", provider).eq("providerAccountId", email),
      )
      .first();
    if (account && account.userId !== userId) return true;
  }
  return false;
}

async function clearPendingChanges(ctx: MutationCtx, userId: Id<"users">) {
  const pending = await ctx.db
    .query("emailChanges")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(20);
  for (const change of pending) await ctx.db.delete(change._id);
}

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

async function sha256(text: string) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  );
}

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
