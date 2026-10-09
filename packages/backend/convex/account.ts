import { defaultLocale } from "@coinslite/i18n";
import { getAuthSessionId } from "@convex-dev/auth/server";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  env,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { emailChangeMessages } from "./account/emailChangeMessages";
import { checkContact } from "./account/rules";
import { requireNormalizedEmail } from "./accounts/credentials";
import { deleteUserAndSignInMethods } from "./accounts/linking";
import { requireSetUpUser, requireUserId } from "./utils/auth";
import { language } from "./utils/validators";

export const emailChangeErrors = {
  sameEmail: "SAME_EMAIL",
  emailInUse: "EMAIL_IN_USE",
  invalidLink: "INVALID_LINK",
  tooManyRequests: "TOO_MANY_REQUESTS",
  signInAgain: "SIGN_IN_AGAIN",
  otherAccount: "OTHER_ACCOUNT",
} as const;

const LINK_LIFETIME_MS = 60 * 60 * 1000;
/** Changing the email needs a sign-in this recent, so a session left open elsewhere can't. */
const RECENT_SIGN_IN_MS = 15 * 60 * 1000;

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
      // An expired change is deleted when it expires (expireEmailChange).
      pendingEmail: pending?.newEmail,
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
 * until it's opened. A newer request replaces an older one. Whether the address
 * is free is only decided when the link is opened, so asking can't be used to
 * find out who has an account.
 */
export const requestEmailChange = mutation({
  args: { newEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, { newEmail }) => {
    const user = await requireSetUpUser(ctx);
    const email = requireNormalizedEmail(newEmail);
    if (email === user.email)
      throw new ConvexError(emailChangeErrors.sameEmail);
    await requireRecentSignIn(ctx);
    const { ok } = await rateLimiter.limit(ctx, "emailChange", {
      key: user._id,
    });
    if (!ok) throw new ConvexError(emailChangeErrors.tooManyRequests);
    if (!env.SITE_URL)
      throw new Error("SITE_URL is not set on this deployment");

    await clearPendingChanges(ctx, user._id);
    const token = newToken();
    const expiresAt = Date.now() + LINK_LIFETIME_MS;
    const changeId = await ctx.db.insert("emailChanges", {
      userId: user._id,
      newEmail: email,
      tokenHash: await sha256(token),
      expiresAt,
    });
    await ctx.scheduler.runAt(expiresAt, internal.account.expireEmailChange, {
      changeId,
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

export const expireEmailChange = internalMutation({
  args: { changeId: v.id("emailChanges") },
  returns: v.null(),
  handler: async (ctx, { changeId }) => {
    if (await ctx.db.get(changeId)) await ctx.db.delete(changeId);
    return null;
  },
});

/**
 * Applies an email change from the link sent to the new address. The link
 * proves the inbox; it works once, for 60 minutes, and only for the account
 * that asked, so a link opened by whoever got a mistyped address does nothing.
 */
export const confirmEmailChange = mutation({
  args: { token: v.string() },
  returns: v.object({ email: v.string() }),
  handler: async (ctx, { token }) => {
    const userId = await requireUserId(ctx);
    const tokenHash = await sha256(token);
    const change = await ctx.db
      .query("emailChanges")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!change || change.expiresAt <= Date.now()) {
      throw new ConvexError(emailChangeErrors.invalidLink);
    }
    if (change.userId !== userId) {
      throw new ConvexError(emailChangeErrors.otherAccount);
    }
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError(emailChangeErrors.invalidLink);
    const email = change.newEmail;
    // Proof wins (ADR 0005): sign-ups that never proved the address give way
    // to the person who just did; someone who proved it keeps it.
    const others = await othersWithEmail(ctx, email, user._id);
    if (others.some((other) => other.emailVerificationTime !== undefined)) {
      throw new ConvexError(emailChangeErrors.emailInUse);
    }
    for (const other of others)
      await deleteUserAndSignInMethods(ctx, other._id);

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

/** The other people with the address, as their email or a sign-in method. */
async function othersWithEmail(
  ctx: MutationCtx,
  email: string,
  userId: Id<"users">,
) {
  const ids = new Set<Id<"users">>();
  const owners = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(10);
  for (const owner of owners) ids.add(owner._id);
  for (const provider of EMAIL_KEYED) {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", provider).eq("providerAccountId", email),
      )
      .unique();
    if (account) ids.add(account.userId);
  }
  ids.delete(userId);
  const others = await Promise.all([...ids].map((id) => ctx.db.get(id)));
  return others.filter((other): other is Doc<"users"> => other !== null);
}

/** A sign-in within the last few minutes, by session start; refreshing a session doesn't count. */
async function requireRecentSignIn(ctx: MutationCtx) {
  const sessionId = await getAuthSessionId(ctx);
  const session = sessionId && (await ctx.db.get(sessionId));
  if (!session || Date.now() - session._creationTime > RECENT_SIGN_IN_MS) {
    throw new ConvexError(emailChangeErrors.signInAgain);
  }
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
