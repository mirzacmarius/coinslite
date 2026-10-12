import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, internalMutation } from "./_generated/server";
import { uploadErrors } from "./photos/rules";
import { discardUpload, fileInUse, uploadLifetime } from "./utils/files";

/**
 * Uploads that haven't become an Item's photo or a Catalog entry's image
 * (utils/files.ts has the rules for using one): how fast people may upload,
 * and the hourly clean-up of uploads nobody used.
 */

/**
 * Each photo and each Catalog image is two uploads (the file and its
 * thumbnail): 30 in a row, then 60 an hour.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  upload: { kind: "token bucket", rate: 120, period: HOUR, capacity: 60 },
});

/** Counts one upload address against the person's pace; throws past it. */
export async function limitUploads(ctx: MutationCtx, userId: Id<"users">) {
  const { ok } = await rateLimiter.limit(ctx, "upload", { key: userId });
  if (!ok) throw new ConvexError(uploadErrors.tooMany);
}

/** How many uploads one clean-up transaction looks at. */
const sweepBatch = 100;
/** How far back past its lifetime the clean-up looks for files nobody registered. */
const sweepWindow = 3 * HOUR;

/**
 * Deletes uploads that outlived their hour unused (crons.ts): those someone
 * registered, and files uploaded in the hours before that nobody did. Photos,
 * their thumbnails, Catalog images and older files are left alone
 * (utils/files.ts fileInUse). Continues in further
 * transactions while there's more.
 */
export const sweep = internalMutation({
  args: { filesAfter: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { filesAfter }) => {
    const expired = Date.now() - uploadLifetime;
    const registered = await ctx.db
      .query("uploads")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", expired))
      .take(sweepBatch);
    for (const upload of registered) await discardUpload(ctx, upload.storageId);

    const from = filesAfter ?? expired - sweepWindow;
    const files = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) =>
        q.gt("_creationTime", from).lt("_creationTime", expired),
      )
      .take(sweepBatch);
    for (const file of files) {
      const registration = await ctx.db
        .query("uploads")
        .withIndex("by_storageId", (q) => q.eq("storageId", file._id))
        .unique();
      if (!registration && !(await fileInUse(ctx, file._id)))
        await ctx.storage.delete(file._id);
    }

    if (registered.length === sweepBatch || files.length === sweepBatch) {
      await ctx.scheduler.runAfter(0, internal.uploads.sweep, {
        filesAfter:
          files.length === sweepBatch ? files.at(-1)?._creationTime : from,
      });
    }
    return null;
  },
});

/** Deletes up to `budget` of a person's registered, unused uploads; returns how many. */
export async function deleteUploadsOf(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  budget: number,
) {
  const uploads = await ctx.db
    .query("uploads")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
    .take(budget);
  for (const upload of uploads) await discardUpload(ctx, upload.storageId);
  return uploads.length;
}
