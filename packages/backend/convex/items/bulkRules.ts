/**
 * Acting on several Items at once (spec 5.x, MUS-739). Pure, so the app
 * shares the limit with the backend.
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
