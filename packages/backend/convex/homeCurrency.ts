import type { HomeCurrency } from "@coinslite/i18n";
import { streamQuery } from "convex-helpers/server/pagination";
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import {
  afterBatch,
  afterStall,
  amountFields,
  calledOffReasons,
  changingHomeCurrency,
  convertBatch,
  holdsAmount,
  homeCurrencyErrors,
  homeCurrencyLimits,
  type itemCursor,
  tooLargeForOneGo,
} from "./homeCurrency/rules";
import schema from "./schema";
import { latestRates } from "./spotPrices";
import { requireSetUpUser } from "./utils/auth";
import { homeCurrency } from "./utils/validators";

/**
 * Changing the Home currency (spec §4) converts every stored amount into the
 * new one at the exchange rate the person confirmed: the Items' Purchase
 * prices, Market values and sale prices, and the Market values in their
 * history.
 *
 * A Collection that fits in one go (`tooLargeForOneGo`) is converted in the
 * transaction that confirms the change, so nobody ever sees it half
 * converted. A larger one is converted in the background, a batch of Items
 * with their history per transaction: a first pass checks every amount fits
 * in the new currency, so nothing is converted unless all of it can be; then,
 * if it met any amount, a second converts them. The last batch switches the
 * Home currency. Meanwhile the profile says so (`homeCurrencyChange`): the
 * app shows "Converting…" for the Collection's money, and edits that write
 * an amount and another change wait. Each Item is converted together with
 * its history, so a Quantity edit meanwhile records its point in whichever
 * currency the Item is in, and every amount is converted once.
 */

/**
 * The person's Items and Market value history, each read as far as one past
 * the most one go converts: enough to tell whether one go converts them all.
 */
async function readCollection(ctx: QueryCtx, ownerId: Id<"users">) {
  const read = {
    items: await ctx.db
      .query("items")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .take(homeCurrencyLimits.oneGoItems + 1),
    history: await ctx.db
      .query("marketValueHistory")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .take(homeCurrencyLimits.oneGoHistoryPoints + 1),
  };
  return { ...read, inBackground: tooLargeForOneGo(read) };
}

/**
 * What changing the Home currency to `homeCurrency` would do: how many stored
 * amounts get converted (counted on the first `homeCurrencyLimits.oneGoItems`
 * Items; `countedAll` says whether that's every Item), whether in the
 * background, and the stored exchange rate they'd be converted at. `rate` is
 * null before the first exchange rates are stored.
 */
export const preview = query({
  args: { homeCurrency },
  returns: v.object({
    from: homeCurrency,
    to: homeCurrency,
    amounts: v.number(),
    countedAll: v.boolean(),
    /** Too large for one go: converted in the background. */
    inBackground: v.boolean(),
    rate: v.union(
      v.null(),
      v.object({ value: v.number(), quotedAt: v.number(), stale: v.boolean() }),
    ),
  }),
  handler: async (ctx, { homeCurrency: to }) => {
    const owner = await requireSetUpUser(ctx);
    const from = owner.homeCurrency;
    const { items, inBackground } = await readCollection(ctx, owner._id);
    const rates = await latestRates(ctx);
    return {
      from,
      to,
      amounts: items
        .slice(0, homeCurrencyLimits.oneGoItems)
        .flatMap(amountFields).length,
      countedAll: items.length <= homeCurrencyLimits.oneGoItems,
      inBackground,
      rate: rates && {
        value: rates.rate(from, to),
        quotedAt: rates.ratesQuotedAt,
        stale: rates.stale,
      },
    };
  },
});

/**
 * The exchange rate the person confirmed, once it's checked to be the stored
 * one: amounts are only ever converted at the rate the person saw.
 */
async function confirmedRate(
  ctx: QueryCtx,
  from: HomeCurrency,
  to: HomeCurrency,
  confirmed: number | undefined,
) {
  const rates = await latestRates(ctx);
  if (!rates) throw new ConvexError(homeCurrencyErrors.rateUnavailable);
  const rate = rates.rate(from, to);
  if (confirmed !== rate) throw new ConvexError(homeCurrencyErrors.rateChanged);
  return rate;
}

/** Writes a converted batch (`convertBatch`). */
async function writeConverted(
  ctx: MutationCtx,
  converted: ReturnType<
    typeof convertBatch<Id<"items">, Id<"marketValueHistory">>
  >,
) {
  for (const { _id, amounts, purchasePaid } of converted.items)
    await ctx.db.patch("items", _id, {
      ...amounts,
      ...(purchasePaid && { purchasePaid }),
    });
  for (const { _id, marketValue } of converted.history)
    await ctx.db.patch("marketValueHistory", _id, { marketValue });
}

