/**
 * Item photo rules, shared by the backend and the app (no Convex imports).
 * The backend is authoritative; the app checks the same rules first so people
 * get an answer before a large file finishes uploading.
 */

/**
 * An Item has one photo per side: front and back (obverse and reverse for
 * coins; the stamp and its back for stamps), and up to `photoLimits.more`
 * more photos after them.
 */
export const photoSides = ["front", "back"] as const;
export type PhotoSide = (typeof photoSides)[number];

/** Whether a photo's place is one of the sides, rather than one more photo's id. */
export const isPhotoSide = (place: string): place is PhotoSide =>
  photoSides.some((side) => side === place);

export const photoLimits = {
  /** 10 MB. */
  bytes: 10 * 1024 * 1024,
  /** How many more photos an Item can have besides its sides. */
  more: 6,
  /**
   * The small copy of each photo that lists and grids show: its longest side
   * in pixels (the browser makes it, never scaling a photo up), and its bytes.
   */
  thumbnailPixels: 256,
  thumbnailBytes: 128 * 1024,
};

/** Error codes the photo functions throw (ConvexError data). */
export const photoErrors = {
  /** The upload is gone, too old, or already a photo of an Item. */
  notFound: "PHOTO_NOT_FOUND",
  tooLarge: "PHOTO_TOO_LARGE",
  notAnImage: "PHOTO_NOT_AN_IMAGE",
  /** The Item already has as many more photos as it can hold. */
  tooManyPhotos: "TOO_MANY_PHOTOS",
  /** The thumbnail sent with a photo isn't one `thumbnailProblem` accepts. */
  badThumbnail: "PHOTO_BAD_THUMBNAIL",
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

/**
 * The formats a thumbnail is made in: WebP, or JPEG in browsers that can't
 * write WebP (Safari, on every iPhone).
 */
export const thumbnailTypes = [
  "image/webp",
  "image/jpeg",
] as const satisfies readonly PhotoType[];

/**
 * Why a file can't be a photo's thumbnail, or undefined when it can: it must
 * be a WebP or JPEG file, judged by its first bytes (`photoSignatureLength`
 * of them), of at most `photoLimits.thumbnailBytes`.
 */
export function thumbnailProblem(head: Uint8Array, bytes: number) {
  const type = photoType(head);
  const accepted = thumbnailTypes.some((each) => each === type);
  if (!accepted || bytes > photoLimits.thumbnailBytes)
    return photoErrors.badThumbnail;
  return undefined;
}

/** An Item's side photos, each with its thumbnail when it has one, by stored file id. */
type SidePhotos<File> = {
  frontPhoto?: File;
  frontThumbnail?: File;
  backPhoto?: File;
  backThumbnail?: File;
};

/** One of an Item's more photos, with its thumbnail when it has one. */
type MorePhoto<File> = { storageId: File; thumbnailId?: File };

/**
 * The stored file an Item's list image is (spec §5.6): of its front photo,
 * else its back photo, else its first more photo, the thumbnail, or the
 * photo itself when it has none (photos from before thumbnails). Undefined
 * without photos. `firstMore` matters only without side photos, so it can be
 * left out when the Item has one.
 */
export function listImageFile<File>(
  item: SidePhotos<File>,
  firstMore?: MorePhoto<File>,
): File | undefined {
  if (item.frontPhoto) return item.frontThumbnail ?? item.frontPhoto;
  if (item.backPhoto) return item.backThumbnail ?? item.backPhoto;
  if (firstMore) return firstMore.thumbnailId ?? firstMore.storageId;
}
