import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { photoLink } from "../photos/links";
import { listImageFile } from "../photos/rules";
import schema from "../schema";

/** An Item as `withThumbnail` returns it, for return validators. */
export const itemWithThumbnail = schema
  .doc("items")
  .extend({ thumbnailUrl: v.union(v.string(), v.null()) });

/**
 * An Item with its list thumbnail: a link to the small copy of its front
 * photo, else of its back photo, else of the first of its more photos, or to
 * the photo itself when it predates thumbnails; null without photos (see
 * `listImageFile`). Only for the owner's own Items (photos/links.ts).
 */
export async function withThumbnail(ctx: QueryCtx, item: Doc<"items">) {
  // The more photos only count without a side photo, so they're read only then.
  const firstMore =
    item.frontPhoto || item.backPhoto
      ? undefined
      : await ctx.db
          .query("itemPhotos")
          .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
          .first();
  const file = listImageFile(item, firstMore ?? undefined);
  return {
    ...item,
    thumbnailUrl: file ? await photoLink(ctx, item.ownerId, file) : null,
  };
}