/**
 * Changes the signed-in person's Home currency, converting every stored
 * amount into it at `rate`, the stored exchange rate the preview showed,
 * rounded to whole minor units. A Collection that fits is converted at once,
 * all or nothing: if an amount would be too large in the new currency,
 * nothing changes. A larger one is converted in the background
 * (`inBackground`), and the Home currency switches when it's done.
 */
export const change = mutation({
  args: {
    homeCurrency,
    /** The exchange rate the person confirmed; needed when there are amounts to convert. */
    rate: v.optional(v.number()),
  },
  returns: v.object({ inBackground: v.boolean() }),
  handler: async (ctx, { homeCurrency: to, rate }) => {
    const owner = await requireSetUpUser(ctx);
    if (changingHomeCurrency(owner))
      throw new ConvexError(homeCurrencyErrors.changing);
    const from = owner.homeCurrency;
    if (to === from) throw new ConvexError(homeCurrencyErrors.sameCurrency);
    const { items, history, inBackground } = await readCollection(
      ctx,
      owner._id,
    );
    if (inBackground) {
      await ctx.db.patch("users", owner._id, {
        homeCurrencyChange: {
          state: "converting",
          to,
          rate: await confirmedRate(ctx, from, to, rate),
        },
      });
      await ctx.db.insert("homeCurrencyChanges", {
        userId: owner._id,
        phase: "checking",
        cursor: null,
        anyAmount: false,
        updatedAt: Date.now(),
        retries: 0,
        waiting: false,
      });
      await ctx.scheduler.runAfter(0, internal.homeCurrency.continueChange, {
        userId: owner._id,
      });
      return { inBackground: true };
    }
    if (items.some(holdsAmount) || history.some(holdsAmount)) {
      const converted = convertBatch(
        { items, history },
        await confirmedRate(ctx, from, to, rate),
        to,
      );
      if (converted.tooLarge)
        throw new ConvexError(homeCurrencyErrors.amountTooLarge);
      await writeConverted(ctx, converted);
    }
    // Also forgets a change called off before.
    await ctx.db.patch("users", owner._id, {
      homeCurrency: to,
      homeCurrencyChange: undefined,
    });
    return { inBackground: false };
  },
});

/** The progress of the person's change in the background, if one is under way. */
async function progressOf(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("homeCurrencyChanges")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

/** Forgets a deleted account's change in the background (account/deletion.ts). */
export async function deleteHomeCurrencyChangeOf(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const progress = await progressOf(ctx, userId);
  if (progress) await ctx.db.delete("homeCurrencyChanges", progress._id);
}

/** A batch stops taking Items once it has used this share of any of the transaction's limits. */
const batchShareOfLimits = 0.25;

/**
 * Whether the transaction has used its share of any limit (documents and
 * bytes read, queries…). A batch reads every Item and point it converts, and
 * writes no more than it read, so this keeps its writes inside too.
 */
async function batchFull(ctx: MutationCtx) {
  const metrics = await ctx.meta.getTransactionMetrics();
  return Object.values(metrics).some(
    ({ used, remaining }) => used > (used + remaining) * batchShareOfLimits,
  );
}

/** One Item's history, whole: it's converted with the Item, in the same transaction. */
async function historyToConvert(ctx: QueryCtx, itemId: Id<"items">) {
  const history = await ctx.db
    .query("marketValueHistory")
    .withIndex("by_itemId_and_at", (q) => q.eq("itemId", itemId))
    .take(homeCurrencyLimits.itemHistoryPoints + 1);
  if (history.length > homeCurrencyLimits.itemHistoryPoints)
    throw new Error(`Item ${itemId} has more history than a batch takes`);
  return history;
}

/**
 * The next Items of the person's after `cursor`, in the order of the
 * `by_ownerId` index, with their history: as many as the batch takes, up to
 * `homeCurrencyLimits.batchItems`. `isDone` says no Item is left after them.
 */
async function nextBatch(
  ctx: MutationCtx,
  userId: Id<"users">,
  cursor: Infer<typeof itemCursor> | null,
) {
  const items: Doc<"items">[] = [];
  const history: Doc<"marketValueHistory">[] = [];
  const after = streamQuery(ctx, {
    table: "items",
    index: "by_ownerId",
    schema,
    startIndexKey: cursor
      ? [userId, cursor.creationTime, cursor.itemId]
      : [userId],
    startInclusive: cursor === null,
    endIndexKey: [userId],
  });
  for await (const [item] of after) {
    if (
      items.length === homeCurrencyLimits.batchItems ||
      (items.length > 0 && (await batchFull(ctx)))
    )
      return { items, history, isDone: false };
    items.push(item);
    history.push(...(await historyToConvert(ctx, item._id)));
  }
  return { items, history, isDone: true };
}

/** Where a pass has got to once it took `item`. */
const cursorAt = (item: Doc<"items">) => ({
  creationTime: item._creationTime,
  itemId: item._id,
});

/**
 * The next batch of a change converting in the background: Items with their
 * history, checked or converted as its phase says, and then the next batch,
 * the switch to the new currency, or, when an amount wouldn't fit, the change
 * called off. The batch reads where it stands from the database, so running
 * it again (resumeStalled) never converts anything twice.
 */
export const continueChange = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const progress = await progressOf(ctx, userId);
    // Done or called off already.
    if (!progress) return null;
    const user = await ctx.db.get("users", userId);
    const change = user?.homeCurrencyChange;
    // Waiting for the person to try again.
    if (change?.state === "stalled") return null;
    // The account was deleted meanwhile.
    if (change?.state !== "converting") {
      await ctx.db.delete("homeCurrencyChanges", progress._id);
      return null;
    }
    const batch = await nextBatch(ctx, userId, progress.cursor);
    const converted = convertBatch(batch, change.rate, change.to);
    if (progress.phase === "converting") await writeConverted(ctx, converted);
    const last = batch.items.at(-1);
    const next = afterBatch(progress, {
      isDone: batch.isDone,
      continueCursor: last ? cursorAt(last) : progress.cursor,
      tooLarge: converted.tooLarge,
      anyAmount: converted.items.length > 0 || converted.history.length > 0,
    });
    if (next.step === "continue") {
      await ctx.db.patch("homeCurrencyChanges", progress._id, {
        ...next.progress,
        updatedAt: Date.now(),
        retries: 0,
      });
      await ctx.scheduler.runAfter(0, internal.homeCurrency.continueChange, {
        userId,
      });
      return null;
    }
    await ctx.db.delete("homeCurrencyChanges", progress._id);
    await ctx.db.patch(
      "users",
      userId,
      next.step === "finish"
        ? { homeCurrency: change.to, homeCurrencyChange: undefined }
        : {
            homeCurrencyChange: {
              state: "failed",
              to: change.to,
              reason: calledOffReasons.amountTooLarge,
            },
          },
    );
    return null;
  },
});

