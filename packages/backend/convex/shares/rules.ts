import type { Doc } from "../_generated/dataModel";
import { setIdOf } from "../catalog/setProgress";
import type { ShareTarget } from "../utils/validators";

/**
 * Share links (spec §8 and §6.4): a read-only page of one Album or Set for
 * whoever has the link. Pure, so the app and the backend agree on what the
 * page may show of an Item and on what a link looks like.
 */

export const shareErrors = {
  /** The share isn't the signed-in person's, or is gone. */
  notFound: "SHARE_NOT_FOUND",
  /** Only one's own Album, or a Set one can see, can be shared. */
  notShareable: "NOT_SHAREABLE",
} as const;

export const shareLimits = {
  /** Random bytes in a link's token; as hex, twice as many characters. */
  tokenBytes: 16,
  /** Items one page of a shared Album holds, however many the app asks for. */
  pageSize: 50,
  /**
   * Owned Items a shared Album's Market value is summed over, in the one
   * query that shows the Album. Past that the total is left out.
   */
  valuedItems: 2000,
} as const;

/** The path a share link opens in the app, before the token: /s/<token>. */
export const sharePath = "/s";

/** Whether a text is a token as `shares.ts` makes them: `tokenBytes` bytes as lowercase hex. */
export const isShareToken = (text: string) =>
  new RegExp(`^[0-9a-f]{${shareLimits.tokenBytes * 2}}$`).test(text);

/** The link to a shared page, at the app's origin. */
export const shareLink = (origin: string, token: string) =>
  `${origin}${sharePath}/${token}`;

/**
 * What tells one share's target from another's, so an Album or a Set has
 * one share: the Album's id, or the Set's id (catalog/setProgress.ts).
 */
export const targetIdOf = (target: ShareTarget) =>
  target.kind === "album" ? target.albumId : setIdOf(target);

/**
 * The Item fields a shared page shows, chosen one by one. Everything else
 * about an Item (what it cost and where it came from, where it's kept, the
 * notes, certificate and serial numbers, the full-size photos, the Catalog
 * link) stays with its owner; the Market value shows only when the owner
 * turned values on.
 */
export const sharedItemFields = [
  "type",
  "title",
  "country",
  "year",
  "denomination",
  "series",
  "material",
  "grade",
  "gradingScale",
  "strike",
  "quantity",
] as const;

/** An Item as `sharedItemOf` reads it: its facts resolved, with its list thumbnail. */
export type ShareableItem = Pick<
  Doc<"items">,
  "_id" | "marketValue" | (typeof sharedItemFields)[number]
> & { thumbnailUrl: string | null };

/** An Item as the shared page shows it. */
export type SharedItem = Pick<
  Doc<"items">,
  (typeof sharedItemFields)[number]
> & {
  id: Doc<"items">["_id"];
  /** Per piece, as the Item records it; only while the share shows values. */
  marketValue?: number;
  thumbnailUrl: string | null;
};

/** The shared view of an Item: `sharedItemFields`, and its Market value when `showValues`. */
export function sharedItemOf(
  item: ShareableItem,
  showValues: boolean,
): SharedItem {
  const shown: SharedItem = {
    id: item._id,
    type: item.type,
    title: item.title,
    quantity: item.quantity,
    thumbnailUrl: item.thumbnailUrl,
  };
  for (const field of sharedItemFields) {
    const value = item[field];
    if (value !== undefined) Object.assign(shown, { [field]: value });
  }
  if (showValues && item.marketValue !== undefined)
    shown.marketValue = item.marketValue;
  return shown;
}
