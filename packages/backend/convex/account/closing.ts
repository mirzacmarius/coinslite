import { type Locale, defaultLocale } from "@coinslite/i18n";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  env,
  internalAction,
  internalMutation,
  mutation,
} from "../_generated/server";
import { chargesAgain } from "../billing/rules";
import { requireSetUpUser, requireUserId } from "../utils/auth";
import { type ClosingMessage, closingMessages } from "./closingMessages";
import { deleteAccountOf } from "./deletion";

/**
 * Asking to delete an account (spec §2) deactivates it, once no subscription
 * would charge again: an email says so. 14 days later a last email asks to
 * delete it now or reactivate it, and 7 days after that a deactivated
 * account is deleted without further warning. Reactivating it, from the app,
 * calls this off. The deletion itself is account/deletion.ts's.
 */

export const DAY = 24 * 60 * 60 * 1000;

export const closingRules = {
  /** From asking to delete the account to the last email. */
  lastNoticeAfter: 14 * DAY,
  /** From the last email to the deletion. */
  deletionAfterLastNotice: 7 * DAY,
} as const;

export const closingErrors = {
  /** A subscription would still charge again: it's ended first. */
  subscriptionActive: "SUBSCRIPTION_ACTIVE",
} as const;

/** The day an account is deleted, as the person's emails write it. */
const dayOf = (time: number, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(time);

/**
 * Emails the account one of the messages about closing it, in its language,
 * with a link to the app; `deletionAt` is the day it's deleted.
 */
export async function emailClosing(
  ctx: MutationCtx,
  user: Doc<"users">,
  messageIn: (locale: Locale) => ClosingMessage,
  deletionAt: number,
) {
  if (!user.email) return;
  const locale = user.language ?? defaultLocale;
  const message = messageIn(locale);
  await ctx.scheduler.runAfter(0, internal.accounts.emails.send, {
    to: user.email,
    subject: message.subject,
    body: message.body(dayOf(deletionAt, locale)),
    ...(env.SITE_URL && {
      link: { url: `${env.SITE_URL}/settings`, label: message.linkLabel },
    }),
  });
}

/** Whether a subscription of theirs would charge again. */
async function stillCharges(ctx: MutationCtx, userId: Id<"users">) {
  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_userId_and_premium", (q) => q.eq("userId", userId))
    .take(100);
  return subscriptions.some(chargesAgain);
}

/**
 * Asks to delete the signed-in person's account: it's deactivated now and
 * deleted in 21 days unless they reactivate it. Refused while a subscription
 * would charge again: they cancel it first, under Manage subscription.
 */
export const requestDeletion = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireSetUpUser(ctx, { deactivated: true });
    if (user.deactivatedAt !== undefined) return null;
    if (await stillCharges(ctx, user._id))
      throw new ConvexError(closingErrors.subscriptionActive);
    const now = Date.now();
    const deletionAt =
      now + closingRules.lastNoticeAfter + closingRules.deletionAfterLastNotice;
    const closingStep = await ctx.scheduler.runAt(
      now + closingRules.lastNoticeAfter,
      internal.account.closing.sendLastNotice,
      { userId: user._id },
    );
    await ctx.db.patch(user._id, {
      deactivatedAt: now,
      deletionAt,
      closingStep,
    });
    await emailClosing(
      ctx,
      user,
      (locale) => closingMessages[locale].deactivated,
      deletionAt,
    );
    return null;
  },
});

/** Calls off deleting a deactivated account, which works again as before. */
export const reactivate = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await ctx.db.get(await requireUserId(ctx));
    if (!user || user.deactivatedAt === undefined) return null;
    if (user.closingStep) await cancelStep(ctx, user.closingStep);
    await ctx.db.patch(user._id, {
      deactivatedAt: undefined,
      deletionAt: undefined,
      closingStep: undefined,
    });
    return null;
  },
});

/** Cancels a scheduled closing step that hasn't run yet. */
async function cancelStep(ctx: MutationCtx, step: Id<"_scheduled_functions">) {
  const scheduled = await ctx.db.system.get("_scheduled_functions", step);
  if (scheduled?.state.kind === "pending") await ctx.scheduler.cancel(step);
}

/** 14 days after asking: the last email, and the deletion 7 days on. */
export const sendLastNotice = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (user?.deactivatedAt === undefined || user.deletionAt === undefined)
      return null;
    const closingStep = await ctx.scheduler.runAt(
      user.deletionAt,
      internal.account.closing.deleteDeactivated,
      { userId },
    );
    await ctx.db.patch(userId, { closingStep });
    await emailClosing(
      ctx,
      user,
      (locale) => closingMessages[locale].lastNotice,
      user.deletionAt,
    );
    return null;
  },
});

/** How long a deletion that failed (billing couldn't be stopped) waits to try again. */
const retryAfter = DAY;

/** 21 days after asking: deletes the account, unless it was reactivated. */
export const deleteDeactivated = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    try {
      await deleteAccountOf(ctx, userId, "deactivated");
    } catch (error) {
      await ctx.runMutation(internal.account.closing.retryDeletion, {
        userId,
      });
      throw error;
    }
    return null;
  },
});

/** Tries a failed deletion again a day later, unless it was reactivated. */
export const retryDeletion = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (user?.deactivatedAt === undefined) return null;
    const closingStep = await ctx.scheduler.runAfter(
      retryAfter,
      internal.account.closing.deleteDeactivated,
      { userId },
    );
    await ctx.db.patch(userId, { closingStep });
    return null;
  },
});
