import { fitWithin } from "@coinslite/backend/convex/catalog/imageRules";
import {
  photoLimits,
  photoSignatureLength,
  photoType,
  thumbnailTypes,
} from "@coinslite/backend/convex/photos/rules";

/**
 * Smaller copies of a picture, made in the browser before anything uploads:
 * Catalog images, scan photos and the thumbnails of Item photos. The server
 * checks every copy again.
 */

/** The formats a copy can be written in. */
export type ImageFormat = "image/webp" | "image/jpeg";

/** A smaller copy of a picture to make. */
export type ShrinkTarget = {
  /** Its longest side at most, in pixels. A smaller picture keeps its size: it's never scaled up. */
  longest: number;
  /** Its shortest side at most, in pixels, when that is smaller still. */
  shortest?: number;
  /** The formats to write it in, preferred first: the first this browser can write is used. */
  types: readonly ImageFormat[];
  /** The qualities to try, best first, until the copy fits in `maxBytes`. */
  qualities: readonly number[];
  /** The most bytes the copy may take; any number without. */
  maxBytes?: number;
};

/** A copy made, with its size in pixels. */
export type ShrunkImage = { blob: Blob; width: number; height: number };

/**
 * Why a picture couldn't be shrunk: it isn't a JPEG, PNG, WebP or GIF this
 * browser can read ("unreadable"), the browser can't write any of a target's
 * formats ("unwritable"), or no quality makes a copy small enough
 * ("tooLarge").
 */
export class ShrinkError extends Error {
  constructor(readonly reason: "unreadable" | "unwritable" | "tooLarge") {
    super(`The picture couldn't be shrunk (${reason})`);
    this.name = "ShrinkError";
  }
}

/**
 * An Item photo's thumbnail, the copy lists and grids show: WebP, or JPEG in
 * browsers that can't write WebP (Safari), within the thumbnail limits.
 */
export const photoThumbnail: ShrinkTarget = {
  longest: photoLimits.thumbnailPixels,
  types: thumbnailTypes,
  qualities: [0.85, 0.7, 0.5],
  maxBytes: photoLimits.thumbnailBytes,
};

/**
 * Makes a smaller copy of a picture for each target, by name. The picture
 * must be a JPEG, PNG, WebP or GIF, judged by its content, whatever its name
 * says. Throws a `ShrinkError` when it can't.
 */
export async function shrinkImage<Name extends string>(
  picture: Blob,
  targets: Record<Name, ShrinkTarget>,
): Promise<Record<Name, ShrunkImage>> {
  const head = await picture.slice(0, photoSignatureLength).arrayBuffer();
  if (!photoType(new Uint8Array(head))) throw new ShrinkError("unreadable");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(picture);
  } catch {
    throw new ShrinkError("unreadable");
  }
  try {
    const copies = {} as Record<Name, ShrunkImage>;
    for (const name of Object.keys(targets) as Name[])
      copies[name] = await copyOf(bitmap, targets[name]);
    return copies;
  } finally {
    bitmap.close();
  }
}

/** Draws the picture at a target's size and writes it as the target asks. */
async function copyOf(
  bitmap: ImageBitmap,
  target: ShrinkTarget,
): Promise<ShrunkImage> {
  const { width, height } = fitWithin(bitmap, {
    longest: target.longest,
    shortest: target.shortest ?? target.longest,
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new ShrinkError("unwritable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  let written = false;
  for (const type of target.types) {
    for (const quality of target.qualities) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, quality),
      );
      // Browsers that can't write a format hand back a PNG instead.
      if (!blob || blob.type !== type) break;
      written = true;
      if (target.maxBytes === undefined || blob.size <= target.maxBytes)
        return { blob, width, height };
    }
  }
  throw new ShrinkError(written ? "tooLarge" : "unwritable");
}
