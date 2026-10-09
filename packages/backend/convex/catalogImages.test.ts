/// <reference types="vite/client" />
import rateLimiter from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { formatCsvRecord } from "./catalog/csvText";
import { fitWithin } from "./catalog/imageRules";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
};

type Test = ReturnType<typeof newTest>;
type Caller = ReturnType<Test["withIdentity"]>;

/** A signed-in person; `admin` gives them the admin role. */
async function person(t: Test, email: string, extra: { admin?: boolean } = {}) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      emailVerificationTime: Date.now(),
      termsAcceptedAt: Date.now(),
      homeCurrency: "NOK" as const,
      ...(extra.admin && { role: "admin" as const }),
    }),
  );
  return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

type Row = Record<string, string>;

/** Imports Catalog rows as an admin, with whatever columns the rows use. */
async function importRows(admin: Caller, rows: Row[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    formatCsvRecord(columns),
    ...rows.map((row) =>
      formatCsvRecord(columns.map((column) => row[column] ?? "")),
    ),
  ].join("");
  const report = await admin.mutation(api.catalog.csv.importFile, { csv });
  if (!report.applied) throw new Error(JSON.stringify(report.errors));
}

/** A small Catalog: the US, the Morgan dollar series, two of its dates. */
async function morganDollars(admin: Caller) {
  await importRows(admin, [
    { id: "us", title: "United States", country: "US" },
    { id: "us-morgan", parent_id: "us", title: "Morgan dollar" },
    ...["1881", "1882"].map((year) => ({
      id: `us-morgan-${year}`,
      parent_id: "us-morgan",
      title: `Morgan dollar ${year}`,
      item_type: "coin",
      is_addable: "true",
      year_from: year,
      facts_source: "United States Mint",
    })),
  ]);
}

const le = (value: number, bytes: number) =>
  Array.from({ length: bytes }, (_, at) => (value >> (8 * at)) & 0xff);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/**
 * A WebP file of the given size, as the WebP container spec lays out its
 * header: "RIFF", the file length, "WEBP", then the first chunk. Lossy
 * ("VP8 ") images carry their size in the key frame header, lossless ("VP8L")
 * ones in 14-bit fields, and extended ("VP8X") ones on the canvas. `fill`
 * makes files of one size differ.
 */
function webp(
  width: number,
  height: number,
  format: "lossy" | "lossless" | "extended" = "lossy",
  fill = 1,
) {
  const chunks = {
    lossy: [
      ...ascii("VP8 "),
      ...le(64, 4),
      // Frame tag, start code, then 14-bit width and height.
      0x30,
      0x01,
      0x00,
      0x9d,
      0x01,
      0x2a,
      ...le(width, 2),
      ...le(height, 2),
    ],
    lossless: [
      ...ascii("VP8L"),
      ...le(64, 4),
      0x2f,
      ...le((width - 1) | ((height - 1) << 14), 4),
    ],
    extended: [
      ...ascii("VP8X"),
      ...le(10, 4),
      0x10,
      0,
      0,
      0,
      ...le(width - 1, 3),
      ...le(height - 1, 3),
    ],
  };
  const head = [...ascii("RIFF"), ...le(1016, 4), ...ascii("WEBP")];
  const bytes = new Uint8Array(1024).fill(fill);
  bytes.set([...head, ...chunks[format]]);
  return new Blob([bytes]);
}

/** What the browser does: put a file in storage through an upload URL. */
const upload = (t: Test, blob: Blob) => t.run((ctx) => ctx.storage.store(blob));

const credit = {
  source: "Wikimedia Commons",
  author: "A. Photographer",
  licence: "CC BY-SA 4.0",
  link: "https://commons.wikimedia.org/wiki/File:Morgan_1881.jpg",
};

/** Uploads a full-size image and its thumbnail, ready to attach. */
async function uploads(
  t: Test,
  full: Blob = webp(800, 600),
  thumbnail: Blob = webp(128, 96, "lossy", 2),
) {
  return { full: await upload(t, full), thumbnail: await upload(t, thumbnail) };
}

const urlOf = (t: Test, storageId: Id<"_storage">) =>
  t.run((ctx) => ctx.storage.getUrl(storageId));

