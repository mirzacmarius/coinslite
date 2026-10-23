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
  /** Whether the totals were last left open; unset until someone chooses. */
  totalsOpen?: boolean;
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
      ...(typeof value.totalsOpen === "boolean" && {
        totalsOpen: value.totalsOpen,
      }),
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
 * search or any other filter. The totals then lead with the view's figures,
 * as the sold view alone has its own whole (the sold totals).
 */
export function narrowsBeyondStatus(view: CollectionView) {
  return Object.entries(view).some(
    ([key, value]) => key !== "sort" && key !== "status" && value !== undefined,
  );
}

/** The browser window's viewport (`innerWidth` × `innerHeight`), in CSS pixels. */
export type ViewportSize = { width: number; height: number };

/**
 * The smallest viewport the totals start open in: below it, the open totals
 * would push the Item list out of view. `CollectionTotalsSection` repeats it
 * in CSS for the first paint.
 */
const roomyViewport: ViewportSize = { width: 1024, height: 1000 };

/**
 * Whether the Collection page shows its totals open. A searched or filtered
 * view keeps them collapsed, so a link to one shows its Items first;
 * otherwise they're as this device last left them, else open only in a
 * viewport wide and tall enough for the list to still start in view.
 * Undefined while the viewport isn't known yet (on the server), when the
 * page's CSS decides by the same size.
 */
export function totalsOpen(
  display: CollectionDisplay,
  {
    narrowed,
    viewport,
  }: { narrowed: boolean; viewport: ViewportSize | undefined },
) {
  if (narrowed) return false;
  if (display.totalsOpen !== undefined) return display.totalsOpen;
  if (viewport === undefined) return undefined;
  return (
    viewport.width >= roomyViewport.width &&
    viewport.height >= roomyViewport.height
  );
}
