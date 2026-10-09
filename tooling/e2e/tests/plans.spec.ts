import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("the Free plan's usage counts Items, not pieces, on the Overview and in the sidebar", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  const main = visiblePage(page);
  await expect(main.getByText("0 of 50 Items used")).toBeVisible();
  await expect(page.getByText("0 / 50 Items")).toBeVisible();

  await expect(async () => {
    await page.keyboard.press("c");
    await expect(page.getByRole("dialog", { name: "New Item" })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill("2 kroner 1914");
  await dialog.getByLabel("Quantity").fill("3");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  await expect(main.getByText("1 of 50 Items used")).toBeVisible();
  await expect(page.getByText("1 / 50 Items")).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Upgrade to Premium" }),
  ).toHaveAttribute("href", /\/settings\/billing$/);
});
