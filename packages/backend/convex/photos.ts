import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  type QueryCtx,
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { requireOwnItem } from "./items";
import { ensurePhotoLinks, photoLink } from "./photos/links";
import {
  photoErrors,
  photoLimits,
  photoSignatureLength,
  photoType,
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

/** Where each side's photo is kept on the Item. */
const photoFields = { front: "frontPhoto", back: "backPhoto" } as const;

const linkOf = async (
  ctx: QueryCtx,
  ownerId: Id<"users">,
  photo: Id<"_storage"> | undefined,
) => (photo ? await photoLink(ctx, ownerId, photo) : null);

/**
 * One of the caller's Items, and a file they may put on it: a fresh upload
 * registered to them for a photo (utils/files.ts), that isn't already a photo
 * of any Item or a Catalog image.
 */
async function checkUpload(
  ctx: QueryCtx,
  { itemId, storageId }: { itemId: Id<"items">; storageId: Id<"_storage"> },
  now: number,
) {
  const item = await requireOwnItem(ctx, itemId);
  const file = await ownUpload(ctx, storageId, item.ownerId, "photo", now);
  if (!file) throw new ConvexError(photoErrors.notFound);
  return { item, file };
}

/** Why an uploaded file can't be a photo, or undefined when it can. */
async function photoProblem(
  ctx: ActionCtx,
  storageId: Id<"_storage">,
  size: number,
) {
  if (size > photoLimits.bytes) return photoErrors.tooLarge;
  const file = await ctx.storage.get(storageId);
  if (!file) return photoErrors.notFound;
  const head = await file.slice(0, photoSignatureLength).arrayBuffer();
  return photoType(new Uint8Array(head)) ? undefined : photoErrors.notAnImage;
}

/**
 * A one-time address the browser sends a photo file to before `register`,
 * at most a few dozen an hour per person.
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

const uploadArgs = { itemId: v.id("items"), storageId: v.id("_storage") };

/**
 * Puts an uploaded file on one side of one of the caller's Items, replacing
 * the photo that was there. The file must be a JPEG, PNG, WebP or GIF (judged
 * by its content) of at most 10 MB; anything else is thrown away.
 */
export const attach = action({
  args: { ...uploadArgs, side: photoSide },
  returns: v.null(),
  handler: async (ctx, { itemId, side, storageId }) => {
    const { size }: { size: number } = await ctx.runMutation(
      internal.photos.claim,
      { itemId, storageId },
    );
    const problem = await photoProblem(ctx, storageId, size);
    if (problem) {
      await ctx.runMutation(internal.photos.discard, { itemId, storageId });
      throw new ConvexError(problem);
    }
    await ctx.runMutation(internal.photos.save, { itemId, side, storageId });
    return null;
  },
});

/**
 * Registers the upload to the caller if nobody has yet, and returns the size
 * of this upload they may put on their Item.
 */
export const claim = internalMutation({
  args: uploadArgs,
  returns: v.object({ size: v.number() }),
  handler: async (ctx, upload) => {
    const item = await requireOwnItem(ctx, upload.itemId);
    const now = Date.now();
    await claimUpload(ctx, upload.storageId, item.ownerId, "photo", now);
    const { file } = await checkUpload(ctx, upload, now);
    return { size: file.size };
  },
});

/** Throws away an upload of the caller's that was rejected. */
export const discard = internalMutation({
  args: uploadArgs,
  returns: v.null(),
  handler: async (ctx, upload) => {
    await checkUpload(ctx, upload, Date.now());
    await discardUpload(ctx, upload.storageId);
    return null;
  },
});

/** Makes a checked upload the photo of one side, deleting the one it replaces. */
export const save = internalMutation({
  args: { ...uploadArgs, side: photoSide },
  returns: v.null(),
  handler: async (ctx, { side, ...upload }) => {
    const { item } = await checkUpload(ctx, upload, Date.now());
    const field = photoFields[side];
    const replaced = item[field];
    if (replaced) await ctx.storage.delete(replaced);
    await ctx.db.patch(item._id, { [field]: upload.storageId });
    await settleUpload(ctx, upload.storageId);
    await ensurePhotoLinks(ctx);
    return null;
  },
});

/** Removes the photo of one side of the caller's Item, file and all. */
export const remove = mutation({
  args: { itemId: v.id("items"), side: photoSide },
  returns: v.null(),
  handler: async (ctx, { itemId, side }) => {
    const item = await requireOwnItem(ctx, itemId);
    const field = photoFields[side];
    const photo = item[field];
    if (photo) {
      await ctx.storage.delete(photo);
      await ctx.db.patch(itemId, { [field]: undefined });
    }
    return null;
  },
});

/**
 * Links to an Item's photos, for its owner only; null for anyone else's Item.
 * Each works for an hour at most; this query hands out fresh ones in time.
 */
export const ofItem = query({
  args: { itemId: v.id("items") },
  returns: v.union(
    v.null(),
    v.object({
      front: v.union(v.string(), v.null()),
      back: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { itemId }) => {
    const owner = await requireSetUpUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.ownerId !== owner._id) return null;
    return {
      front: await linkOf(ctx, owner._id, item.frontPhoto),
      back: await linkOf(ctx, owner._id, item.backPhoto),
    };
  },
});
