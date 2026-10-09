import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { moveBetweenAlbums } from "../albums/membership";
import { countItemRemoved } from "../collectionCounts";

/**
 * Deletes an Item for good, together with its stored photos, and takes it
 * out of its Album's Item count and its owner's Collection counts. The one
 * way to delete Items: deleting one Item, an Album with chosen Items, or a
 * whole account all go through here so no photo is left behind and nothing
 * miscounts.
 *
 * It checks nothing: the caller has already made sure the Item is the
 * signed-in person's (or that the whole account is going).
 */
export async function deleteItem(ctx: MutationCtx, item: Doc<"items">) {
  for (const photo of [item.frontPhoto, item.backPhoto]) {
    if (photo) await ctx.storage.delete(photo);
  }
  await moveBetweenAlbums(ctx, item.albumId, undefined);
  await ctx.db.delete(item._id);
  await countItemRemoved(ctx, item);
}