const firstPage = { numItems: 50, cursor: null };

test("an admin's WebP image shows, credited, on the entry and as its row's thumbnail", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await morganDollars(admin.as);

  const files = await uploads(t);
  await admin.as.action(api.catalog.images.attach, {
    key: "us-morgan-1881",
    ...files,
    credit,
  });

  const fullUrl = await urlOf(t, files.full);
  const thumbnailUrl = await urlOf(t, files.thumbnail);
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "us-morgan-1881" }),
  ).toMatchObject({
    imageUrl: fullUrl,
    thumbnailUrl,
    imageProvenance: credit,
  });
  const { page } = await ada.as.query(api.catalog.browse.entries, {
    key: "us-morgan",
    paginationOpts: firstPage,
  });
  expect(page.map(({ key, thumbnailUrl }) => ({ key, thumbnailUrl }))).toEqual([
    { key: "us-morgan-1881", thumbnailUrl },
    { key: "us-morgan-1882", thumbnailUrl: undefined },
  ]);
});

test("only admins upload, replace, credit and remove Catalog images", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await morganDollars(admin.as);
  const key = "us-morgan-1881";
  await admin.as.action(api.catalog.images.attach, {
    key,
    ...(await uploads(t)),
    credit,
  });
  const before = await ada.as.query(api.catalog.browse.node, { key });

  for (const caller of [ada.as, t]) {
    const refused = caller === t ? "NOT_SIGNED_IN" : "NOT_ADMIN";
    await expect(
      caller.mutation(api.catalog.images.generateUploadUrl, {}),
    ).rejects.toThrow(refused);
    await expect(
      caller.action(api.catalog.images.attach, {
        key,
        ...(await uploads(t)),
        credit,
      }),
    ).rejects.toThrow(refused);
    await expect(
      caller.mutation(api.catalog.images.updateCredit, {
        key,
        credit: { ...credit, author: "Someone else" },
      }),
    ).rejects.toThrow(refused);
    await expect(
      caller.mutation(api.catalog.images.remove, { key }),
    ).rejects.toThrow(refused);
  }

  expect(await ada.as.query(api.catalog.browse.node, { key })).toEqual(before);
  await expect(
    admin.as.mutation(api.catalog.images.generateUploadUrl, {}),
  ).resolves.toEqual(expect.any(String));
});

/** How many files are in storage. */
const stored = (t: Test) =>
  t.run(
    async (ctx) => (await ctx.db.system.query("_storage").collect()).length,
  );

test("the full-size image is at most 800 px and the thumbnail at most 128 px on their longest side, in WebP", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await morganDollars(admin.as);
  const key = "us-morgan-1881";
  const attach = async (full: Blob, thumbnail: Blob) =>
    admin.as.action(api.catalog.images.attach, {
      key,
      ...(await uploads(t, full, thumbnail)),
      credit,
    });
  const png = new Blob([
    new Uint8Array([0x89, ...ascii("PNG\r\n\x1a\n"), 0, 0, 0, 0x0d]),
    new Uint8Array(1024),
  ]);

  await expect(
    attach(webp(801, 600), webp(128, 96, "lossy", 2)),
  ).rejects.toThrow("IMAGE_TOO_LARGE");
  await expect(
    attach(webp(600, 801, "extended"), webp(96, 128, "lossy", 2)),
  ).rejects.toThrow("IMAGE_TOO_LARGE");
  await expect(
    attach(webp(800, 600), webp(129, 97, "lossless", 2)),
  ).rejects.toThrow("THUMBNAIL_TOO_LARGE");
  // A thumbnail bigger than the image it shrinks has been scaled up.
  await expect(
    attach(webp(100, 50), webp(128, 64, "lossy", 2)),
  ).rejects.toThrow("THUMBNAIL_TOO_LARGE");
  await expect(attach(png, webp(128, 96, "lossy", 2))).rejects.toThrow(
    "IMAGE_NOT_WEBP",
  );
  await expect(attach(webp(800, 600), png)).rejects.toThrow("IMAGE_NOT_WEBP");
  const oversized = new Blob([webp(800, 600), new Uint8Array(2 * 1024 * 1024)]);
  await expect(attach(oversized, webp(128, 96, "lossy", 2))).rejects.toThrow(
    "IMAGE_TOO_LARGE",
  );
  // Rejected files are thrown away, and the entry keeps its placeholder.
  expect(await stored(t)).toBe(0);
  expect(
    await ada.as.query(api.catalog.browse.node, { key }),
  ).not.toHaveProperty("imageUrl");

  // Exactly at the limits, in each WebP format, landscape or portrait.
  await attach(webp(800, 600, "lossless"), webp(128, 96, "extended", 2));
  await attach(webp(450, 800, "extended"), webp(72, 128, "lossless", 2));
  // Small pictures keep their size: the thumbnail may be the full size.
  await attach(webp(64, 64), webp(64, 64, "lossy", 2));
  expect(await stored(t)).toBe(2);
});

