import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireOwnItem } from "./items";
import {
  photoErrors,
  photoLimits,
  photoSignatureLength,
  photoType,
} from "./photos/rules";
import { requireSetUpUser } from "./utils/auth";
import { photoSide } from "./utils/validators";

/** Where each side's photo is kept on the Item. */
const photoFields = { front: "frontPhoto", back: "backPhoto" } as const;

const urlOf = async (ctx: QueryCtx, photo: Id<"_storage"> | undefined) =>
  photo ? await ctx.storage.getUrl(photo) : null;

/** How long after uploading a file it can still become a photo. */
const uploadLifetime = 60 * 60 * 1000;

/**
 * One of the caller's Items, and a file they may put on it: a fresh upload
 * that isn't already a photo of any Item. A file id alone is no key to a file
 * someone else stored.
 */
async function checkUpload(
  ctx: QueryCtx | MutationCtx,
  { itemId, storageId }: { itemId: Id<"items">; storageId: Id<"_storage"> },
  now: number,
) {
  const item = await requireOwnItem(ctx, itemId);
  const stored = await ctx.db.system.get("_storage", storageId);
  const file =
    stored && stored._creationTime > now - uploadLifetime ? stored : null;
  const onAnItem =
    (await ctx.db
      .query("items")
      .withIndex("by_frontPhoto", (q) => q.eq("frontPhoto", storageId))
      .first()) ??
    (await ctx.db
      .query("items")
      .withIndex("by_backPhoto", (q) => q.eq("backPhoto", storageId))
      .first());
  if (!file || onAnItem) throw new ConvexError(photoErrors.notFound);
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

/** A one-time address the browser sends a photo file to before `attach`. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireSetUpUser(ctx);
    return await ctx.storage.generateUploadUrl();
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
    const { size }: { size: number } = await ctx.runQuery(
      internal.photos.upload,
      { itemId, storageId, now: Date.now() },
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

/** The size of an upload the caller may put on their Item. */
export const upload = internalQuery({
  args: { ...uploadArgs, now: v.number() },
  returns: v.object({ size: v.number() }),
  handler: async (ctx, { now, ...upload }) => {
    const { file } = await checkUpload(ctx, upload, now);
    return { size: file.size };
  },
});

/** Throws away an upload that was rejected. */
export const discard = internalMutation({
  args: uploadArgs,
  returns: v.null(),
  handler: async (ctx, upload) => {
    await checkUpload(ctx, upload, Date.now());
    await ctx.storage.delete(upload.storageId);
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

/** Links to an Item's photos, for its owner only; null for anyone else's Item. */
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
      front: await urlOf(ctx, item.frontPhoto),
      back: await urlOf(ctx, item.backPhoto),
    };
  },
});
