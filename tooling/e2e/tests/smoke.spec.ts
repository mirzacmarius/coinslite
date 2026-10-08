import { expect, test } from "@playwright/test";
import { appUrl, webUrl } from "../urls";

test("the marketing site loads", async ({ page }) => {
  await page.goto(webUrl);

  await expect(page).toHaveTitle("CoinsLite");
  await expect(
    page.getByRole("heading", { level: 1, name: "CoinsLite" }),
  ).toBeVisible();
});

test("a signed-out visitor to the app lands on sign-in", async ({ page }) => {
  await page.goto(appUrl);

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "CoinsLite" }),
  ).toBeVisible();
});
