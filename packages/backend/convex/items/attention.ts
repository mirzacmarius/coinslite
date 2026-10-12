import type { ItemType } from "./grades";

/**
 * What an owned Item can lack that the Overview points out (spec 9): a
 * Market value, a photo, or for a coin or banknote a Grade. Pure, so the
 * Overview's counts and the Collection's filter for each (collection/view.ts
 * `without`) agree on exactly which Items they mean.
 */

/** What the counts read of an Item. */
export type AttentionItem = {
  type: ItemType;
  marketValue?: number;
  grade?: string;
  /** Set once the Item is sold: it then needs nothing. */
  soldOn?: string;
  /** Whether the Item has any photo: of a side, or one of its more photos. */
  hasPhoto: boolean;
};

/**
 * Whether an Item has a photo of either side. One without may still have
 * more photos (the itemPhotos table), which count as photos too.
 */
export const hasSidePhoto = (item: {
  frontPhoto?: string;
  backPhoto?: string;
}) => item.frontPhoto !== undefined || item.backPhoto !== undefined;

/** What an Item can lack, in the order the Overview lists them. */
export const attentionKinds = ["marketValue", "photo", "grade"] as const;
export type AttentionKind = (typeof attentionKinds)[number];

/** How many Items lack each. */
export type NeedsAttention = Record<AttentionKind, number>;

/** Whether an Item lacks this. Stamps have no Grade to lack. */
export function lacks(kind: AttentionKind, item: AttentionItem) {
  switch (kind) {
    case "marketValue":
      return item.marketValue === undefined;
    case "photo":
      return !item.hasPhoto;
    case "grade":
      return item.type !== "stamp" && item.grade === undefined;
  }
}

/**
 * How many of these Items lack a Market value, a photo or a Grade, counting
 * only those still owned.
 */
export function needsAttention(items: Iterable<AttentionItem>): NeedsAttention {
  const counts: NeedsAttention = { marketValue: 0, photo: 0, grade: 0 };
  for (const item of items) {
    if (item.soldOn !== undefined) continue;
    for (const kind of attentionKinds) if (lacks(kind, item)) counts[kind] += 1;
  }
  return counts;
}

/** What two pages of Items need, added up. */
export function combineNeedsAttention(
  a: NeedsAttention,
  b: NeedsAttention,
): NeedsAttention {
  return {
    marketValue: a.marketValue + b.marketValue,
    photo: a.photo + b.photo,
    grade: a.grade + b.grade,
  };
}
