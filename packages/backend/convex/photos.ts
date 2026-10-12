import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { requireOwnItem } from "./items";
import { ensurePhotoLinks, photoLink } from "./photos/links";
import {
  isPhotoSide,
  photoErrors,
  photoLimits,
  photoSignatureLength,
  photoType,
  thumbnailProblem,
} from "./photos/rules";
import { limitUploads } from "./uploads";
import { requireSetUpUser } from "./utils/auth";
import {
  claimUpload,
  discardUpload,
  ownUpload,
  settleUpload,
} from "./utils/files";
import { photoSide } from "./utils/validators";

/** Where each side's photo and its thumbnail are kept on the Item. */
const sideFields = {
  front: { photo: "frontPhoto", thumbnail: "frontThumbnail" },
  back: { photo: "backPhoto", thumbnail: "backThumbnail" },
} as const;

/** Deletes the stored files given, skipping the ones that aren't there. */
async function deleteFiles(
  ctx: MutationCtx,
  files: (Id<"_storage"> | undefined)[],
) {
  for (const file of files) if (file) await ctx.storage.delete(file);
}

/** An Item's more photos, in the order they were added. */
const morePhotosOf = (ctx: QueryCtx, itemId: Id<"items">) =>
  ctx.db
    .query("itemPhotos")
    .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
    .take(photoLimits.more);

const linkOf = async (
  ctx: QueryCtx,
  ownerId: Id<"users">,
  photo: Id<"_storage"> | undefined,
) => (photo ? await photoLink(ctx, ownerId, photo) : null);

/** A photo the caller uploaded for an Item, with the thumbnail uploaded with it. */
type Upload = {
  itemId: Id<"items">;
  storageId: Id<"_storage">;
  thumbnailId?: Id<"_storage">;
};

/** The files of an upload: the photo, and its thumbnail if it came with one. */
const filesOf = ({ storageId, thumbnailId }: Upload) =>
  thumbnailId ? [storageId, thumbnailId] : [storageId];

/**
 * One of the caller's Items, and files they may put on it: fresh uploads
 * registered to them for a photo (utils/files.ts), that aren't already a
 * photo or thumbnail of any Item or a Catalog image. The thumbnail, if any,
 * is a file of its own.
 */
async function checkUpload(ctx: QueryCtx, upload: Upload, now: number) {
  const item = await requireOwnItem(ctx, upload.itemId);
  const own = (file: Id<"_storage">) =>
    ownUpload(ctx, file, item.ownerId, "photo", now);
  const file = await own(upload.storageId);
  const thumbnail =
    upload.thumbnailId === undefined
      ? undefined
      : await own(upload.thumbnailId);
  if (!file || thumbnail === null || upload.thumbnailId === upload.storageId)
    throw new ConvexError(photoErrors.notFound);
  return { item, file, thumbnail };
}

/** The first bytes of a stored file, enough to tell its format; undefined when it's gone. */
async function headOf(ctx: ActionCtx, storageId: Id<"_storage">) {
  const file = await ctx.storage.get(storageId);
  if (!file) return undefined;
  return new Uint8Array(
    await file.slice(0, photoSignatureLength).arrayBuffer(),
  );
}

/** Why an uploaded file can't be a photo, or undefined when it can. */
async function photoProblem(
  ctx: ActionCtx,
  storageId: Id<"_storage">,
  size: number,
) {
  if (size > photoLimits.bytes) return photoErrors.tooLarge;
  const head = await headOf(ctx, storageId);
  if (!head) return photoErrors.notFound;
  return photoType(head) ? undefined : photoErrors.notAnImage;
}

/** Why an uploaded file can't be a photo's thumbnail, or undefined when it can. */
async function storedThumbnailProblem(
  ctx: ActionCtx,
  storageId: Id<"_storage">,
  size: number,
) {
  const head = await headOf(ctx, storageId);
  if (!head) return photoErrors.notFound;
  return thumbnailProblem(head, size);
}

/**
 * A one-time address the browser sends a photo file, or a photo's thumbnail,
 * to before `register`, at most a few dozen an hour per person (uploads.ts).
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await requireSetUpUser(ctx);
    await limitUploads(ctx, user._id);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Registers a file the caller just uploaded as their photo upload, so nobody
 * else can use it or have it thrown away. `attach` registers one that isn't
 * yet; the app registers right after uploading.
 */
export const register = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { storageId }) => {
    const user = await requireSetUpUser(ctx);
    if (!(await claimUpload(ctx, storageId, user._id, "photo", Date.now())))
      throw new ConvexError(photoErrors.notFound);
    return null;
  },
});

const uploadArgs = {
  itemId: v.id("items"),
  storageId: v.id("_storage"),
  /**
   * The photo's thumbnail, uploaded with it. Optional so an app version from
   * before thumbnails still works: its photos list as themselves.
   */
  thumbnailId: v.optional(v.id("_storage")),
};
/** A side of the Item, or, left out, one more photo after the sides. */
const placeArgs = { side: v.optional(photoSide) };

/**
 * Puts an uploaded file on one of the caller's Items, with the thumbnail the
 * browser made of it: on one side, replacing the photo (and thumbnail) that
 * was there, or, without a side, as one more photo after the sides (at most
 * `photoLimits.more` of those). The photo must be a JPEG, PNG, WebP or GIF
 * (judged by its content) of at most 10 MB, and the thumbnail a small WebP
 * or JPEG (photos/rules.ts thumbnailProblem); anything else is thrown away.
 */
