import { type Locator, type Page, expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { catalogPicker } from "../support/items";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where the bundled Catalog can be loaded",
);
test.use({ locale: "en-US", viewport: { width: 375, height: 812 } });

/** The page title is readable: shown whole, or cut short with room for at least 100px of it. */
async function expectReadableTitle(page: Page, title: string) {
  const heading = page.getByRole("heading", { level: 1, name: title });
  await expect(heading).toBeVisible();
  const { width, cut } = await heading.evaluate((element) => ({
    width: element.clientWidth,
    cut: element.scrollWidth > element.clientWidth,
  }));
  if (cut) expect(width).toBeGreaterThanOrEqual(100);
}

/** The header's action is still there by name, and opens what it opened before. */
async function expectAction(button: Locator, opens: Locator) {
  await button.click();
  await expect(opens).toBeVisible();
  await opens.getByRole("button", { name: "Cancel" }).click();
}

test("on a phone, the Item, Album and Catalog entry titles stay readable", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());

  // An Album holding an Item picked from the Catalog.
  await page.goto(`${appUrl}/albums`);
  const main = visiblePage(page);
  await main.getByRole("button", { name: "New Album" }).first().click();
  const albumForm = page.getByRole("dialog", { name: "New Album" });
  await albumForm.getByLabel("Name").fill("United States silver dollars");
  await albumForm.getByRole("button", { name: /^Create Album/ }).click();
  await expect(albumForm).toBeHidden();

  await page.goto(`${appUrl}/collection`);
  await main.getByRole("button", { name: "Add Item" }).first().click();
  const picker = catalogPicker(page);
  await picker
    .getByPlaceholder("Search coins by title, denomination, series or country…")
    .fill("1881 cc morgan");
  await picker.getByRole("option", { name: /Morgan dollar 1881-CC/ }).click();
  const itemForm = page.getByRole("dialog", { name: "New Item" });
  await itemForm.getByRole("button", { name: /^Add Item/ }).click();
  await expect(itemForm).toBeHidden();

  // The Item page: Duplicate, Edit and Delete shrink to icons.
  await main.getByRole("link", { name: /Morgan dollar 1881-CC/ }).click();
  await expectReadableTitle(page, "Morgan dollar 1881-CC");
  const header = page.locator("header:visible");
  await expectAction(
    header.getByRole("button", { name: "Delete" }),
    page.getByRole("alertdialog"),
  );

  // The Album page.
  await page.goto(`${appUrl}/albums`);
  await main
    .getByRole("link", { name: /United States silver dollars/ })
    .click();
  await expectReadableTitle(page, "United States silver dollars");
  await expectAction(
    header.getByRole("button", { name: "Delete" }),
    page.getByRole("alertdialog"),
  );

  // The Catalog entry page.
  await page.goto(`${appUrl}/catalog`);
  await page.getByRole("button", { name: "Search" }).first().click();
  await page.getByRole("combobox").fill("1881 cc morgan");
  await page.getByRole("option", { name: /Morgan dollar 1881-CC/ }).click();
  await expectReadableTitle(page, "Morgan dollar 1881-CC");
  await expect(
    header.getByRole("button", { name: "Add to Collection" }),
  ).toBeVisible();
});
