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
import { scanVision } from "./scanner/vision";
import { catalogItemType, gradingScale, material } from "./utils/validators";

/**
 * Scanning a coin or banknote (spec §16): the vision model reads two photos,
 * the Catalog offers the entries it might be, and the model picks the one
 * it is. The scan only suggests; the person reviews the suggestion, its
 * Grade marked as from the photos, in the Item form before anything is
 * saved, and the photos become the Item's.
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
 * (photos.register). Suggests whether it's a coin or a banknote, the
 * Catalog entry it is, or the facts read from it when no entry matches, and
 * the Grade the photos show; "unidentified" when the model can't tell,
 * declines, times out or answers nonsense; "notConfigured" on a deployment
 * without the model's key. Throws SCANNER_NOT_AVAILABLE for anyone the
 * scanner flag (and Premium, during the beta) leaves out, and
 * TOO_MANY_SCANS past the pace allowed.
 */
export const identify = action({
  args: { front: v.id("_storage"), back: v.id("_storage") },
  returns: v.union(
    v.object({
      outcome: v.literal("suggested"),
      itemType: catalogItemType,
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
        serialNumber: v.optional(v.string()),
        signatures: v.optional(v.string()),
        printer: v.optional(v.string()),
      }),
      grade: v.optional(v.object({ scale: gradingScale, value: v.string() })),
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
    const vision = scanVision();
    const reading = await answerOrNull(vision.read(photos, scan.language));
    if (!reading?.itemType) return unidentified;

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
