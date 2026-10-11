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
 * Whether the Collection page shows its totals open. A searched or filtered
 * view keeps them collapsed, so a link to one shows its Items first;
 * otherwise they're as this device last left them, else collapsed on a
 * phone and open on anything wider. Undefined while the screen size isn't
 * known yet (on the server), when the page's CSS decides by width.
 */
export function totalsOpen(
  display: CollectionDisplay,
  { narrowed, phone }: { narrowed: boolean; phone: boolean | undefined },
) {
  if (narrowed) return false;
  if (display.totalsOpen !== undefined) return display.totalsOpen;
  return phone === undefined ? undefined : !phone;
}
