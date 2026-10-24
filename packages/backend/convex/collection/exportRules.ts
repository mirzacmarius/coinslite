/**
 * Limits of the Collection exports, shared with the app's Print menu and
 * Account's export. Pure.
 */

/**
 * How many Items one Collection PDF lists: some hundred pages, as many as a
 * printout is any use at. A larger view is turned away, to be narrowed with
 * filters (the CSV covers the whole Collection).
 */
export const collectionPdfLimits = { items: 5_000 } as const;

export const collectionExportErrors = {
  /** The view holds more Items than one PDF lists. */
  tooManyItems: "TOO_MANY_ITEMS_FOR_PDF",
  /**
   * The Collection is too large to read in one go, so an export couldn't be
   * sure to hold every Item of the view. Refused rather than cut short.
   */
  incomplete: "COLLECTION_TOO_LARGE_TO_EXPORT",
} as const;