test("real WebP files, lossy and lossless, are accepted", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await morganDollars(admin.as);
  // One-pixel images as a WebP encoder writes them.
  const file = (base64: string) =>
    new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))]);
  const lossy = file(
    "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  );
  const lossless = file("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==");

  await admin.as.action(api.catalog.images.attach, {
    key: "us-morgan-1881",
    ...(await uploads(t, lossy, lossless)),
    credit,
  });
  expect(await stored(t)).toBe(2);

  // The first bytes of what a browser's canvas writes for an 800 × 400
  // picture and its 128 × 64 thumbnail (extended WebP, with a colour profile).
  const header = [82, 73, 70, 70, 80, 4, 0, 0, 87, 69, 66, 80, 86, 80, 56, 88];
  const canvasFile = (size: number[], fill: number) => {
    const bytes = new Uint8Array(1024).fill(fill);
    bytes.set([...header, 10, 0, 0, 0, 32, 0, 0, 0, ...size]);
    return new Blob([bytes]);
  };
  const full = canvasFile([31, 3, 0, 143, 1, 0], 1);
  const thumbnail = canvasFile([127, 0, 0, 63, 0, 0], 2);
  await admin.as.action(api.catalog.images.attach, {
    key: "us-morgan-1882",
    ...(await uploads(t, full, thumbnail)),
    credit,
  });
  await expect(
    admin.as.action(api.catalog.images.attach, {
      key: "us-morgan-1882",
      ...(await uploads(t, full, canvasFile([31, 3, 0, 143, 1, 0], 3))),
      credit,
    }),
  ).rejects.toThrow("THUMBNAIL_TOO_LARGE");
});

test("pictures are scaled down to fit, keeping their shape, and never scaled up", () => {
  expect(fitWithin({ width: 1600, height: 1200 }, 800)).toEqual({
    width: 800,
    height: 600,
  });
  expect(fitWithin({ width: 1600, height: 1200 }, 128)).toEqual({
    width: 128,
    height: 96,
  });
  expect(fitWithin({ width: 900, height: 2000 }, 800)).toEqual({
    width: 360,
    height: 800,
  });
  expect(fitWithin({ width: 640, height: 480 }, 800)).toEqual({
    width: 640,
    height: 480,
  });
  expect(fitWithin({ width: 100, height: 50 }, 128)).toEqual({
    width: 100,
    height: 50,
  });
  // A sliver keeps at least one pixel.
  expect(fitWithin({ width: 4000, height: 2 }, 128)).toEqual({
    width: 128,
    height: 1,
  });
});

