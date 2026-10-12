/** Changing the Home currency. Pure, so the Account screen shares it with the backend. */

import type { HomeCurrency } from "@coinslite/i18n";
import { ConvexError, type Infer, v } from "convex/values";
import {
  type ItemMoneyField,
  itemLimits,
  itemMoneyFields,
} from "../items/rules";
import { homeCurrency } from "../utils/validators";

export const homeCurrencyErrors = {
  /** The new Home currency is the current one. */
  sameCurrency: "SAME_CURRENCY",
  /** There are amounts to convert but no stored exchange rate yet. */
  rateUnavailable: "RATE_UNAVAILABLE",
  /** The stored rate isn't the one the person confirmed: it was refreshed meanwhile. */
  rateChanged: "RATE_CHANGED",
  /** A converted amount would go past the largest amount an Item may hold. */
  amountTooLarge: "AMOUNT_TOO_LARGE",
  /**
   * The Home currency is being changed in the background: until it's done,
   * anything that writes an amount, the files that list amounts (the
   * Collection exports, the Insurance report) and another change wait.
   */
  changing: "HOME_CURRENCY_CHANGING",
  /**
   * Amounts were entered in a Home currency that's no longer the person's:
   * it changed while the form was open, so they'd be stored unconverted.
   */
  otherCurrency: "HOME_CURRENCY_CHANGED",
} as const;

/** Why a change was called off before it converted anything. */
export const calledOffReasons = {
  /** An amount would be too large in the new currency. */
  amountTooLarge: "AMOUNT_TOO_LARGE",
  /** Its check kept failing. */
  stopped: "STOPPED",
} as const;

/**
 * A change of the Home currency too large for one go, on the person's profile
 * (`homeCurrencyChange` in schema.ts). While "converting", their amounts are
 * converted in the background to `to` at the `rate` they confirmed. "stalled"
 * when it stopped part-way and its retries ran out, until they try again.
 * Either way, edits that write amounts and another change wait. "failed"
 * when it was called off before converting anything, until the app has said
 * so.
 */
export const homeCurrencyChange = v.union(
  v.object({
    state: v.union(v.literal("converting"), v.literal("stalled")),
    to: homeCurrency,
    rate: v.number(),
  }),
  v.object({
    state: v.literal("failed"),
    to: homeCurrency,
    reason: v.union(
      v.literal(calledOffReasons.amountTooLarge),
      v.literal(calledOffReasons.stopped),
    ),
  }),
);

/** What the person's profile says about their Home currency. */
type HomeCurrencyState = {
  homeCurrency?: HomeCurrency;
  homeCurrencyChange?: Infer<typeof homeCurrencyChange>;
};

/** Whether a Home currency change is under way, so writes of amounts wait. */
export const changingHomeCurrency = (
  user: Pick<HomeCurrencyState, "homeCurrencyChange">,
) =>
  user.homeCurrencyChange?.state === "converting" ||
  user.homeCurrencyChange?.state === "stalled";

/**
 * Turns away what has to wait while a change is under way (`changing`):
 * writes of amounts, and the files that list them (the Collection exports,
 * the Insurance report), which would mix two currencies.
 */
export function refuseWhileChanging(
  user: Pick<HomeCurrencyState, "homeCurrencyChange">,
) {
  if (changingHomeCurrency(user))
    throw new ConvexError(homeCurrencyErrors.changing);
}

/**
 * Checks a write of amounts: turned away while a change is under way
 * (`changing`), or when they were entered in a Home currency the person no
 * longer has (`otherCurrency`). `enteredIn` is the currency the form showed
 * them in; older apps don't send it.
 */
export function checkAmountsWrite(
  user: HomeCurrencyState,
  enteredIn: HomeCurrency | undefined,
) {
  refuseWhileChanging(user);
  if (enteredIn !== undefined && enteredIn !== user.homeCurrency)
    throw new ConvexError(homeCurrencyErrors.otherCurrency);
}

/** The amounts on one Item, or a form's, by money field. */
type Amounts = Partial<Record<ItemMoneyField, number>>;

/** The money fields that hold an amount. */
export const amountFields = (fields: Amounts) =>
  itemMoneyFields.filter((field) => fields[field] !== undefined);

/** Whether any money field holds an amount. */
export const holdsAmount = (fields: Amounts) => amountFields(fields).length > 0;

export const homeCurrencyLimits = {
  /**
   * The most Items a change converts in one go, in the transaction that
   * confirms it, as before changes could run in the background: inside the
   * database's per-transaction read and write limits. A larger Collection
   * is converted in the background.
   */
  oneGoItems: 5000,
  /** The most Market value history points a change converts in one go, likewise. */
  oneGoHistoryPoints: 5000,
  /**
   * The most Items a background batch takes. A batch also stops early once
   * it has used a share of the transaction's limits (homeCurrency.ts).
   */
  batchItems: 200,
  /**
   * The most history points one Item's are read as. History keeps at most a
   * point a month, so no Item comes near; one past it fails the batch rather
   * than convert part of a history.
   */
  itemHistoryPoints: 2000,
  /** How many times a change that stopped moving is retried before it's called off or waits. */
  retries: 3,
} as const;

