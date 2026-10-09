import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";
import { chargesAgain } from "../billing/rules";
import { ensureCollectionCounts } from "../collectionCounts";
import { planOf } from "../plans";
import { requireAdmin } from "../utils/auth";
import {
  type StatsFigures,
  type StatsTable,
  noFigures,
  statsFigures,
  statsTables,
} from "./statsFigures";

/**
 * Admin stats (spec §15): how CoinsLite is doing, across everyone.
 *
 * No query can read every user, Item and subscription, so the figures are
 * counted in the background, a batch per transaction, into an `adminStats`
 * document; admins read the newest finished one. A count runs every hour
 * (crons.ts) and whenever an admin asks for a fresh one. It goes through:
 *
 * - users, each with their plan and their Collection's counts (kept per
 *   person as Items and Albums come and go: collectionCounts.ts), so the
 *   Collection totals cost one small read per person, not one per Item;
 * - subscriptions;
 * - the Items and Albums added within the activity windows, through the
 *   creation-time index, so only recent ones are read.
 *
 * Why a background count rather than totals every write keeps: those would
 * be documents every Item added by anyone writes to, so busy moments would
 * contend on them; every way an account, plan or subscription changes would
 * have to keep them right; and the activity windows would need time buckets.
 * A count reads each person once and only recent Items, needs no bookkeeping
 * outside the per-person Collection counts, and is an hour old at most.
 * Counting from the users table also means a deleted account stops counting
 * the moment its profile goes, whatever is still being cleared up behind it.
 *
 * What each figure counts:
 * - users: accounts that have proven their email and finished signing up;
 *   new = created in the last 30 days; Premium and Free split them by plan.
 * - subscriptions: active = makes its owner Premium now; ending = active,
 *   won't renew, and its paid period ends within 30 days; ended = no longer
 *   Premium (subscriptions whose first payment never went through excluded).
 * - Collection: Items in all and of each Item type, and Albums.
 * - activity: Items added in the last 24 hours and 7 days, and Albums created
 *   in the last 30 days, that still exist.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** How many documents of each table one transaction of a count reads. */
const batchSize: Record<StatsTable, number> = {
  // Each person also costs a plan and a Collection counts read.
  users: 100,
  subscriptions: 200,
  items: 500,
  albums: 500,
};

/**
 * A count that hasn't finished after this long has stopped (a batch failed);
 * the next refresh starts over rather than waiting on it.
 */
const stalledAfter = 15 * 60 * 1000;

/** Subscription statuses of a checkout whose first payment never went through. */
const neverStarted = new Set(["incomplete", "incomplete_expired"]);

/**
 * The newest finished count, with when it was taken, and whether a fresh one
 * is under way. Admins only.
 */
export const get = query({
  args: {},
  returns: v.object({
    latest: v.union(
      v.null(),
      v.object({ countedAt: v.number(), figures: statsFigures }),
    ),
    refreshing: v.boolean(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const latest = await ctx.db
      .query("adminStats")
      .withIndex("by_finishedAt", (q) => q.gt("finishedAt", 0))
      .order("desc")
      .first();
    const running = await ctx.db
      .query("adminStats")
      .withIndex("by_finishedAt", (q) => q.eq("finishedAt", undefined))
      .first();
    return {
      latest: latest && {
        countedAt: latest.startedAt,
        figures: latest.figures,
      },
      refreshing: running !== null,
    };
  },
});

/** Starts a fresh count, unless one is already under way. Admins only. */
export const refresh = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await startCount(ctx);
    return null;
  },
});

/** The hourly count (crons.ts). */
export const hourly = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await startCount(ctx);
    return null;
  },
});

async function startCount(ctx: MutationCtx) {
  const now = Date.now();
  const running = await ctx.db
    .query("adminStats")
    .withIndex("by_finishedAt", (q) => q.eq("finishedAt", undefined))
    .first();
  if (running) {
    if (running.startedAt > now - stalledAfter) return;
    await ctx.db.delete(running._id);
  }
  const countId = await ctx.db.insert("adminStats", {
    startedAt: now,
    progress: { table: statsTables[0], cursor: null },
    figures: noFigures(),
  });
  await ctx.scheduler.runAfter(0, internal.admin.stats.countBatch, {
    countId,
  });
}

