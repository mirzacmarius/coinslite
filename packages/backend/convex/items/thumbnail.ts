import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { photoLink } from "../photos/links";

/**
 * An Item with its list thumbnail: a link to the front photo, else the back
 * photo, else null. Only for the owner's own Items (photos/links.ts).
 */
export async function withThumbnail(ctx: QueryCtx, item: Doc<"items">) {
  const photo = item.frontPhoto ?? item.backPhoto;
  return {
    ...item,
    thumbnailUrl: photo ? await photoLink(ctx, item.ownerId, photo) : null,
  };
}
