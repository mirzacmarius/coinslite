import { ConvexError } from "convex/values";
import { type PurchasePaid, paidStorable } from "../exchangeRates/rules";
import { type GradingScale, type ItemType, suitsGrade } from "./grades";
import { type PurchaseInput, checkPurchase, purchaseFields } from "./rules";
import { checkTags, withTag, withoutTag } from "./tags";

/**
 * Acting on several Items at once (spec 7, MUS-739), undoing a move or a
 * grading (COIN-120), setting a bought lot's purchase on them, which can be
 * undone too (COIN-119), and adding or taking off a tag (COIN-194). Pure, so the app shares the limit with the
 * backend.
 */

export const bulkLimits = {
  /**
   * Items one bulk action changes, at most: the same as adding from a Set.
   * Moving reads and writes each Item once and each Album's count once;
   * deleting writes each Item, its few photos and its counts. Both stay far
   * inside what one mutation may read and write.
   */
  items: 200,
} as const;

export const bulkErrors = {
  /** More Items than one bulk action takes. */
  tooManyItems: "TOO_MANY_ITEMS",
  /** A Set purchase with none of its fields filled in: nothing to set. */
  emptyPurchase: "EMPTY_PURCHASE",
} as const;

/**
 * Plans undoing a move: each Item the move took (`before`, with the Album it
 * was in) goes back to that Album, or to none. One already where the move put
 * it (`after`) wasn't changed by it and is left out. One deleted (missing
 * from `now`) or no longer where the move put it has changed since, and one
 * whose Album is no longer among `albums` has nowhere to go back to: both are
 * skipped and counted.
 */
export function planMoveUndo<ItemId, AlbumId>({
  before,
  after,
  now,
  albums,
}: {
  before: ReadonlyArray<{ itemId: ItemId; albumId?: AlbumId }>;
  after: { albumId?: AlbumId };
  now: ReadonlyMap<ItemId, { albumId?: AlbumId }>;
  albums: ReadonlySet<AlbumId>;
}) {
  const moved = firstOfEach(before).filter(
    ({ albumId }) => albumId !== after.albumId,
  );
  const restore = moved
    .filter(({ itemId, albumId }) => {
      const item = now.get(itemId);
      return (
        item !== undefined &&
        item.albumId === after.albumId &&
        (albumId === undefined || albums.has(albumId))
      );
    })
    .map(({ itemId, albumId }) => ({ itemId, albumId }));
  return { restore, skipped: moved.length - restore.length };
}

/** An Item's Grade with its Grading scale; neither when it has no Grade. */
type ItemGrade = { gradingScale?: GradingScale; grade?: string };

/** Whether two are the same Grade on the same scale, or both no Grade. */
const sameGrade = (a: ItemGrade, b: ItemGrade) =>
  a.gradingScale === b.gradingScale && a.grade === b.grade;

/**
 * Whether an Item of this type can have this Grade back: no Grade, or one on
 * a scale that suits the type, as the Item form checks (items/rules.ts).
 */
const canHaveGrade = (type: ItemType, { gradingScale, grade }: ItemGrade) =>
  grade === undefined ||
  (gradingScale !== undefined && suitsGrade(type, gradingScale, grade));

/**
 * Plans undoing a bulk grading: each Item graded (`before`, with the Grade
 * and Grading scale it had) gets them back, or no Grade. One that already had
 * the Grade set (`after`) wasn't changed by it and is left out. One deleted
 * (missing from `now`) or no longer with the Grade set has changed since,
 * and one whose own Grade no longer suits its Item type can't have it back:
 * both are skipped and counted.
 */
export function planGradeUndo<ItemId>({
  before,
  after,
  now,
}: {
  before: ReadonlyArray<{ itemId: ItemId } & ItemGrade>;
  after: Required<ItemGrade>;
  now: ReadonlyMap<ItemId, ItemGrade & { type: ItemType }>;
}) {
  const regraded = firstOfEach(before).filter(
    (item) => !sameGrade(item, after),
  );
  const restore = regraded
    .filter(({ itemId, ...was }) => {
      const item = now.get(itemId);
      return (
        item !== undefined &&
        sameGrade(item, after) &&
        canHaveGrade(item.type, was)
      );
    })
    .map(({ itemId, gradingScale, grade }) => ({
      itemId,
      // A scale without a Grade isn't kept, as the Item form has it.
      gradingScale: grade === undefined ? undefined : gradingScale,
      grade,
    }));
  return { restore, skipped: regraded.length - restore.length };
}

/**
 * What Set purchase writes on each selected Item (COIN-119): the Purchase
 * price per piece, purchase date and source filled in, checked as the Item
 * form checks them (items/rules.ts). A field left empty isn't in it, so each
 * Item keeps its own; with every field empty there's nothing to set.
 */
