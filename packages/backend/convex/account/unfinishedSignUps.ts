import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type MutationCtx, internalMutation } from "../_generated/server";
import { deleteUserAndSignInMethods } from "../accounts/linking";
import { forgetPerson } from "./deletion";
import { isUnfinishedSignUp, unfinishedSignUpRules } from "./deletionRules";

/**
 * Daily (crons.ts): deletes the sign-ups nobody finished a week on, with the
 * address typed for each, which may not even be the typist's. One whose user
 * somehow holds anything (a session, Items, Albums, a Wantlist, a
 * subscription) stays: nobody gets those without proving the email first.
 * Continues in further transactions while there's more.
 */
export const sweep = internalMutation({
  args: { createdAfter: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { createdAfter }) => {
    const now = Date.now();
    const { keptFor, sweepBatch } = unfinishedSignUpRules;
    // Users nobody has signed in as, oldest first.
    const users = await ctx.db
      .query("users")
      .withIndex("by_lastSignInAt", (q) =>
        q
          .eq("lastSignInAt", undefined)
          .gt("_creationTime", createdAfter ?? 0)
          .lt("_creationTime", now - keptFor),
      )
      .take(sweepBatch);
    let deleted = 0;
    for (const user of users) {
      if (
        !isUnfinishedSignUp(user, now) ||
        (await holdsAnything(ctx, user._id))
      )
        continue;
      await forgetPerson(ctx, user);
      // A profile picture from before CoinsLite, still on some old accounts.
      if (user.imageId) await ctx.storage.delete(user.imageId);
      await deleteUserAndSignInMethods(ctx, user._id);
      deleted++;
    }
    if (deleted > 0) console.info(`Deleted ${deleted} unfinished sign-ups`);
    if (users.length === sweepBatch)
      await ctx.scheduler.runAfter(
        0,
        internal.account.unfinishedSignUps.sweep,
        { createdAfter: users.at(-1)?._creationTime },
      );
    return null;
  },
});

/** Whether anything only a signed-in person makes points at the user. */
async function holdsAnything(ctx: MutationCtx, userId: Id<"users">) {
  const firsts = await Promise.all([
    ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first(),
    ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first(),
    ctx.db
      .query("albums")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first(),
    ctx.db
      .query("wants")
      .withIndex("by_ownerId_and_catalogEntryId", (q) =>
        q.eq("ownerId", userId),
      )
      .first(),
    ctx.db
      .query("subscriptions")
      .withIndex("by_userId_and_premium", (q) => q.eq("userId", userId))
      .first(),
  ]);
  return firsts.some((doc) => doc !== null);
}
