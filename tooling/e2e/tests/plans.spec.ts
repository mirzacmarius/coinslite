import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify } from "../support/accounts";
import { addManually, catalogPicker } from "../support/items";
import { hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("the Free plan's usage in the sidebar counts Items, not pieces", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await expect(page.getByText("0 / 50 Items")).toBeVisible();

  await expect(async () => {
    await page.keyboard.press("c");
    await expect(catalogPicker(page)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await addManually(page);
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill("2 kroner 1914");
  await dialog.getByLabel("Quantity").fill("3");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByText("1 / 50 Items")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Upgrade to Premium" }),
  ).toHaveAttribute("href", /\/settings\/billing$/);
});