export const attach = action({
  args: { ...uploadArgs, ...placeArgs },
  returns: v.null(),
  handler: async (ctx, { side, ...upload }) => {
    const claimed: { size: number; thumbnailSize?: number; problem?: string } =
      await ctx.runMutation(internal.photos.claim, { ...upload, side });
    const problem =
      claimed.problem ??
      (await photoProblem(ctx, upload.storageId, claimed.size)) ??
      (upload.thumbnailId && claimed.thumbnailSize !== undefined
        ? await storedThumbnailProblem(
            ctx,
            upload.thumbnailId,
            claimed.thumbnailSize,
          )
        : undefined);
    if (problem) {
      await ctx.runMutation(internal.photos.discard, upload);
      throw new ConvexError(problem);
    }
    try {
      await ctx.runMutation(internal.photos.save, { ...upload, side });
    } catch (failure) {
      // Another photo got in between the room check and the save.
      await ctx.runMutation(internal.photos.discard, upload);
      throw failure;
    }
    return null;
  },
});

/** Whether the Item can take one more photo after its sides. */
async function hasRoomForMore(ctx: QueryCtx, itemId: Id<"items">) {
  const more = await morePhotosOf(ctx, itemId);
  return more.length < photoLimits.more;
}

/**
 * Registers the upload's files to the caller if nobody has yet, and returns
 * the sizes of the photo and thumbnail they may put on their Item, with the
 * problem when the Item has no room for one more photo (the action then
 * throws the upload away).
 */
export const claim = internalMutation({
  args: { ...uploadArgs, ...placeArgs },
  returns: v.object({
    size: v.number(),
    thumbnailSize: v.optional(v.number()),
    problem: v.optional(v.literal(photoErrors.tooManyPhotos)),
  }),
  handler: async (ctx, { side, ...upload }) => {
    const item = await requireOwnItem(ctx, upload.itemId);
    const now = Date.now();
    for (const file of filesOf(upload))
      await claimUpload(ctx, file, item.ownerId, "photo", now);
    const { file, thumbnail } = await checkUpload(ctx, upload, now);
    const full = !side && !(await hasRoomForMore(ctx, item._id));
    return {
      size: file.size,
      ...(thumbnail && { thumbnailSize: thumbnail.size }),
      ...(full && { problem: photoErrors.tooManyPhotos }),
    };
  },
});

/** Throws away an upload of the caller's that was rejected, thumbnail and all. */
export const discard = internalMutation({
  args: uploadArgs,
  returns: v.null(),
  handler: async (ctx, upload) => {
    await checkUpload(ctx, upload, Date.now());
    for (const file of filesOf(upload)) await discardUpload(ctx, file);
    return null;
  },
});

/**
 * Makes a checked upload the photo of one side, with its thumbnail, deleting
 * the photo and thumbnail it replaces, or, without a side, one more photo of
 * the Item.
 */
export const save = internalMutation({
  args: { ...uploadArgs, ...placeArgs },
  returns: v.null(),
  handler: async (ctx, { side, ...upload }) => {
    const { item } = await checkUpload(ctx, upload, Date.now());
    if (side) {
      const fields = sideFields[side];
      await deleteFiles(ctx, [item[fields.photo], item[fields.thumbnail]]);
      // A photo without a thumbnail leaves none of the one it replaces.
      await ctx.db.patch(item._id, {
        [fields.photo]: upload.storageId,
        [fields.thumbnail]: upload.thumbnailId,
      });
    } else {
      if (!(await hasRoomForMore(ctx, item._id)))
        throw new ConvexError(photoErrors.tooManyPhotos);
      await ctx.db.insert("itemPhotos", {
        itemId: item._id,
        ownerId: item.ownerId,
        storageId: upload.storageId,
        ...(upload.thumbnailId && { thumbnailId: upload.thumbnailId }),
      });
    }
    for (const file of filesOf(upload)) await settleUpload(ctx, file);
    await ensurePhotoLinks(ctx);
    return null;
  },
});

/**
 * Removes a photo of the caller's Item, file and thumbnail and all: the one
 * on a side, or one of its more photos. A photo that isn't on this Item any
 * more is left be.
 */
export const remove = mutation({
  args: {
    itemId: v.id("items"),
    photo: v.union(photoSide, v.id("itemPhotos")),
  },
  returns: v.null(),
  handler: async (ctx, { itemId, photo }) => {
    const item = await requireOwnItem(ctx, itemId);
    if (isPhotoSide(photo)) {
      const fields = sideFields[photo];
      const files = [item[fields.photo], item[fields.thumbnail]];
      if (files.some(Boolean)) {
        await deleteFiles(ctx, files);
        await ctx.db.patch(itemId, {
          [fields.photo]: undefined,
          [fields.thumbnail]: undefined,
        });
      }
      return null;
    }
    const more = await ctx.db.get(photo);
    if (more && more.itemId === item._id) {
      await deleteFiles(ctx, [more.storageId, more.thumbnailId]);
      await ctx.db.delete(more._id);
    }
    return null;
  },
});

/**
 * Links to an Item's photos, for its owner only; null for anyone else's Item:
 * the two sides, then its more photos in the order added. Each link works for
 * an hour at most; this query hands out fresh ones in time.
 */
export const ofItem = query({
  args: { itemId: v.id("items") },
  returns: v.union(
    v.null(),
    v.object({
      front: v.union(v.string(), v.null()),
      back: v.union(v.string(), v.null()),
      more: v.array(v.object({ id: v.id("itemPhotos"), url: v.string() })),
    }),
  ),
  handler: async (ctx, { itemId }) => {
    const owner = await requireSetUpUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.ownerId !== owner._id) return null;
    const more = [];
    for (const photo of await morePhotosOf(ctx, item._id)) {
      const url = await photoLink(ctx, owner._id, photo.storageId);
      if (url) more.push({ id: photo._id, url });
    }
    return {
      front: await linkOf(ctx, owner._id, item.frontPhoto),
      back: await linkOf(ctx, owner._id, item.backPhoto),
      more,
    };
  },
});
