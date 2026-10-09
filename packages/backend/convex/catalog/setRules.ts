/**
 * Sets (spec 6.4) and adding many Catalog entries at once (spec 6.2). Pure,
 * so the app shares the limits and the completion maths with the backend.
 */

export const setLimits = {
  /** Catalog entries one add makes Items of, at most. */
  bulkAdd: 200,
  /**
   * Sets with more entries than this open showing only what's missing.
   */
  missingOnlyAbove: 40,
  /**
   * The most entries a Set may have to be viewed as one: the Set view reads
   * every entry, with how many of each the person holds, in one query. The
   * largest Set in the Catalog, the 2-euro commemoratives Theme, has about
   * 600; a grouping larger than this is viewed through the Sets below it.
   */
  entries: 1000,
  /**
   * Catalog nodes (entries and the groupings between them) one Set view
   * reads, at most. Empty groupings are passed over, so every grouping
   * walked has an entry below it, at most 7 levels up (catalogLimits.depth):
   * a Set within `entries` never needs more than 8 nodes per entry, leaving
   * room for as many empty groupings as entries besides.
   */
  nodes: 9000,
} as const;

export const setErrors = {
  /** More Catalog entries than one add takes. */
  tooManyEntries: "TOO_MANY_ENTRIES",
  /** An entry the person already holds, without allowing a duplicate. */
  alreadyHeld: "ALREADY_HELD",
} as const;

/** Whether a grouping with this many entries below it can be viewed as a Set. */
export const isSet = (entryCount: number) =>
  entryCount > 1 && entryCount <= setLimits.entries;

/**
 * How complete a Set is: how many of its entries the person holds at least
 * one Item of, out of all of them, and that as a whole percentage. The
 * percentage rounds down, so 100% means nothing is missing.
 */
export function completion(held: number, total: number) {
  return {
    held,
    total,
    percent: total === 0 ? 0 : Math.floor((held * 100) / total),
  };
}

/** Whether a Set opens showing only the entries the person is missing. */
export const opensMissingOnly = (total: number) =>
  total > setLimits.missingOnlyAbove;