export function purchasePatch(input: PurchaseInput, today: string) {
  const patch = checkPurchase(input, today);
  if (Object.keys(patch).length === 0)
    throw new ConvexError(bulkErrors.emptyPurchase);
  return patch;
}

/**
 * A purchase as Set purchase writes and undoes it: the fields of
 * `purchaseFields`, with a purchase in another currency going with the
 * Purchase price (exchangeRates/rules.ts).
 */
export type PurchaseState = PurchaseInput & { purchasePaid?: PurchasePaid };

/** Two purchases in another currency alike; none and none are alike. */
const samePaidRecord = (
  a: PurchasePaid | undefined,
  b: PurchasePaid | undefined,
) =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.amount === b.amount &&
    a.currency === b.currency &&
    a.rateDay === b.rateDay);

/**
 * Plans undoing a Set purchase: each Item it was set on (`before`, with the
 * purchase it had) gets back its own value, or none, for each field the
 * purchase set (`after`); the fields it left alone aren't touched. A
 * Purchase price set goes with its purchase in another currency, or with
 * none: both come back together. One that already had those values wasn't
 * changed by it and is left out. One deleted (missing from `now`) or no
 * longer holding the values set has changed since, and one whose own values
 * the Item form wouldn't store as they are (`today` being the latest
 * purchase date) can't have them back: both are skipped and counted.
 */
export function planPurchaseUndo<ItemId>({
  before,
  after,
  now,
  today,
}: {
  before: ReadonlyArray<{ itemId: ItemId } & PurchaseState>;
  after: PurchaseState;
  now: ReadonlyMap<ItemId, PurchaseState>;
  today: string;
}) {
  const fields = purchaseFields.filter((field) => after[field] !== undefined);
  const setsPrice = after.purchasePrice !== undefined;
  const holdsSet = (item: PurchaseState) =>
    fields.every((field) => item[field] === after[field]) &&
    (!setsPrice || samePaidRecord(item.purchasePaid, after.purchasePaid));
  const changed = firstOfEach(before).filter((item) => !holdsSet(item));
  const restore = changed
    .map((was) => ({
      itemId: was.itemId,
      // Each field set, even one the Item had no value for: that clears it.
      ...(Object.fromEntries(
        fields.map((field) => [field, was[field]]),
      ) as PurchaseInput),
      ...(setsPrice && { purchasePaid: was.purchasePaid }),
    }))
    .filter(({ itemId, purchasePaid, ...own }) => {
      const item = now.get(itemId);
      return (
        item !== undefined &&
        holdsSet(item) &&
        storable(own, today) &&
        paidStorable(purchasePaid, today)
      );
    });
  return { restore, skipped: changed.length - restore.length };
}

/** Whether the Item form would store this purchase just as it is (items/rules.ts). */
function storable(purchase: PurchaseInput, today: string) {
  try {
    const checked: PurchaseInput = checkPurchase(purchase, today);
    return purchaseFields.every((field) => checked[field] === purchase[field]);
  } catch {
    return false;
  }
}

/** Two lists of tags alike, in the same order; none and an empty list are alike. */
const sameTags = (
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
) =>
  (a?.length ?? 0) === (b?.length ?? 0) &&
  (a ?? []).every((tag, index) => tag === b?.[index]);

/** Whether tags are as `checkTags` stores them: what an undo may write back. */
function storableTags(tags: string[] | undefined) {
  try {
    return sameTags(checkTags(tags), tags);
  } catch {
    return false;
  }
}

/**
 * Plans undoing a tag added (or, with `remove`, taken off): each Item it
 * changed (`before`, with the tags it had) gets those tags back if its tags
 * are still what the change left. One deleted (missing from `now`) or
 * tagged differently since is skipped and counted.
 */
export function planTagUndo<ItemId>({
  before,
  tag,
  remove,
  now,
}: {
  before: ReadonlyArray<{ itemId: ItemId; tags?: string[] }>;
  tag: string;
  remove: boolean;
  now: ReadonlyMap<ItemId, { tags?: string[] }>;
}) {
  const changed = firstOfEach(before);
  const restore = changed.filter(({ itemId, tags }) => {
    const item = now.get(itemId);
    const left = remove ? withoutTag(tags, tag) : withTag(tags, tag);
    return (
      item !== undefined &&
      left !== null &&
      sameTags(item.tags, left) &&
      storableTags(tags)
    );
  });
  return {
    restore: restore.map(({ itemId, tags }) => ({ itemId, tags })),
    skipped: changed.length - restore.length,
  };
}

/** Each Item once, as first listed, so none is restored twice. */
function firstOfEach<Listed extends { itemId: unknown }>(
  listed: readonly Listed[],
) {
  const seen = new Set<Listed["itemId"]>();
  return listed.filter(({ itemId }) => {
    if (seen.has(itemId)) return false;
    seen.add(itemId);
    return true;
  });
}