/**
 * Whether a Collection is too large to convert in one go, given what was read
 * of it: its Items and its Market value history points, each read as far as
 * one past the most one go converts. Every point read counts, with a Market
 * value or without: reading past the limit means some points went unread,
 * and those may have one, so one go would convert only part of the history.
 */
export const tooLargeForOneGo = (read: {
  items: readonly unknown[];
  history: readonly { marketValue?: number }[];
}) =>
  read.items.length > homeCurrencyLimits.oneGoItems ||
  read.history.length > homeCurrencyLimits.oneGoHistoryPoints;

/**
 * A batch of the Collection converted at `rate`, the exchange rate the person
 * confirmed: every amount on its Items and every Market value in their
 * history, in whole minor units of the new currency. Every Home currency has
 * 100 minor units, so a converted amount rounds to the nearest one in any of
 * them. Items and points without an amount aren't written. `tooLarge` says a
 * converted amount would go past the largest an Item may hold.
 */
export function convertBatch<ItemId, PointId>(
  batch: {
    items: readonly ({ _id: ItemId } & Amounts)[];
    history: readonly { _id: PointId; marketValue?: number }[];
  },
  rate: number,
) {
  let tooLarge = false;
  const convert = (amount: number) => {
    const converted = Math.round(amount * rate);
    if (converted > itemLimits.amount) tooLarge = true;
    return converted;
  };
  const items: { _id: ItemId; amounts: Amounts }[] = [];
  for (const item of batch.items) {
    const fields = amountFields(item);
    if (fields.length === 0) continue;
    const amounts: Amounts = {};
    for (const field of fields) amounts[field] = convert(item[field] as number);
    items.push({ _id: item._id, amounts });
  }
  const history: { _id: PointId; marketValue: number }[] = [];
  for (const point of batch.history) {
    if (point.marketValue === undefined) continue;
    history.push({ _id: point._id, marketValue: convert(point.marketValue) });
  }
  return { items, history, tooLarge };
}

/**
 * Where a pass over a person's Items has got to: the last Item it took, by
 * its place in the `by_ownerId` index (when it was created, then its id).
 */
export const itemCursor = v.object({
  creationTime: v.number(),
  itemId: v.id("items"),
});

/**
 * How far a change converting in the background has got. A pass over the
 * Items first checks every amount fits in the new currency, noting whether
 * there's any amount at all; then, if there is, a second converts them.
 * Each batch takes Items in order, with their history.
 */
export const changeProgress = v.object({
  phase: v.union(v.literal("checking"), v.literal("converting")),
  /** Where this phase's pass has got to; null at its start. */
  cursor: v.union(v.null(), itemCursor),
  /** Whether the check pass has met an amount so far. */
  anyAmount: v.boolean(),
});
export type ChangeProgress<Cursor = Infer<typeof itemCursor>> = Omit<
  Infer<typeof changeProgress>,
  "cursor"
> & { cursor: Cursor | null };

/**
 * What follows a batch: the next one, from where it stopped; switching to
 * the new currency, once every amount is converted (or the check found
 * none); or calling the change off, when an amount wouldn't fit, before
 * anything is converted.
 */
export function afterBatch<Cursor>(
  progress: ChangeProgress<Cursor>,
  batch: {
    isDone: boolean;
    /** Where the batch stopped. */
    continueCursor: Cursor | null;
    tooLarge: boolean;
    /** Whether the batch met an amount. */
    anyAmount: boolean;
  },
):
  | { step: "continue"; progress: ChangeProgress<Cursor> }
  | { step: "finish" }
  | { step: "cancel" } {
  if (progress.phase === "converting") {
    // Once converting has begun it goes on to the end: the check pass found
    // every amount fits, and edits that write amounts wait meanwhile.
    if (batch.isDone) return { step: "finish" };
    return {
      step: "continue",
      progress: {
        phase: "converting",
        cursor: batch.continueCursor,
        anyAmount: progress.anyAmount,
      },
    };
  }
  if (batch.tooLarge) return { step: "cancel" };
  const anyAmount = progress.anyAmount || batch.anyAmount;
  if (!batch.isDone)
    return {
      step: "continue",
      progress: { phase: "checking", cursor: batch.continueCursor, anyAmount },
    };
  return anyAmount
    ? {
        step: "continue",
        progress: { phase: "converting", cursor: null, anyAmount },
      }
    : { step: "finish" };
}

/**
 * What follows when a change stopped moving (a batch kept failing): another
 * try, up to `homeCurrencyLimits.retries`; then, while still checking,
 * calling it off, since nothing is converted yet; or, part-way through
 * converting, waiting for the person to try again, since a Collection half
 * converted can only be finished, not undone.
 */
export function afterStall(stall: {
  phase: ChangeProgress["phase"];
  retries: number;
}): { step: "retry" } | { step: "cancel" } | { step: "wait" } {
  if (stall.retries < homeCurrencyLimits.retries) return { step: "retry" };
  return stall.phase === "checking" ? { step: "cancel" } : { step: "wait" };
}
