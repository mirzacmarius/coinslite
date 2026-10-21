import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { emailClosing } from "./closing";
import { deleteAccountOf } from "./deletion";
import { inactivityMessages } from "./inactivityMessages";

/**
 * A Free plan's account nobody signs in to (spec §2) gets an email after 6,
 * 8 and 12 months, the last saying when it's deleted: 14 days later, which a
 * daily sweep then does. Signing in starts the count again (auth.ts).
 */

const DAY = 24 * 60 * 60 * 1000;

export const inactivityRules = {
  /** Months without signing in before each email, as days. */
  emailAfter: { 6: 182 * DAY, 8: 243 * DAY, 12: 365 * DAY },
  /** From the 12-month email to the deletion. */
  deletionAfter: 14 * DAY,
  /** How many accounts one run of the sweep handles at each step. */
  sweepBatch: 50,
} as const;

/** The step after each inactivity email: the next email, or the deletion. */
const inactivitySteps = [
  { after: undefined, next: 6 },
  { after: 6, next: 8 },
  { after: 8, next: 12 },
  { after: 12, next: "delete" },
] as const;

/**
 * Daily: emails the Free plan's accounts that reached 6, 8 or 12 months
 * without signing in, and deletes those 14 days past their 12-month email. A
 * batch per step at a time; a full batch runs the sweep again at once.
 */
export const sweep = internalMutation({
  args: {
    /** A further run the same day, for more emails: deletions wait for the next day's. */
    again: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { again }) => {
    const now = Date.now();
    let more = false;
    for (const { after, next } of inactivitySteps) {
      if (again && next === "delete") continue;
      const since =
        next === "delete"
          ? inactivityRules.emailAfter[12] + inactivityRules.deletionAfter
          : inactivityRules.emailAfter[next];
      const cutoff = now - since;
      const users = await ctx.db
        .query("users")
        .withIndex("by_plan_and_inactivityNotice_and_lastSignInAt", (q) =>
          q
            .eq("plan", undefined)
            .eq("inactivityNotice", after)
            // Accounts with no sign-in kept yet aren't counted as unused.
            .gte("lastSignInAt", 0)
            .lt("lastSignInAt", cutoff),
        )
        .take(inactivityRules.sweepBatch);
      let handled = 0;
      for (const user of users) {
        // Already on its way out by the person's own request.
        if (user.deactivatedAt !== undefined) continue;
        handled++;
        if (next === "delete") {
          await ctx.scheduler.runAfter(
            0,
            internal.account.inactivity.deleteUnused,
            { userId: user._id },
          );
          continue;
        }
        await ctx.db.patch(user._id, { inactivityNotice: next });
        await emailClosing(
          ctx,
          user,
          (locale) => inactivityMessages[locale][next],
          now + inactivityRules.deletionAfter,
        );
      }
      // Emailed accounts move on to the next step, so a full batch has more behind it.
      if (
        next !== "delete" &&
        handled > 0 &&
        users.length === inactivityRules.sweepBatch
      )
        more = true;
    }
    if (more)
      await ctx.scheduler.runAfter(0, internal.account.inactivity.sweep, {
        again: true,
      });
    return null;
  },
});

/** Whether the account is still unused: on the Free plan, not signed in to since its 12-month email. */
export const stillUnused = internalQuery({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return (
      user?.inactivityNotice === 12 &&
      user.plan === undefined &&
      user.deactivatedAt === undefined
    );
  },
});

/** Deletes an unused account, unless it was signed in to or upgraded meanwhile. */
export const deleteUnused = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    if (await ctx.runQuery(internal.account.inactivity.stillUnused, { userId }))
      await deleteAccountOf(ctx, userId);
    return null;
  },
});
