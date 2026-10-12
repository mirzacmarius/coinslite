import type { PaginationOptions } from "convex/server";

/**
 * The app's `paginationOpts`, held to at most `numItems` documents and, when
 * given, `bytes` of them, however many it asks for, so no client can make a
 * page read past a query's limits. Everything else (the cursors, the
 * client's page id) is passed on unchanged.
 *
 * A byte cap makes a page of large documents shorter rather than the query
 * fail: Convex ends the page early, or has the app split it in two.
 */
export const capped = (
  paginationOpts: PaginationOptions,
  { numItems, bytes }: { numItems: number; bytes?: number },
): PaginationOptions => ({
  ...paginationOpts,
  numItems: Math.min(paginationOpts.numItems, numItems),
  ...(bytes !== undefined && {
    maximumBytesRead: Math.min(paginationOpts.maximumBytesRead ?? bytes, bytes),
  }),
});
