"use node";

import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, action } from "./_generated/server";
import { photoErrors, photoSignatureLength, photoType } from "./photos/rules";
import {
  type ScanPhoto,
  lookupWords,
  scannerLimits,
  suggestionFrom,
} from "./scanner/rules";
import { coinVision } from "./scanner/vision";
import { material } from "./utils/validators";

/**
 * Scanning a coin (spec §16): the vision model reads two photos, the Catalog
 * offers the entries the coin might be, and the model picks the one it is.
 * The scan only suggests; the person reviews the suggestion in the Item form
 * before anything is saved, and the photos become the Item's.
 */

const unidentified = { outcome: "unidentified" as const };

/** A photo the caller uploaded, as the vision model takes it. */
async function scanPhoto(
  ctx: ActionCtx,
  storageId: Id<"_storage">,
): Promise<ScanPhoto> {
  const file = await ctx.storage.get(storageId);
  if (!file) throw new ConvexError(photoErrors.notFound);
  if (file.size > scannerLimits.photoBytes)
    throw new ConvexError(photoErrors.tooLarge);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = photoType(bytes.subarray(0, photoSignatureLength));
  if (!mediaType) throw new ConvexError(photoErrors.notAnImage);
  return { mediaType, base64: Buffer.from(bytes).toString("base64") };
}

/** Logs a vision request that failed in a way the model adapter didn't expect; the scan goes on without it. */
const answerOrNull = <T>(question: Promise<T | null>) =>
  question.catch((failure: unknown) => {
    console.error("Scanner: the vision model failed", failure);
    return null;
  });

/**
 * Scans the front and back photos the caller just uploaded and registered
 * (photos.register). Suggests the Catalog entry the coin is, or the facts
 * read from it when no entry matches; "unidentified" when the model can't
 * tell, declines, times out or answers nonsense; "notConfigured" on a
 * deployment without the model's key. Throws SCANNER_NOT_AVAILABLE for
 * anyone the scanner flag (and Premium, during the beta) leaves out, and
 * TOO_MANY_SCANS past the pace allowed.
 */
export const identify = action({
  args: { front: v.id("_storage"), back: v.id("_storage") },
  returns: v.union(
    v.object({
      outcome: v.literal("suggested"),
      title: v.string(),
      entry: v.optional(v.object({ key: v.string(), title: v.string() })),
      facts: v.object({
        country: v.optional(v.string()),
        year: v.optional(v.number()),
        denomination: v.optional(v.string()),
        series: v.optional(v.string()),
        material: v.optional(material),
        mintMark: v.optional(v.string()),
        ruler: v.optional(v.string()),
        diameter: v.optional(v.number()),
      }),
    }),
    v.object({ outcome: v.literal("unidentified") }),
    v.object({ outcome: v.literal("notConfigured") }),
  ),
  handler: async (ctx, { front, back }) => {
    const scan = await ctx.runMutation(internal.scanner.begin, {
      front,
      back,
    });
    if (!scan.configured) return { outcome: "notConfigured" as const };
    const photos = {
      front: await scanPhoto(ctx, front),
      back: await scanPhoto(ctx, back),
    };
    const vision = coinVision();
    const reading = await answerOrNull(vision.read(photos, scan.language));
    if (!reading?.isCoin) return unidentified;

    const candidates = scan.catalogVisible
      ? await ctx.runQuery(internal.scanner.candidates, {
          words: lookupWords(reading),
          reading,
        })
      : [];
    const picked =
      candidates.length > 0
        ? await answerOrNull(vision.pick(reading, candidates))
        : null;
    const entry = candidates.find(({ key }) => key === picked) ?? null;

    const today = new Date().toISOString().slice(0, 10);
    const suggestion = suggestionFrom(reading, entry, today);
    return suggestion
      ? { outcome: "suggested" as const, ...suggestion }
      : unidentified;
  },
});
