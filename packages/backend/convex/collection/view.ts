import type { AttentionKind } from "../items/attention";
import type { GradingScale, ItemType } from "../items/grades";

/**
 * A view of the Collection: what a person searched for, how they narrowed it
 * and how it's sorted. The Collection page keeps it in the URL, and the
 * Collection exports cover the same view. Pure, so the app can read and
 * write it without loading the backend.
 */

/** The orders a Collection can be sorted in; `year` (oldest first) is the default. */
export const collectionSorts = [
  "year",
  "newest",
  "oldest",
  "price",
  "denomination",
  "grade",
] as const;
export type CollectionSort = (typeof collectionSorts)[number];
export const defaultSort: CollectionSort = "year";

/** How many Items one page of the Collection shows. */
export const pageSizes = [15, 25, 50] as const;
export type PageSize = (typeof pageSizes)[number];
export const defaultPageSize: PageSize = 25;

/** Longer searches are cut to this many characters. */
export const searchLimit = 100;

/** Where Items come from, against the person's own country. */
export const origins = ["own", "foreign"] as const;
export type Origin = (typeof origins)[number];

/** The Album filter's value for Items that aren't in any Album. */
export const withoutAlbum = "none";

export type CollectionView = {
  /** Words to find in the title, the denomination or the country's name. */
  search?: string;
  type?: ItemType;
  /** Only bullion coins. */
  bullionOnly?: boolean;
  origin?: Origin;
  /** An ISO country code. */
  country?: string;
  denomination?: string;
  grade?: { gradingScale: GradingScale; grade: string };
  /** An Album's id, or `withoutAlbum`. */
  album?: string;
  /**
   * An Album's id: leaves out the Items already in it, as when picking
   * Items to add to that Album.
   */
  notInAlbum?: string;
  /** A Catalog entry's key: only the Items made from it. */
  entry?: string;
  /**
   * Only the Items without a Market value, without any photo, or (coins and
   * banknotes) without a Grade, as the Overview counts them (items/attention.ts).
   */
  without?: AttentionKind;
  /** Only sold Items; owned ones when left out. */
  status?: "sold";
  sort?: CollectionSort;
};
