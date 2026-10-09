import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** How long after uploading a file it can still be put to use. */
export const uploadLifetime = 60 * 60 * 1000;

/**
 * A stored file someone may put to use: a fresh upload that is neither an
 * Item's photo nor a Catalog entry's image yet. A file id alone is no key to
 * a file someone else stored, and removing one thing's file never takes
 * another's with it. Null when it can't be used.
 */
export async function freshUpload(
  ctx: QueryCtx,
  storageId: Id<"_storage">,
  now: number,
) {
  const stored = await ctx.db.system.get("_storage", storageId);
  if (!stored || stored._creationTime <= now - uploadLifetime) return null;
  const inUse =
    (await ctx.db
      .query("items")
      .withIndex("by_frontPhoto", (q) => q.eq("frontPhoto", storageId))
      .first()) ??
    (await ctx.db
      .query("items")
      .withIndex("by_backPhoto", (q) => q.eq("backPhoto", storageId))
      .first()) ??
    (await ctx.db
      .query("catalogNodes")
      .withIndex("by_imageFiles_full", (q) =>
        q.eq("imageFiles.full", storageId),
      )
      .first()) ??
    (await ctx.db
      .query("catalogNodes")
      .withIndex("by_imageFiles_thumbnail", (q) =>
        q.eq("imageFiles.thumbnail", storageId),
      )
      .first());
  return inUse ? null : stored;
}
