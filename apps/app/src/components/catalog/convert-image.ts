import {
  catalogImageErrors,
  catalogImageLimits,
  fitWithin,
} from "@coinslite/backend/convex/catalog/imageRules";
import {
  photoSignatureLength,
  photoType,
} from "@coinslite/backend/convex/photos/rules";
import { ConvexError } from "convex/values";

type Size = { width: number; height: number };

/** A Catalog image ready to upload: WebP at full size and as a thumbnail. */
export type ConvertedImage = {
  full: Blob;
  thumbnail: Blob;
  fullSize: Size;
  thumbnailSize: Size;
};

/** WebP quality for both sizes: small files that still show a coin's detail. */
const quality = 0.85;

/** Draws a picture at `size` and writes it as WebP. */
async function encode(picture: CanvasImageSource, size: Size) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new ConvexError(catalogImageErrors.webpUnsupported);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(picture, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  // Browsers that can't write WebP hand back a PNG instead.
  if (!blob || blob.type !== "image/webp")
    throw new ConvexError(catalogImageErrors.webpUnsupported);
  return blob;
}

/**
 * Converts a picture an admin chose (JPEG, PNG, WebP or GIF, judged by its
 * content) to WebP in the browser, so the original never uploads: full size
 * with its longest side at most 800 px, and a thumbnail at most 128 px.
 * Smaller pictures keep their size. The server checks the result again.
 */
export async function convertToWebp(file: File): Promise<ConvertedImage> {
  if (file.size > catalogImageLimits.originalBytes)
    throw new ConvexError(catalogImageErrors.originalTooLarge);
  const head = await file.slice(0, photoSignatureLength).arrayBuffer();
  if (!photoType(new Uint8Array(head)))
    throw new ConvexError(catalogImageErrors.unreadable);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ConvexError(catalogImageErrors.unreadable);
  }
  try {
    const original = { width: bitmap.width, height: bitmap.height };
    const fullSize = fitWithin(original, catalogImageLimits.full);
    const thumbnailSize = fitWithin(original, catalogImageLimits.thumbnail);
    return {
      full: await encode(bitmap, fullSize),
      thumbnail: await encode(bitmap, thumbnailSize),
      fullSize,
      thumbnailSize,
    };
  } finally {
    bitmap.close();
  }
}