/** Counts the next batch of a count in progress, then books the one after. */
export const countBatch = internalMutation({
  args: { countId: v.id("adminStats") },
  returns: v.null(),
  handler: async (ctx, { countId }) => {
    const count = await ctx.db.get(countId);
    // Started over by a later refresh, or finished.
    if (!count?.progress) return null;
    const { table, cursor } = count.progress;
    const { figures } = count;
    const next = await countTable[table](ctx, {
      figures,
      startedAt: count.startedAt,
      cursor,
    });
    if (next !== null) {
      await ctx.db.patch(countId, {
        figures,
        progress: { table, cursor: next },
      });
    } else {
      const following = statsTables[statsTables.indexOf(table) + 1];
      if (following) {
        await ctx.db.patch(countId, {
          figures,
          progress: { table: following, cursor: null },
        });
      } else {
        await finish(ctx, countId, figures);
        return null;
      }
    }
    await ctx.scheduler.runAfter(0, internal.admin.stats.countBatch, {
      countId,
    });
    return null;
  },
});

/** Marks a count finished and drops the one it replaces. */
async function finish(
  ctx: MutationCtx,
  countId: Id<"adminStats">,
  figures: StatsFigures,
) {
  await ctx.db.patch(countId, {
    figures,
    finishedAt: Date.now(),
    progress: undefined,
  });
  const finished = await ctx.db
    .query("adminStats")
    .withIndex("by_finishedAt", (q) => q.gt("finishedAt", 0))
    .take(10);
  for (const older of finished) {
    if (older._id !== countId) await ctx.db.delete(older._id);
  }
}

type Batch = {
  /** Added to in place. */
  figures: StatsFigures;
  startedAt: number;
  cursor: string | null;
};

/** Counts one batch of a table; returns the cursor to go on from, or null when the table is done. */
type CountBatch = (ctx: MutationCtx, batch: Batch) => Promise<string | null>;

/** Whether someone counts as a user: their email is proven and they've finished signing up. */
const isUser = (user: Doc<"users">) =>
  user.emailVerificationTime !== undefined &&
  user.termsAcceptedAt !== undefined &&
  user.homeCurrency !== undefined;

const countUsers: CountBatch = async (ctx, { figures, startedAt, cursor }) => {
  const page = await ctx.db
    .query("users")
    .paginate({ cursor, numItems: batchSize.users });
  for (const user of page.page) {
    if (!isUser(user)) continue;
    figures.users.total++;
    if (user._creationTime >= startedAt - 30 * DAY)
      figures.users.newLast30Days++;
    if ((await planOf(ctx, user._id)) === "premium") figures.users.premium++;
    else figures.users.free++;
    const counts = await ensureCollectionCounts(ctx, user._id);
    for (const field of Object.keys(figures.collection) as Array<
      keyof StatsFigures["collection"]
    >) {
      figures.collection[field] += counts[field];
    }
  }
  return page.isDone ? null : page.continueCursor;
};

const countSubscriptions: CountBatch = async (
  ctx,
  { figures, startedAt, cursor },
) => {
  const page = await ctx.db
    .query("subscriptions")
    .paginate({ cursor, numItems: batchSize.subscriptions });
  for (const subscription of page.page) {
    if (subscription.premium) {
      figures.subscriptions.active++;
      if (
        !chargesAgain(subscription) &&
        subscription.premiumUntil !== undefined &&
        subscription.premiumUntil <= startedAt + 30 * DAY
      )
        figures.subscriptions.endingWithin30Days++;
    } else if (!neverStarted.has(subscription.status)) {
      figures.subscriptions.ended++;
    }
  }
  return page.isDone ? null : page.continueCursor;
};

const countRecentItems: CountBatch = async (
  ctx,
  { figures, startedAt, cursor },
) => {
  const page = await ctx.db
    .query("items")
    .withIndex("by_creation_time", (q) =>
      q.gte("_creationTime", startedAt - 7 * DAY),
    )
    .paginate({ cursor, numItems: batchSize.items });
  for (const item of page.page) {
    figures.activity.itemsAddedLast7Days++;
    if (item._creationTime >= startedAt - DAY)
      figures.activity.itemsAddedLast24Hours++;
  }
  return page.isDone ? null : page.continueCursor;
};

const countRecentAlbums: CountBatch = async (
  ctx,
  { figures, startedAt, cursor },
) => {
  const page = await ctx.db
    .query("albums")
    .withIndex("by_creation_time", (q) =>
      q.gte("_creationTime", startedAt - 30 * DAY),
    )
    .paginate({ cursor, numItems: batchSize.albums });
  figures.activity.albumsCreatedLast30Days += page.page.length;
  return page.isDone ? null : page.continueCursor;
};

const countTable: Record<StatsTable, CountBatch> = {
  users: countUsers,
  subscriptions: countSubscriptions,
  items: countRecentItems,
  albums: countRecentAlbums,
};
