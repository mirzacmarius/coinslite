import { type GradingScale, type ItemType, suitsGrade } from "./grades";

/**
 * Acting on several Items at once (spec 5.x, MUS-739), and undoing a move or
 * a grading (COIN-120). Pure, so the app shares the limit with the backend.
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
