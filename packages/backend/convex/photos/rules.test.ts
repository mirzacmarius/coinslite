import { describe, expect, test } from "bun:test";
import type { Id } from "../_generated/dataModel";
import { listImageFile, thumbnailProblem } from "./rules";

/** The first bytes of a WebP file: "RIFF", four bytes of length, "WEBPVP8 ". */
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("a photo's thumbnail", () => {
  test("is accepted as a WebP file of 20 KB", () => {
    expect(thumbnailProblem(webp, 20 * 1024)).toBeUndefined();
  });

  test("is refused when its content isn't a WebP or JPEG file", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const text = new TextEncoder().encode("<svg xmlns=");
    expect(thumbnailProblem(png, 20 * 1024)).toBe("PHOTO_BAD_THUMBNAIL");
    expect(thumbnailProblem(text, 20 * 1024)).toBe("PHOTO_BAD_THUMBNAIL");
  });

  test("is accepted as a JPEG file, from browsers that can't write WebP", () => {
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    expect(thumbnailProblem(jpeg, 20 * 1024)).toBeUndefined();
  });

  test("is refused when larger than 128 KB", () => {
    expect(thumbnailProblem(webp, 128 * 1024)).toBeUndefined();
    expect(thumbnailProblem(webp, 128 * 1024 + 1)).toBe("PHOTO_BAD_THUMBNAIL");
  });
});

/** A stored file's id, as Convex hands them out. */
const file = (name: string) => name as Id<"_storage">;

describe("an Item's list image", () => {
  test("is its front photo's thumbnail", () => {
    const item = {
      frontPhoto: file("front"),
      frontThumbnail: file("front-small"),
      backPhoto: file("back"),
      backThumbnail: file("back-small"),
    };
    expect(listImageFile(item)).toBe(file("front-small"));
  });

  test("is the front photo itself when it predates thumbnails", () => {
    const item = {
      frontPhoto: file("front"),
      backPhoto: file("back"),
      backThumbnail: file("back-small"),
    };
    expect(listImageFile(item)).toBe(file("front"));
  });

  test("is the back photo's thumbnail, else the back photo, without a front photo", () => {
    expect(
      listImageFile({
        backPhoto: file("back"),
        backThumbnail: file("back-small"),
      }),
    ).toBe(file("back-small"));
    expect(listImageFile({ backPhoto: file("back") })).toBe(file("back"));
  });

  test("is the first more photo's thumbnail, else that photo, without side photos", () => {
    const more = { storageId: file("more"), thumbnailId: file("more-small") };
    expect(listImageFile({}, more)).toBe(file("more-small"));
    expect(listImageFile({}, { storageId: file("more") })).toBe(file("more"));
  });

  test("is a side photo before any more photo", () => {
    const more = { storageId: file("more"), thumbnailId: file("more-small") };
    expect(listImageFile({ backPhoto: file("back") }, more)).toBe(file("back"));
  });

  test("is nothing without photos", () => {
    expect(listImageFile({})).toBeUndefined();
  });
});