/** A change no batch has moved on for this long has stopped: a batch failed. */
const stalledAfterMs = 10 * 60 * 1000;

/**
 * Retries changes in the background that stopped moving, so a failed batch
 * runs again (crons.ts). Once a change's retries run out (`afterStall`), one
 * still checking is called off, and one part-way through converting waits
 * for the person to try again (`retryChange`).
 */
export const resumeStalled = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const stalled = await ctx.db
      .query("homeCurrencyChanges")
      .withIndex("by_waiting_and_updatedAt", (q) =>
        q.eq("waiting", false).lt("updatedAt", now - stalledAfterMs),
      )
      .take(100);
    for (const progress of stalled) {
      const user = await ctx.db.get("users", progress.userId);
      const change = user?.homeCurrencyChange;
      if (change?.state !== "converting") {
        await ctx.db.delete("homeCurrencyChanges", progress._id);
        continue;
      }
      const next = afterStall(progress);
      console.warn(
        `Home currency change ${progress._id} stopped while ${progress.phase}: ${next.step}`,
      );
      if (next.step === "retry") {
        await ctx.db.patch("homeCurrencyChanges", progress._id, {
          retries: progress.retries + 1,
          updatedAt: now,
        });
        await ctx.scheduler.runAfter(0, internal.homeCurrency.continueChange, {
          userId: progress.userId,
        });
      } else if (next.step === "cancel") {
        await ctx.db.delete("homeCurrencyChanges", progress._id);
        await ctx.db.patch("users", progress.userId, {
          homeCurrencyChange: {
            state: "failed",
            to: change.to,
            reason: calledOffReasons.stopped,
          },
        });
      } else {
        await ctx.db.patch("homeCurrencyChanges", progress._id, {
          waiting: true,
          updatedAt: now,
        });
        await ctx.db.patch("users", progress.userId, {
          homeCurrencyChange: { ...change, state: "stalled" },
        });
      }
    }
    return null;
  },
});

/** Starts a change that stopped part-way again, from where it stopped. */
export const retryChange = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const owner = await requireSetUpUser(ctx);
    const change = owner.homeCurrencyChange;
    const progress = await progressOf(ctx, owner._id);
    if (change?.state !== "stalled" || !progress) return null;
    await ctx.db.patch("users", owner._id, {
      homeCurrencyChange: { ...change, state: "converting" },
    });
    await ctx.db.patch("homeCurrencyChanges", progress._id, {
      waiting: false,
      retries: 0,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.homeCurrency.continueChange, {
      userId: owner._id,
    });
    return null;
  },
});

/** Forgets a change that was called off, once the app has said so. */
export const dismissFailure = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const owner = await requireSetUpUser(ctx);
    if (owner.homeCurrencyChange?.state === "failed")
      await ctx.db.patch("users", owner._id, {
        homeCurrencyChange: undefined,
      });
    return null;
  },
});
