import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/** An Item with its list thumbnail: the front photo, else the back photo, else null. */
export async function withThumbnail(ctx: QueryCtx, item: Doc<"items">) {
  const photo = item.frontPhoto ?? item.backPhoto;
  return {
    ...item,
    thumbnailUrl: photo ? await ctx.storage.getUrl(photo) : null,
  };
}
