import {
  photoErrors,
  photoSignatureLength,
  photoType,
} from "@coinslite/backend/convex/photos/rules";
import { scannerLimits } from "@coinslite/backend/convex/scanner/rules";
import { ConvexError } from "convex/values";

/** JPEG qualities tried in turn until the photo is small enough to scan. */
const qualities = [0.9, 0.8, 0.7, 0.6];

/**
 * A photo of a coin made small enough to scan, in the browser: a JPEG whose
 * longest side is at most `scannerLimits.photoPixels`. Phone cameras take far
 * larger photos than a coin needs. The result also becomes the Item's photo.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const head = await file.slice(0, photoSignatureLength).arrayBuffer();
  if (!photoType(new Uint8Array(head)))
    throw new ConvexError(photoErrors.notAnImage);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ConvexError(photoErrors.notAnImage);
  }
  const scale = Math.min(
    1,
    scannerLimits.photoPixels / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new ConvexError(photoErrors.notAnImage);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of qualities) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= scannerLimits.photoBytes) return blob;
  }
  throw new ConvexError(photoErrors.tooLarge);
}
