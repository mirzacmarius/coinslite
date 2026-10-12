import type { GradingScale } from "./grades";

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
 * it (`done`) wasn't changed by it and is left out. One deleted (missing from
 * `now`) or no longer where the move put it has changed since, and one whose
 * Album is no longer among `albums` has nowhere to go back to: both are
 * skipped and counted.
 */
export function planMoveUndo<ItemId, AlbumId>({
  before,
  done,
  now,
  albums,
}: {
  before: ReadonlyArray<{ itemId: ItemId; albumId?: AlbumId }>;
  done: { albumId?: AlbumId };
  now: ReadonlyMap<ItemId, { albumId?: AlbumId }>;
  albums: ReadonlySet<AlbumId>;
}) {
  const moved = firstOfEach(before).filter(
    ({ albumId }) => albumId !== done.albumId,
  );
  const restore = moved
    .filter(({ itemId, albumId }) => {
      const item = now.get(itemId);
      return (
        item !== undefined &&
        item.albumId === done.albumId &&
        (albumId === undefined || albums.has(albumId))
      );
    })
    .map(({ itemId, albumId }) => ({ itemId, albumId }));
  return { restore, skipped: moved.length - restore.length };
}

/** An Item's Grade on its Grading scale; both or neither are set. */
type GradeState = { gradingScale?: GradingScale; grade?: string };

const sameGrade = (a: GradeState, b: GradeState) =>
  a.gradingScale === b.gradingScale && a.grade === b.grade;

/**
 * Plans undoing a bulk grading: each Item graded (`before`, with the Grade
 * and Grading scale it had) gets them back, or no Grade. One that already had
 * the Grade set (`done`) wasn't changed by it and is left out. One deleted
 * (missing from `now`) or no longer with the Grade set has changed since:
 * it's skipped and counted.
 */
export function planGradeUndo<ItemId>({
  before,
  done,
  now,
}: {
  before: ReadonlyArray<{ itemId: ItemId } & GradeState>;
  done: Required<GradeState>;
  now: ReadonlyMap<ItemId, GradeState>;
}) {
  const regraded = firstOfEach(before).filter((item) => !sameGrade(item, done));
  const restore = regraded
    .filter(({ itemId }) => {
      const item = now.get(itemId);
      return item !== undefined && sameGrade(item, done);
    })
    .map(({ itemId, gradingScale, grade }) => ({
      itemId,
      gradingScale,
      grade,
    }));
  return { restore, skipped: regraded.length - restore.length };
}

/** Each Item once, as first listed, so none is restored twice. */
function firstOfEach<Entry extends { itemId: unknown }>(
  entries: readonly Entry[],
) {
  const seen = new Set<Entry["itemId"]>();
  return entries.filter(({ itemId }) => {
    if (seen.has(itemId)) return false;
    seen.add(itemId);
    return true;
  });
}
