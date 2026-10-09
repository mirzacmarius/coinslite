import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id, TableNames } from "../_generated/dataModel";
import {
  type MutationCtx,
  action,
  internalMutation,
  query,
} from "../_generated/server";
import { rateLimiter as emailChangeLimits } from "../account";
import { rateLimiter as codeEmailLimits } from "../accounts/codeEmails";
import { deleteSignInMethods } from "../accounts/linking";
import { albumLimits } from "../albums/rules";
import { deleteSubscriptionsOf, stopBilling } from "../billing";
import { chargesAgain } from "../billing/rules";
import { rateLimiter as feedbackLimits } from "../feedback";
import { deleteItem } from "../items/deletion";
import { NOT_SIGNED_IN, requireUserId } from "../utils/auth";

/**
 * Deleting an account (spec §2): the person, everything in their Collection,
 * their subscription link and every way to sign in as them, for good. It
 * happens in three stages:
 *
 * 1. Billing: a subscription that would charge again is ended at Polar. If
 *    that fails, nothing is deleted, so no deleted account is still billed.
 * 2. At once, in one transaction: the subscription link, the profile, the
 *    sign-in methods and whatever is keyed on the email address go, so nobody
 *    can use or sign in to the account any more and the address is free for a
 *    new sign-up, together with a first batch of the rest (for most accounts,
 *    all of it).
 * 3. In the background, a batch per transaction: whatever didn't fit, so a
 *    Collection of any size can go.
 */

/**
 * What deleting an account does to each table. Typed against the schema, so a
 * new table fails typecheck until it's decided here (and, when it holds
 * someone's data, deleted below).
 */
export const accountDataByTable = {
  users: "deleted at once: the profile",
  authAccounts: "deleted at once: the sign-in methods",
  authVerificationCodes: "deleted at once: codes pending for a sign-in method",
  authRateLimits:
    "deleted at once: failed sign-ins counted for the email and each sign-in method",
  authSessions: "deleted: every session, so each device is signed out",
  authRefreshTokens: "deleted: each session's refresh tokens",
  authVerifiers: "deleted: Google sign-ins a session started",
  emailChanges: "deleted: email changes waiting for their link",
  albums: "deleted: the Albums",
  items:
    "deleted: the Items, with their stored photos and their links to Catalog entries",
  subscriptions:
    "deleted at once: the subscription link, once Polar has ended any subscription that would charge again",
  devOutbox:
    "deleted: emails sent to the account's address (local and CI deployments only)",
  catalogNodes: "kept: the Catalog everyone shares",
  spotPriceSnapshots: "kept: the Spot prices everyone shares",
} as const satisfies Record<TableNames, `${"deleted" | "kept"}${string}`>;

/** How many Items the confirmation counts before it says there are more. */
export const summaryItemLimit = 1000;

/**
 * What deleting the account would take with it, for the confirmation: how
 * many Items (up to `summaryItemLimit`; `more` says there are others), their
 * photos and the Albums, and whether a subscription that would renew is ended
 * too. Null without an account, so a screen still open while the app signs
 * out after the deletion shows nothing rather than fails.
 */
export const summary = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      items: v.number(),
      photos: v.number(),
      albums: v.number(),
      more: v.boolean(),
      endsSubscription: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user) return null;
    const items = await ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .take(summaryItemLimit + 1);
    const counted = items.slice(0, summaryItemLimit);
    const albums = await ctx.db
      .query("albums")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .take(albumLimits.count);
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId_and_premium", (q) => q.eq("userId", user._id))
      .take(100);
    return {
      items: counted.length,
      photos: counted.reduce(
        (photos, { frontPhoto, backPhoto }) =>
          photos + (frontPhoto ? 1 : 0) + (backPhoto ? 1 : 0),
        0,
      ),
      albums: albums.length,
      more: items.length > summaryItemLimit,
      endsSubscription: subscriptions.some(chargesAgain),
    };
  },
});

/** How many documents one transaction deletes; the rest follow in the next. */
export const deletionBatch = 200;

/** What's left of an account whose profile is already gone. */
const remainder = v.object({
  userId: v.id("users"),
  /** Emails captured for the account's address before it was freed. */
  outbox: v.optional(v.object({ email: v.string(), sentBefore: v.number() })),
});
type Remainder = Infer<typeof remainder>;

/**
 * Whatever is keyed on the person's id or email address beyond their
 * documents: the rate limits counted against them. These go at once, since
 * the address can belong to a new account a moment later.
 */
async function forgetPerson(ctx: MutationCtx, user: Doc<"users">) {
  await feedbackLimits.reset(ctx, "feedback", { key: user._id });
  await emailChangeLimits.reset(ctx, "emailChange", { key: user._id });
  const { email } = user;
  if (email === undefined) return;
  await codeEmailLimits.reset(ctx, "codeEmail", { key: email });
  // Wrong codes are counted per address.
  const failedCodes = await ctx.db
    .query("authRateLimits")
    .withIndex("identifier", (q) => q.eq("identifier", email))
    .unique();
  if (failedCodes) await ctx.db.delete(failedCodes._id);
}

