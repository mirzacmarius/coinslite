import { type SetProgress, combineSetProgress } from "../catalog/setProgress";
import { type NeedsAttention, combineNeedsAttention } from "../items/attention";

/**
 * The Overview reads a Collection a page of owned Items at a time
 * (overview.ts `attentionAndSetsPage`), as the totals do. Pure, so the app adds the pages up.
 */

/**
 * How many owned Items one page reads at most. Each Item may cost a few
 * lookups (a more photo, its Catalog entry, that entry's Set and the
 * grouping above it), so a page stays well inside a query's limits.
 */
export const OVERVIEW_PAGE_SIZE = 250;

/** What one page of Items, or all of them, tells the Overview. */
export type OverviewPage = {
  needsAttention: NeedsAttention;
  setProgress: SetProgress;
};

/** Two pages' findings as one. */
export function combineOverviewPages(
  a: OverviewPage,
  b: OverviewPage,
): OverviewPage {
  return {
    needsAttention: combineNeedsAttention(a.needsAttention, b.needsAttention),
    setProgress: combineSetProgress(a.setProgress, b.setProgress),
  };
}
