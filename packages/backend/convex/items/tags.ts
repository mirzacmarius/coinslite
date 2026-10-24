import { ConvexError } from "convex/values";

/**
 * Tags: the person's own words on an Item, several per Item ("For sale",
 * "Out for grading", "Inherited"), to find and narrow the Collection by.
 * A tag is a word or a few, without commas or semicolons, since those part
 * tags where they're typed and in the CSV files. Pure, so the app checks tags as the
 * backend does.
 */

export const tagLimits = {
  /** Tags on one Item. */
  perItem: 10,
  /** Characters in one tag. */
  length: 40,
  /** The person's tags the Item form and the filter offer, most used first. */
  offered: 100,
} as const;

export const tagErrors = {
  tooMany: "TOO_MANY_TAGS",
  tooLong: "TAG_TOO_LONG",
  /** A tag to add or take off that's empty once cleaned. */
  required: "TAG_REQUIRED",
} as const;

/**
 * Tags that differ only in capitals, accents or spacing are one tag: the
 * Collection filters by it and an Item holds it once.
 */
export const tagKey = (tag: string) =>
  tag
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/**
 * A tag as stored: trimmed, single spaces, commas and semicolons turned into
 * spaces, so a tag comes back whole from the CSV (`splitTags`).
 */
export const cleanTag = (tag: string) =>
  tag.replace(/[,;]/g, " ").trim().replace(/\s+/g, " ");

/** Tags as typed in one text: parted at commas (and semicolons, as some files write them). */
export const splitTags = (text: string) =>
  text
    .split(/[,;]/)
    .map(cleanTag)
    .filter((tag) => tag !== "");

/** Whether these tags hold this one. */
export const hasTag = (tags: readonly string[] | undefined, tag: string) =>
  tags?.some((held) => tagKey(held) === tagKey(tag)) ?? false;

/**
 * An Item's tags as stored: each cleaned, empty ones left out, each tag
 * once (as first written), in the order given; undefined for none. Too
 * many or too long a tag is refused.
 */
export function checkTags(tags: readonly string[] | undefined) {
  const kept: string[] = [];
  for (const tag of tags ?? []) {
    const clean = cleanTag(tag);
    if (clean === "" || hasTag(kept, clean)) continue;
    if (clean.length > tagLimits.length)
      throw new ConvexError(tagErrors.tooLong);
    kept.push(clean);
  }
  if (kept.length > tagLimits.perItem) throw new ConvexError(tagErrors.tooMany);
  return kept.length > 0 ? kept : undefined;
}

/**
 * The tags after adding one: unchanged (null) when the Item already has it
 * or has no room for another.
 */
export function withTag(tags: readonly string[] | undefined, tag: string) {
  if (hasTag(tags, tag) || (tags?.length ?? 0) >= tagLimits.perItem)
    return null;
  return [...(tags ?? []), tag];
}

/** The tags after taking one off: unchanged (null) when the Item doesn't have it. */
export function withoutTag(tags: readonly string[] | undefined, tag: string) {
  if (!hasTag(tags, tag)) return null;
  const left = (tags ?? []).filter((held) => tagKey(held) !== tagKey(tag));
  return left.length > 0 ? left : undefined;
}
