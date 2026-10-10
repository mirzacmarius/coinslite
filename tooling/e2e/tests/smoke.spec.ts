import { expect, test } from "@playwright/test";
import { appUrl, webUrl } from "../urls";

test("the marketing site loads", async ({ page }) => {
  await page.goto(webUrl);

  await expect(page).toHaveURL(`${webUrl}/en`);
  await expect(page).toHaveTitle(/^CoinsLite/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your Collection, recorded properly and valued in your currency",
    }),
  ).toBeVisible();
});

test("a signed-out visitor to the app lands on sign-in", async ({ page }) => {
  await page.goto(appUrl);

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in to your collection" }),
  ).toBeVisible();
});

test("the marketing site has the privacy policy and terms", async ({
  page,
}) => {
  for (const [path, heading] of [
    ["/privacy", "Privacy policy"],
    ["/terms", "Terms of use"],
  ]) {
    await page.goto(`${webUrl}${path}`);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  }
});
