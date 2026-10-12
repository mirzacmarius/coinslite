import {
  catalogEntryNotFound,
  catalogErrors,
  catalogLimits,
  reproducedUnderEcbRules,
} from "./fields";

export { reproducedUnderEcbRules };

/**
 * Catalog entry image rules, shared by the backend and the app (no Convex
 * imports). The admin's browser converts the chosen picture to WebP at both
 * sizes, so the original never leaves it; the backend reads each file's
 * format and size from its bytes and accepts nothing else.
 */

export const catalogImageLimits = {
  /** The full-size image's longest side, in pixels. */
  full: 800,
  /** The thumbnail's longest side, in pixels. */
  thumbnail: 128,
  /** Bytes of the full-size WebP file. */
  fullBytes: 2 * 1024 * 1024,
  /** Bytes of the thumbnail WebP file. */
  thumbnailBytes: 256 * 1024,
  /** Bytes of the picture an admin chooses, before the browser converts it. */
  originalBytes: 25 * 1024 * 1024,
} as const;

/** Error codes the image functions throw (ConvexError data). */
export const catalogImageErrors = {
  /** The key names no Catalog entry. */
  entryNotFound: catalogEntryNotFound,
  /** The upload is gone, too old, or already in use. */
  notFound: "IMAGE_NOT_FOUND",
  notWebp: "IMAGE_NOT_WEBP",
  /** The full-size image is over its pixel or byte limit. */
  tooLarge: "IMAGE_TOO_LARGE",
  /** The thumbnail is over its limits, or bigger than the full-size image. */
  thumbnailTooLarge: "THUMBNAIL_TOO_LARGE",
  /**
   * Credited as reproduced under the ECB's rules, the image is over 72 dpi at
   * the note's real size, or wasn't checked against it (`fullImageBounds`).
   */
  overReproductionLimit: "IMAGE_OVER_REPRODUCTION_LIMIT",
  /** Credited as reproduced under the ECB's rules, the entry has no width and height. */
  reproductionSizeRequired: "REPRODUCTION_SIZE_REQUIRED",
  /** Changing the credit of an entry that has no image. */
  noImage: "NO_IMAGE",
  /** Source, author, licence or link is missing. */
  creditRequired: catalogErrors.creditRequired,
  tooLong: catalogErrors.tooLong,
  invalidUrl: catalogErrors.invalidUrl,
  numistaData: catalogErrors.numistaData,
  // Only the browser reports these, before anything uploads.
  /** The chosen file isn't a JPEG, PNG, WebP or GIF picture that can be read. */
  unreadable: "IMAGE_UNREADABLE",
  /** The chosen file is over `originalBytes`. */
  originalTooLarge: "ORIGINAL_TOO_LARGE",
  /** This browser can't write WebP files. */
  webpUnsupported: "WEBP_UNSUPPORTED",
} as const;
export type CatalogImageError =
  (typeof catalogImageErrors)[keyof typeof catalogImageErrors];

/** A picture's size in pixels. */
export type ImageSize = { width: number; height: number };

/**
 * The most pixels a picture may have on its longest and its shortest side,
 * whichever way round it is.
 */
export type ImageBounds = { longest: number; shortest: number };

const boundsOf = (bounds: number | ImageBounds): ImageBounds =>
  typeof bounds === "number" ? { longest: bounds, shortest: bounds } : bounds;

/**
 * The size a picture is stored at: scaled down so its longest side is at
 * most `longest` (and with bounds, its shortest side at most `shortest`),
 * keeping its shape. A smaller picture keeps its size; it is never scaled up.
 */