/**
 * One kind of the account's documents. Deletes up to `budget` of them and
 * returns how many it deleted: fewer than `budget` means none are left.
 */
type Step = (
  ctx: MutationCtx,
  left: Remainder,
  budget: number,
) => Promise<number>;

/** Deletes documents already read within the budget; returns how many. */
async function deleteDocs(
  ctx: MutationCtx,
  docs: { _id: Id<TableNames> }[],
): Promise<number> {
  for (const doc of docs) await ctx.db.delete(doc._id);
  return docs.length;
}

/**
 * Signs the person out everywhere: each session goes with its refresh tokens
 * and any Google sign-in it started, so no device can stay or get signed in.
 */
const deleteSessions: Step = async (ctx, { userId }, budget) => {
  let deleted = 0;
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .take(budget);
  for (const session of sessions) {
    deleted += await deleteDocs(
      ctx,
      await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .take(budget - deleted),
    );
    if (deleted < budget)
      deleted += await deleteDocs(
        ctx,
        await ctx.db
          .query("authVerifiers")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
          .take(budget - deleted),
      );
    // A session with more than fits is finished in the next batch.
    if (deleted >= budget) return deleted;
    await ctx.db.delete(session._id);
    deleted++;
    if (deleted >= budget) return deleted;
  }
  return deleted;
};

const deleteEmailChanges: Step = async (ctx, { userId }, budget) =>
  deleteDocs(
    ctx,
    await ctx.db
      .query("emailChanges")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(budget),
  );

/** Albums go before their Items, so deleting an Item has no Album count to keep. */
const deleteAlbums: Step = async (ctx, { userId }, budget) =>
  deleteDocs(
    ctx,
    await ctx.db
      .query("albums")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .take(budget),
  );

/** Items go the one way Items are deleted, which takes their stored photos too. */
const deleteItems: Step = async (ctx, { userId }, budget) => {
  const items = await ctx.db
    .query("items")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
    .take(budget);
  for (const item of items) await deleteItem(ctx, item);
  return items.length;
};

/**
 * Emails captured for the address up to the deletion. Later ones belong to
 * whoever signs up with the address next.
 */
const deleteOutbox: Step = async (ctx, { outbox }, budget) => {
  if (!outbox) return 0;
  const { email, sentBefore } = outbox;
  return await deleteDocs(
    ctx,
    await ctx.db
      .query("devOutbox")
      .withIndex("by_to", (q) =>
        q.eq("to", email).lt("_creationTime", sentBefore),
      )
      .take(budget),
  );
};

/** In order: sessions first, so every device is signed out at once. */
const steps: Step[] = [
  deleteSessions,
  deleteEmailChanges,
  deleteAlbums,
  deleteItems,
  deleteOutbox,
];

/** Deletes up to a batch of what's left; returns what's still left, or null when nothing is. */
async function deleteBatch(
  ctx: MutationCtx,
  left: Remainder,
): Promise<Remainder | null> {
  let budget = deletionBatch;
  for (const step of steps) {
    budget -= await step(ctx, left, budget);
    if (budget <= 0) return left;
  }
  return null;
}

/** Deletes a batch now and leaves the rest, if any, to the background. */
async function deleteInBatches(ctx: MutationCtx, left: Remainder) {
  const rest = await deleteBatch(ctx, left);
  if (rest)
    await ctx.scheduler.runAfter(
      0,
      internal.account.deletion.continueDeletion,
      rest,
    );
}

/**
 * Deletes the signed-in person's account and everything in it, for good.
 * From the moment it returns, the account can't be used or signed in to; a
 * large Collection finishes disappearing in the background. Fails, deleting
 * nothing, while a subscription that would charge again can't be ended.
 */
export const deleteAccount = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    // First, so a deleted account is never charged again.
    await stopBilling(ctx, userId);
    await ctx.runMutation(internal.account.deletion.closeAccount, { userId });
    return null;
  },
});

/**
 * Closes an account whose billing has stopped, in one transaction, and
 * deletes the first batch of the rest.
 */
export const closeAccount = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError(NOT_SIGNED_IN);
    await deleteSubscriptionsOf(ctx, userId);
    await deleteSignInMethods(ctx, userId);
    await forgetPerson(ctx, user);
    // A profile picture from before CoinsLite, still on some old accounts.
    if (user.imageId) await ctx.storage.delete(user.imageId);
    await ctx.db.delete(userId);
    await deleteInBatches(ctx, {
      userId,
      ...(user.email !== undefined && {
        outbox: { email: user.email, sentBefore: Date.now() },
      }),
    });
    return null;
  },
});

/** Deletes the next batch of an account whose profile is already gone. */
export const continueDeletion = internalMutation({
  args: remainder.fields,
  returns: v.null(),
  handler: async (ctx, left) => {
    await deleteInBatches(ctx, left);
    return null;
  },
});
