import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import {
  newEmail,
  runInBackend,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where the bundled Catalog can be loaded and the admin role granted",
);
test.use({ locale: "en-US" });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Buffer) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** A plain grey PNG picture of the given size. */
function png(width: number, height: number) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("an admin adds a credited image to a Catalog entry, then removes it", async ({
  page,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  runInBackend("admin/roles:grant", { email });
  await page.goto(`${appUrl}/catalog/us-peace-dollar-1922`);
  const main = visiblePage(page);
  await expect(main.getByRole("img", { name: "No image yet" })).toBeVisible();

  // The browser converts the picture to WebP at both sizes before it uploads.
  await main.getByRole("button", { name: "Add image" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "peace-1922.png",
    mimeType: "image/png",
    buffer: png(1000, 500),
  });
  await expect(
    dialog.getByText("800 × 400 px WebP, thumbnail 128 × 64 px"),
  ).toBeVisible();

  // Every part of the credit is required.
  await dialog.getByRole("button", { name: /^Save/ }).click();
  await expect(dialog.getByText("Enter the source.")).toBeVisible();
  await dialog.getByLabel("Source", { exact: true }).fill("Example Museum");
  await dialog.getByLabel("Author", { exact: true }).fill("A. Photographer");
  await dialog.getByLabel("Licence", { exact: true }).fill("CC BY 4.0");
  await dialog
    .getByLabel("Link", { exact: true })
    .fill("https://example.org/peace-1922");
  await dialog.getByRole("button", { name: /^Save/ }).click();

  await expect(dialog).toBeHidden();
  await expect(
    main.getByRole("img", { name: "Peace dollar 1922", exact: true }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", {
      name: "Example Museum · A. Photographer · CC BY 4.0",
    }),
  ).toHaveAttribute("href", "https://example.org/peace-1922");

  // Lists show the thumbnail with its credit, which this licence asks for.
  await page.goto(`${appUrl}/catalog/us-peace-dollar`);
  const row = visiblePage(page)
    .getByRole("link")
    .filter({ hasText: "Example Museum" });
  await expect(row).toContainText("Peace dollar 1922");
  await expect(row).toContainText(
    "Image · Example Museum · A. Photographer · CC BY 4.0",
  );

  await page.goto(`${appUrl}/catalog/us-peace-dollar-1922`);
  await visiblePage(page).getByRole("button", { name: "Remove image" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remove image" })
    .click();
  await expect(
    visiblePage(page).getByRole("img", { name: "No image yet" }),
  ).toBeVisible();
});