test("every image is credited with its source, author, licence and link", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await morganDollars(admin.as);
  const key = "us-morgan-1881";
  const attach = async (changes: Partial<typeof credit>) =>
    admin.as.action(api.catalog.images.attach, {
      key,
      ...(await uploads(t)),
      credit: { ...credit, ...changes },
    });

  for (const part of ["source", "author", "licence", "link"] as const) {
    await expect(attach({ [part]: "  " })).rejects.toThrow("CREDIT_REQUIRED");
  }
  await expect(attach({ link: "commons.wikimedia.org/x" })).rejects.toThrow(
    "INVALID_URL",
  );
  await expect(attach({ link: "ftp://example.org/x.jpg" })).rejects.toThrow(
    "INVALID_URL",
  );
  await expect(attach({ source: "Numista" })).rejects.toThrow("NUMISTA_DATA");
  await expect(attach({ author: "A".repeat(201) })).rejects.toThrow("TOO_LONG");
  expect(await stored(t)).toBe(0);
  expect(
    await ada.as.query(api.catalog.browse.node, { key }),
  ).not.toHaveProperty("imageUrl");

  await attach({ source: "  Wikimedia Commons ", licence: "CC BY-SA 4.0 " });
  expect(await ada.as.query(api.catalog.browse.node, { key })).toMatchObject({
    imageProvenance: credit,
  });

  // The credit changes on its own, under the same rules.
  const newCredit = { ...credit, author: "B. Photographer" };
  await expect(
    admin.as.mutation(api.catalog.images.updateCredit, {
      key,
      credit: { ...newCredit, licence: "" },
    }),
  ).rejects.toThrow("CREDIT_REQUIRED");
  await admin.as.mutation(api.catalog.images.updateCredit, {
    key,
    credit: newCredit,
  });
  expect(await ada.as.query(api.catalog.browse.node, { key })).toMatchObject({
    imageUrl: expect.any(String),
    imageProvenance: newCredit,
  });
  // Without an image there is nothing to credit.
  await expect(
    admin.as.mutation(api.catalog.images.updateCredit, {
      key: "us-morgan-1882",
      credit,
    }),
  ).rejects.toThrow("NO_IMAGE");
});

test("a Catalog CSV file's image needs its source, author, licence and link too", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const image = {
    image_url: "https://example.org/morgan.jpg",
    image_source: "Wikimedia Commons",
    image_author: "A. Photographer",
    image_licence: "CC BY-SA 4.0",
    image_link: "https://commons.wikimedia.org/wiki/File:Morgan.jpg",
  };
  const entry = (id: string, cells: Row) => ({
    id,
    parent_id: "us",
    title: id,
    item_type: "coin",
    is_addable: "true",
    ...cells,
  });
  const rows = [
    { id: "us", title: "United States", country: "US" },
    entry("a", image),
    entry("b", { ...image, image_author: "", image_link: "" }),
    entry("c", { ...image, image_licence: "" }),
    // Credits for an image that isn't there yet need only their source.
    entry("d", { image_source: "Wikimedia Commons" }),
  ];
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    formatCsvRecord(columns),
    ...rows.map((row) =>
      formatCsvRecord(columns.map((column) => (row as Row)[column] ?? "")),
    ),
  ].join("");

  expect(await admin.as.query(api.catalog.csv.preview, { csv })).toMatchObject({
    errors: [
      { row: 4, column: "image_author", code: "CREDIT_REQUIRED" },
      { row: 4, column: "image_link", code: "CREDIT_REQUIRED" },
      { row: 5, column: "image_licence", code: "CREDIT_REQUIRED" },
    ],
  });
});

test("an image is replaced or removed, files and all, and an entry without one shows a placeholder", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await morganDollars(admin.as);
  const key = "us-morgan-1881";
  const detail = () => ada.as.query(api.catalog.browse.node, { key });

  const first = await uploads(t);
  await admin.as.action(api.catalog.images.attach, { key, ...first, credit });
  const second = await uploads(
    t,
    webp(600, 800, "lossy", 3),
    webp(96, 128, "lossy", 4),
  );
  const newCredit = { ...credit, licence: "CC BY 4.0" };
  await admin.as.action(api.catalog.images.attach, {
    key,
    ...second,
    credit: newCredit,
  });

  expect(await detail()).toMatchObject({
    imageUrl: await urlOf(t, second.full),
    thumbnailUrl: await urlOf(t, second.thumbnail),
    imageProvenance: newCredit,
  });
  expect(await urlOf(t, first.full)).toBeNull();
  expect(await urlOf(t, first.thumbnail)).toBeNull();
  expect(await stored(t)).toBe(2);

  await admin.as.mutation(api.catalog.images.remove, { key });

  const removed = await detail();
  expect(removed).not.toHaveProperty("imageUrl");
  expect(removed).not.toHaveProperty("thumbnailUrl");
  expect(removed).not.toHaveProperty("imageProvenance");
  expect(await stored(t)).toBe(0);
  // Removing again changes nothing.
  await admin.as.mutation(api.catalog.images.remove, { key });
});

