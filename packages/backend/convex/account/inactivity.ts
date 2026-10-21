import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  type MutationCtx,
  internalAction,
  internalMutation,
} from "../_generated/server";
import { DAY, emailClosing } from "./closing";
import { deleteAccountOf } from "./deletion";
import { inactivityMessages } from "./inactivityMessages";

/**
 * A Free plan's account nobody signs in to (spec §2) gets an email after 6,
 * 8 and 12 months, the last saying when it's deleted: 14 days later, which a
 * daily sweep then does. Signing in starts the count again (auth.ts).
 *
 * Each email sets when the next step is due (`inactivityDueAt`), at least a
 * month after it, so an account unused for longer than a year when this
 * started still gets each email in turn, and the deletion comes on the day
 * the last one names.
 */

export const inactivityRules = {
  /** Months without signing in before each email, as days. */
  emailAfter: { 6: 182 * DAY, 8: 243 * DAY, 12: 365 * DAY },
  /** The least time between one email and the next. */
  emailGap: 30 * DAY,
  /** From the 12-month email to the deletion. */
  deletionAfter: 14 * DAY,
  /** How long a deletion that failed waits to try again. */
  retryAfter: DAY,
  /** How many accounts one run of the sweep handles at each step. */
  sweepBatch: 50,
} as const;

type Notice = 6 | 8 | 12;

/** Sends a notice, and sets when the step after it is due. */
async function sendNotice(
  ctx: MutationCtx,
  user: Doc<"users">,
  notice: Notice,
  now: number,
) {
  const lastSignInAt = user.lastSignInAt ?? user._creationTime;
  const dueAt =
    notice === 12
      ? now + inactivityRules.deletionAfter
      : Math.max(
          lastSignInAt + inactivityRules.emailAfter[notice === 6 ? 8 : 12],
          now + inactivityRules.emailGap,
        );
  await ctx.db.patch(user._id, {
    inactivityNotice: notice,
    inactivityDueAt: dueAt,
  });
  await emailClosing(
    ctx,
    user,
    (locale) => inactivityMessages[locale][notice],
    dueAt,
  );
}

/**
 * Daily: emails the Free plan's accounts whose next step is due, and deletes
 * those past the day their 12-month email named. Each account moves at most
 * one step per run; a full batch runs the sweep again at once.
 */
export const sweep = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const { sweepBatch } = inactivityRules;
    let more = false;
    /** Takes a step for each account, apart from those their owner deactivated. */
    const handle = async (
      users: Doc<"users">[],
      step: (user: Doc<"users">) => Promise<void>,
    ) => {
      let handled = 0;
      for (const user of users) {
        if (user.deactivatedAt !== undefined) continue;
        await step(user);
        handled++;
      }
      if (handled > 0 && users.length === sweepBatch) more = true;
    };
    /** Accounts at `notice` whose next step is due. */
    const due = (notice: Notice) =>
      ctx.db
        .query("users")
        .withIndex("by_plan_and_inactivityNotice_and_inactivityDueAt", (q) =>
          q
            .eq("plan", undefined)
            .eq("inactivityNotice", notice)
            .gte("inactivityDueAt", 0)
            .lt("inactivityDueAt", now),
        )
        .take(sweepBatch);

    // The last step first, so an account moves one step per run.
    await handle(await due(12), async (user) => {
      // Out of the sweep's way while it's deleted.
      await ctx.db.patch(user._id, { inactivityDueAt: undefined });
      await ctx.scheduler.runAfter(
        0,
        internal.account.inactivity.deleteUnused,
        { userId: user._id },
      );
    });
    await handle(await due(8), (user) => sendNotice(ctx, user, 12, now));
    await handle(await due(6), (user) => sendNotice(ctx, user, 8, now));
    const unused = await ctx.db
      .query("users")
      .withIndex("by_plan_and_inactivityNotice_and_lastSignInAt", (q) =>
        q
          .eq("plan", undefined)
          .eq("inactivityNotice", undefined)
          // Accounts with no sign-in kept yet aren't counted as unused.
          .gte("lastSignInAt", 0)
          .lt("lastSignInAt", now - inactivityRules.emailAfter[6]),
      )
      .take(sweepBatch);
    await handle(unused, (user) => sendNotice(ctx, user, 6, now));

    if (more)
      await ctx.scheduler.runAfter(0, internal.account.inactivity.sweep, {});
    return null;
  },
});

/** Deletes an unused account, unless it was signed in to or upgraded meanwhile. */
export const deleteUnused = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    try {
      await deleteAccountOf(ctx, userId, "unused");
    } catch (error) {
      await ctx.runMutation(internal.account.inactivity.retryLater, {
        userId,
      });
      throw error;
    }
    return null;
  },
});

/** Puts a deletion that failed back in the sweep, a day later. */
export const retryLater = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (user?.inactivityNotice !== 12) return null;
    await ctx.db.patch(userId, {
      inactivityDueAt: Date.now() + inactivityRules.retryAfter,
    });
    return null;
  },
});
