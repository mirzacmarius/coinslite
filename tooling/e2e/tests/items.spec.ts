import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("add a coin, see it in the Collection, and open it", async ({ page }) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await expect(main.getByText("Your Collection is empty")).toBeVisible();

  await main.getByRole("button", { name: "Add Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Item" });
  // A title is required.
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog.getByText("Give the Item a title.")).toBeVisible();

  await dialog.getByLabel("Title").fill("Morgan dollar 1881-S");
  await dialog.getByRole("button", { name: "Country: Set country" }).click();
  await page.getByPlaceholder("Country").fill("United States");
  await page.keyboard.press("Enter");
  // An American coin is graded on the Sheldon scale; a proof keeps its Grade.
  await dialog.getByRole("button", { name: "Grade: Set grade" }).click();
  await page.getByPlaceholder("Grade").fill("65");
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Strike: Set strike" }).click();
  await page.getByRole("option", { name: "Proof" }).click();
  await dialog.getByLabel("Quantity").fill("2");
  await dialog.getByRole("button", { name: "More details" }).click();
  await dialog.getByLabel("Year").fill("1881");
  await dialog.getByLabel("Denomination").fill("1 dollar");
  await dialog.getByLabel("Purchase price").fill("75.50");
  await dialog.getByLabel("Purchase date").fill("2024-05-01");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  const row = main.getByRole("link", { name: /Morgan dollar 1881-S/ });
  await expect(row).toContainText("1881 · 1 dollar · United States");
  await expect(row).toContainText("PF-65");
  await expect(row).toContainText("×2");
  await row.click();

  const detail = visiblePage(page);
  await expect(
    detail.getByRole("heading", { level: 1, name: "Morgan dollar 1881-S" }),
  ).toBeVisible();
  await expect(detail.getByText("$75.50")).toBeVisible();
  await expect(detail.getByText("May 1, 2024")).toBeVisible();
  await expect(detail.getByText("PF-65")).toBeVisible();
  await expect(detail.getByText("Sheldon (1–70)")).toBeVisible();
});

test("C opens the New Item dialog from anywhere in the app", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());

  await expect(async () => {
    await page.keyboard.press("c");
    await expect(page.getByRole("dialog", { name: "New Item" })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await expect(page.getByLabel("Title")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "New Item" })).toBeHidden();
});

test("an Item that isn't yours, or doesn't exist, isn't shown", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());

  await page.goto(`${appUrl}/collection/not-an-item`);

  await expect(
    visiblePage(page).getByRole("heading", {
      level: 1,
      name: "Item not found",
    }),
  ).toBeVisible();
});

test("edit an Item, then duplicate it", async ({ page }) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await main.getByRole("button", { name: "Add Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill("2 kroner 1910");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();
  await main.getByRole("link", { name: /2 kroner 1910/ }).click();

  const detail = visiblePage(page);
  await detail.getByRole("button", { name: "Edit", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit Item" });
  await expect(edit.getByLabel("Title")).toHaveValue("2 kroner 1910");
  await edit.getByRole("button", { name: "More details" }).click();
  await edit.getByLabel("Mint mark").fill("KB");
  await edit.getByRole("button", { name: "Material: Set material" }).click();
  await page.getByRole("option", { name: "Silver" }).click();
  await edit.getByLabel("Diameter").fill("31,5");
  await edit.getByRole("button", { name: /^Save/ }).click();
  await expect(edit).toBeHidden();
  await expect(detail.getByText("31.5 mm")).toBeVisible();
  await expect(detail.getByText("Silver")).toBeVisible();

  const original = page.url();
  await detail.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page).not.toHaveURL(original);
  await expect(visiblePage(page).getByText("31.5 mm")).toBeVisible();
  await page.goto(`${appUrl}/collection`);
  await expect(
    visiblePage(page).getByRole("link", { name: /2 kroner 1910/ }),
  ).toHaveCount(2);
});

/** A real 1×1 PNG. */
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("add a photo, view it full screen, then delete the Item", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await main.getByRole("button", { name: "Add Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill("1 krone 1875");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();
  await main.getByRole("link", { name: /1 krone 1875/ }).click();

  const detail = visiblePage(page);
  const photos = detail.getByRole("region", { name: "Photos" });
  const addObverse = photos.getByRole("button", { name: "Obverse Add photo" });
  const choose = async (name: string, buffer: Buffer) => {
    const chooser = page.waitForEvent("filechooser");
    await addObverse.click();
    await (await chooser).setFiles({ name, mimeType: "image/png", buffer });
  };
  // Judged by content, not by name.
  await choose("notes.png", Buffer.from("just some text"));
  await expect(
    page.getByText("That file isn't a JPEG, PNG, WebP or GIF image."),
  ).toBeVisible();
  await choose("obverse.png", pixel);
  const obverse = photos.getByRole("button", {
    name: "Obverse View full screen",
  });
  await expect(obverse).toBeVisible();

  await obverse.click();
  const viewer = page.getByRole("dialog", { name: "Obverse" });
  await expect(viewer.getByRole("img", { name: "Obverse" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();

  await detail.getByRole("button", { name: "Delete", exact: true }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "Delete “1 krone 1875”?",
  });
  await expect(
    confirm.getByText("The Item and its photo are deleted for good."),
  ).toBeVisible();
  await confirm.getByRole("button", { name: "Delete Item" }).click();
  await expect(page).toHaveURL(/\/collection$/);
  await expect(
    visiblePage(page).getByText("Your Collection is empty"),
  ).toBeVisible();
});
