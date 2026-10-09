/**
 * Item photo rules, shared by the backend and the app (no Convex imports).
 * The backend is authoritative; the app checks the same rules first so people
 * get an answer before a large file finishes uploading.
 */

/** An Item has one photo per side: front and back (obverse and reverse for coins). */
export const photoSides = ["front", "back"] as const;
export type PhotoSide = (typeof photoSides)[number];

export const photoLimits = {
  /** 10 MB. */
  bytes: 10 * 1024 * 1024,
};

/** Error codes the photo functions throw (ConvexError data). */
export const photoErrors = {
  /** The upload is gone, too old, or already a photo of an Item. */
  notFound: "PHOTO_NOT_FOUND",
  tooLarge: "PHOTO_TOO_LARGE",
  notAnImage: "PHOTO_NOT_AN_IMAGE",
} as const;

/** Error codes for uploads of any kind, photos and Catalog images alike. */
export const uploadErrors = {
  /** More uploads in a short time than anyone adding photos needs. */
  tooMany: "TOO_MANY_UPLOADS",
} as const;

/** The accepted formats, by the signature their files start with. */
const signatures = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // "GIF87a" or "GIF89a"
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  // "RIFF", four bytes of length, then "WEBP"
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46, -1, -1, -1, -1, 0x57, 0x45, 0x42, 0x50],
  ],
} as const;
export type PhotoType = keyof typeof signatures;

/** How many bytes from the start of a file `photoType` needs to see. */
export const photoSignatureLength = 12;

/**
 * The image format a file's first bytes show, whatever its name or claimed
 * type says; undefined when it isn't a JPEG, PNG, WebP or GIF.
 */
export function photoType(head: Uint8Array): PhotoType | undefined {
  const matches = (signature: readonly number[]) =>
    head.length >= signature.length &&
    signature.every((byte, at) => byte === -1 || head[at] === byte);
  return (Object.keys(signatures) as PhotoType[]).find((type) =>
    signatures[type].some(matches),
  );
}