test("an image linked from a Catalog CSV file is replaced by an upload, or removed", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await importRows(admin.as, [
    { id: "us", title: "United States", country: "US" },
    {
      id: "us-morgan-1881",
      parent_id: "us",
      title: "Morgan dollar 1881",
      item_type: "coin",
      is_addable: "true",
      image_url: "https://example.org/morgan.jpg",
      image_source: "Example Museum",
      image_author: "A. Photographer",
      image_licence: "Public domain",
      image_link: "https://example.org/morgan",
    },
  ]);
  const key = "us-morgan-1881";
  const detail = () => ada.as.query(api.catalog.browse.node, { key });

  const files = await uploads(t);
  await admin.as.action(api.catalog.images.attach, { key, ...files, credit });
  expect(await detail()).toMatchObject({
    imageUrl: await urlOf(t, files.full),
    imageProvenance: credit,
  });

  await admin.as.mutation(api.catalog.images.remove, { key });
  expect(await detail()).not.toHaveProperty("imageUrl");
});

test("only Catalog entries have images", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await morganDollars(admin.as);

  for (const key of ["us-morgan", "us", "nowhere"]) {
    await expect(
      admin.as.action(api.catalog.images.attach, {
        key,
        ...(await uploads(t)),
        credit,
      }),
    ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
    await expect(
      admin.as.mutation(api.catalog.images.updateCredit, { key, credit }),
    ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
    await expect(
      admin.as.mutation(api.catalog.images.remove, { key }),
    ).rejects.toThrow("CATALOG_ENTRY_NOT_FOUND");
  }
});

test("lists credit a thumbnail when its licence asks for it; the entry always credits its image", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await morganDollars(admin.as);
  const rows = async () =>
    (
      await ada.as.query(api.catalog.browse.entries, {
        key: "us-morgan",
        paginationOpts: firstPage,
      })
    ).page.map(({ key, imageCredit }) => ({ key, imageCredit }));
  const attach = async (key: string, licence: string) =>
    admin.as.action(api.catalog.images.attach, {
      key,
      ...(await uploads(t)),
      credit: { ...credit, licence },
    });

  await attach("us-morgan-1881", "CC BY-SA 4.0");
  await attach("us-morgan-1882", "Public domain");
  expect(await rows()).toEqual([
    { key: "us-morgan-1881", imageCredit: credit },
    { key: "us-morgan-1882", imageCredit: undefined },
  ]);

  for (const licence of ["CC0 1.0", "Public Domain Mark 1.0", "PD-USGov"]) {
    await attach("us-morgan-1881", licence);
    expect((await rows())[0]?.imageCredit).toBeUndefined();
  }
  for (const licence of [
    "CC BY 4.0",
    "All rights reserved, used with permission",
  ]) {
    await attach("us-morgan-1881", licence);
    expect((await rows())[0]?.imageCredit).toEqual({ ...credit, licence });
  }
  expect(
    await ada.as.query(api.catalog.browse.node, { key: "us-morgan-1882" }),
  ).toMatchObject({ imageProvenance: { ...credit, licence: "Public domain" } });
});

test("an image's files are fresh uploads that no Item or other entry uses", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await morganDollars(admin.as);
  const itemId = await admin.as.mutation(api.items.add, {
    type: "coin",
    title: "Krone",
  });
  const photo = await upload(t, webp(800, 600, "lossy", 7));
  await admin.as.action(api.photos.attach, {
    itemId,
    side: "front",
    storageId: photo,
  });
  const files = await uploads(t);
  await admin.as.action(api.catalog.images.attach, {
    key: "us-morgan-1881",
    ...files,
    credit,
  });
  const attach = (full: Id<"_storage">, thumbnail: Id<"_storage">) =>
    admin.as.action(api.catalog.images.attach, {
      key: "us-morgan-1882",
      full,
      thumbnail,
      credit,
    });
  const thumbnail = await upload(t, webp(128, 96, "lossy", 8));

  await expect(attach(photo, thumbnail)).rejects.toThrow("IMAGE_NOT_FOUND");
  await expect(attach(files.full, thumbnail)).rejects.toThrow(
    "IMAGE_NOT_FOUND",
  );
  await expect(attach(thumbnail, thumbnail)).rejects.toThrow("IMAGE_NOT_FOUND");
  // Nor does an Item take a Catalog image's file as its photo.
  await expect(
    admin.as.action(api.photos.attach, {
      itemId,
      side: "back",
      storageId: files.thumbnail,
    }),
  ).rejects.toThrow("PHOTO_NOT_FOUND");
  expect(await urlOf(t, files.thumbnail)).not.toBeNull();
  expect(await urlOf(t, photo)).not.toBeNull();
});

