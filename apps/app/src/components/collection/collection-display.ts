import {
  type CollectionView,
  type PageSize,
  defaultPageSize,
  pageSizes,
} from "@coinslite/backend/convex/collection/view";

/** How the Collection is laid out: rows or cards. */
export const collectionLayouts = ["list", "grid"] as const;
export type CollectionLayout = (typeof collectionLayouts)[number];

/** How this device shows the Collection page (spec 7). */
export type CollectionDisplay = {
  layout: CollectionLayout;
  pageSize: PageSize;
};

const defaults: CollectionDisplay = {
  layout: "list",
  pageSize: defaultPageSize,
};

/** What this device remembers, or the defaults; never throws. */
export function readDisplay(stored: string | null): CollectionDisplay {
  try {
    const value = JSON.parse(stored ?? "{}") as Partial<CollectionDisplay>;
    return {
      layout: collectionLayouts.includes(value.layout as CollectionLayout)
        ? (value.layout as CollectionLayout)
        : defaults.layout,
      pageSize: pageSizes.includes(value.pageSize as PageSize)
        ? (value.pageSize as PageSize)
        : defaults.pageSize,
    };
  } catch {
    return defaults;
  }
}

/** Whether the view searches or filters, rather than showing every Item. */
export function narrowsView(view: CollectionView) {
  return Object.entries(view).some(
    ([key, value]) => key !== "sort" && value !== undefined,
  );
}

/**
 * Whether the view narrows the list beyond choosing owned or sold Items: a
 * search or any other filter. The summary strip then sums the view's Items,
 * as the sold view alone has its own whole (the sold totals).
 */
export function narrowsBeyondStatus(view: CollectionView) {
  return Object.entries(view).some(
    ([key, value]) => key !== "sort" && key !== "status" && value !== undefined,
  );
}
