/**
 * Limits of the Collection exports, shared with the app's Export menu. Pure.
 */

/**
 * How many Items one Collection PDF lists: some hundred pages, as many as a
 * printout is any use at. A larger view is turned away, to be narrowed with
 * filters (the CSV covers any view).
 */
export const collectionPdfLimits = { items: 5_000 } as const;

export const collectionExportErrors = {
  /** The view holds more Items than one PDF lists. */
  tooManyItems: "TOO_MANY_ITEMS_FOR_PDF",
} as const;