test("uploads older than an hour don't become an image, and are left alone", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  await morganDollars(admin.as);
  const files = await uploads(t);

  vi.setSystemTime(Date.now() + 61 * 60 * 1000);
  await expect(
    admin.as.action(api.catalog.images.attach, {
      key: "us-morgan-1881",
      ...files,
      credit,
    }),
  ).rejects.toThrow("IMAGE_NOT_FOUND");
  expect(await stored(t)).toBe(2);
});

afterEach(() => {
  vi.useRealTimers();
});

/** The whole Catalog as an admin exports it. */
async function exportAll(admin: Caller) {
  let csv = "";
  let cursor: string | null = null;
  for (;;) {
    const page: { csv: string; isDone: boolean; continueCursor: string } =
      await admin.query(api.catalog.csv.exportPage, {
        paginationOpts: { numItems: 50, cursor },
      });
    csv += page.csv;
    if (page.isDone) return csv;
    cursor = page.continueCursor;
  }
}

test("Catalog CSV imports keep an uploaded image and its credit, unless the file links another image", async () => {
  const t = newTest();
  const admin = await person(t, "admin@example.com", { admin: true });
  const ada = await person(t, "ada@example.com");
  await morganDollars(admin.as);
  const key = "us-morgan-1881";
  const detail = () => ada.as.query(api.catalog.browse.node, { key });
  const files = await uploads(t);
  await admin.as.action(api.catalog.images.attach, { key, ...files, credit });
  const imageUrl = await urlOf(t, files.full);

  // The export credits the image; importing it again changes nothing.
  const exported = await exportAll(admin.as);
  expect(exported).toContain(credit.link);
  expect(
    await admin.as.mutation(api.catalog.csv.importFile, { csv: exported }),
  ).toMatchObject({ applied: true, inserts: 0, updates: 0 });
  // Updating the entry's other facts keeps its image.
  await importRows(admin.as, [
    {
      id: key,
      title: "Morgan dollar 1881",
      year_from: "1881",
      facts_source: "US Mint",
    },
  ]);
  expect(await detail()).toMatchObject({
    imageUrl,
    imageProvenance: credit,
    factsProvenance: { source: "US Mint" },
  });

  // An uploaded image stays credited in full.
  const cleared = await admin.as.mutation(api.catalog.csv.importFile, {
    csv: `id,title,image_source,image_author,image_licence,image_link\n${key},Morgan dollar 1881,,,,\n`,
  });
  expect(cleared).toMatchObject({
    applied: false,
    errors: [
      { row: 2, column: "image_source", code: "SOURCE_REQUIRED" },
      { row: 2, column: "image_author", code: "CREDIT_REQUIRED" },
      { row: 2, column: "image_licence", code: "CREDIT_REQUIRED" },
      { row: 2, column: "image_link", code: "CREDIT_REQUIRED" },
    ],
  });

  // A linked image takes the uploaded one's place, which is deleted.
  await importRows(admin.as, [
    {
      id: key,
      title: "Morgan dollar 1881",
      image_url: "https://example.org/morgan.jpg",
      image_licence: "Public domain",
    },
  ]);
  expect(await detail()).toMatchObject({
    imageUrl: "https://example.org/morgan.jpg",
    thumbnailUrl: "https://example.org/morgan.jpg",
    imageProvenance: { ...credit, licence: "Public domain" },
  });
  expect(await stored(t)).toBe(0);
});