export function fitWithin(size: ImageSize, bounds: number | ImageBounds) {
  const { longest, shortest } = boundsOf(bounds);
  const scale = Math.min(
    1,
    longest / Math.max(size.width, size.height),
    shortest / Math.min(size.width, size.height),
  );
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** Whether neither side of a picture is over its bound. */
export function withinBounds(size: ImageSize, bounds: ImageBounds) {
  return (
    Math.max(size.width, size.height) <= bounds.longest &&
    Math.min(size.width, size.height) <= bounds.shortest
  );
}

/**
 * The licence the euro banknotes' specimen images are credited with. The ECB
 * lets anyone use images of euro banknotes within its reproduction rules,
 * Decision ECB/2013/10, Art. 2: an electronic reproduction marked
 * "specimen" whose resolution "in its 100 % size does not exceed 72 dots per
 * inch". The size is kept to here; the marking comes with the ECB's own
 * specimen files, which are the only pictures credited this way. Such an
 * image is uploaded, never linked (fields.ts checkNode).
 */
export const ecbSpecimenLicence =
  "Reproduced under Decision ECB/2013/10: specimen image, 72 dpi";

/** The resolution Decision ECB/2013/10 allows a banknote's image at its real size. */
const reproductionDpi = 72;
const millimetresPerInch = 25.4;

/**
 * The most pixels an entry's full-size image may have, given its licence:
 * `catalogImageLimits.full` on its longest side, and for a banknote
 * reproduced under the ECB's rules also no more than 72 dpi at its real
 * width and height, so it is never stored above that (€500, 160 × 82 mm:
 * 453 × 232 px). Null when such an image's entry has no width and height,
 * as its size can't then be kept to the rules.
 */
export function fullImageBounds(
  entry: { width?: number; height?: number },
  licence: string,
): ImageBounds | null {
  const full = catalogImageLimits.full;
  if (!reproducedUnderEcbRules(licence))
    return { longest: full, shortest: full };
  if (entry.width === undefined || entry.height === undefined) return null;
  const pixels = (millimetres: number) =>
    Math.floor((millimetres / millimetresPerInch) * reproductionDpi);
  return {
    longest: Math.min(full, pixels(Math.max(entry.width, entry.height))),
    shortest: Math.min(full, pixels(Math.min(entry.width, entry.height))),
  };
}

/** How many bytes from the start of a file `webpSize` needs to see. */
export const webpHeaderLength = 30;

/**
 * The pixel size of a WebP file, read from its header (lossy, lossless or
 * extended); undefined when the bytes aren't a WebP file.
 */
export function webpSize(
  head: Uint8Array,
): { width: number; height: number } | undefined {
  const text = (from: number, length: number) =>
    String.fromCharCode(...head.subarray(from, from + length));
  const uint = (from: number, length: number) =>
    head
      .subarray(from, from + length)
      .reduce((value, byte, at) => value + byte * 2 ** (8 * at), 0);
  if (head.length < webpHeaderLength) return undefined;
  if (text(0, 4) !== "RIFF" || text(8, 4) !== "WEBP") return undefined;
  switch (text(12, 4)) {
    case "VP8 ": {
      // A key frame: 3 bytes of frame tag, then the start code.
      if (head[23] !== 0x9d || head[24] !== 0x01 || head[25] !== 0x2a)
        return undefined;
      return { width: uint(26, 2) & 0x3fff, height: uint(28, 2) & 0x3fff };
    }
    case "VP8L": {
      if (head[20] !== 0x2f) return undefined;
      const bits = uint(21, 4);
      return {
        width: (bits % 2 ** 14) + 1,
        height: (Math.floor(bits / 2 ** 14) % 2 ** 14) + 1,
      };
    }
    case "VP8X":
      return { width: uint(24, 3) + 1, height: uint(27, 3) + 1 };
    default:
      return undefined;
  }
}

/** Who to credit for an image: every part is required. */
export type ImageCredit = {
  source: string;
  author: string;
  licence: string;
  link: string;
};

const creditParts = ["source", "author", "licence", "link"] as const;

/**
 * An image's credit, trimmed, or the first problem with it: every part is
 * required, the link is a web address, and nothing may come from Numista
 * (ADR 0003).
 */
export function checkImageCredit(
  credit: ImageCredit,
): { credit: ImageCredit } | { problem: CatalogImageError } {
  const trimmed = {} as ImageCredit;
  for (const part of creditParts) trimmed[part] = credit[part].trim();
  for (const part of creditParts) {
    const value = trimmed[part];
    if (!value) return { problem: catalogImageErrors.creditRequired };
    const limit =
      part === "link" ? catalogLimits.url : catalogLimits.provenance;
    if (value.length > limit) return { problem: catalogImageErrors.tooLong };
    if (/numista/i.test(value))
      return { problem: catalogImageErrors.numistaData };
  }
  if (!isWebAddress(trimmed.link))
    return { problem: catalogImageErrors.invalidUrl };
  return { credit: trimmed };
}

/** Whether a value is a full http or https address. */
export function isWebAddress(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Whether an image's licence asks for it to be credited wherever it shows.
 * Public-domain and CC0 images don't; anything else, or a licence that isn't
 * named, does.
 */
export function creditRequired(licence: string | undefined) {
  const name = (licence ?? "").trim().toLowerCase();
  return !/^(public[\s-]?domain|pd|pdm|cc0|cc[\s-]?zero)(\b|$)/.test(name);
}

/** Licences an admin is likely to record, offered as suggestions. */
export const commonLicences = [
  "Public domain",
  "CC0 1.0",
  "CC BY 4.0",
  "CC BY-SA 4.0",
  "CC BY 3.0",
  "CC BY-SA 3.0",
] as const;
