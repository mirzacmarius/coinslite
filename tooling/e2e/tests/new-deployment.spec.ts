import { type Page, expect, test } from "@playwright/test";
import { visiblePage } from "../support/accounts";
import { appUrl } from "../urls";

test.use({ locale: "en-US" });

/** Makes the app believe a newer deployment just went live (the test servers are "e2e"). */
async function deployNewerVersion(page: Page) {
  await page.route("**/api/version", (route) =>
    route.fulfill({ json: { deploymentId: "e2e-newer" } }),
  );
}

/**
 * Gives the window focus until the tab asks which deployment is live. The tab
 * only listens once the page has hydrated, which a dev server can take a while
 * to get to after the page shows; focus before then goes unnoticed.
 */
async function focusUntilChecked(page: Page) {
  await expect(async () => {
    await Promise.all([
      page.waitForRequest("**/api/version", { timeout: 1000 }),
      page.evaluate(() => window.dispatchEvent(new Event("focus"))),
    ]);
  }).toPass();
}

test("an open tab moves to a newer deployment when it gains focus", async ({
  page,
}) => {
  await page.goto(`${appUrl}/login`);
  await expect(
    visiblePage(page).getByRole("heading", {
      name: "Sign in to your collection",
    }),
  ).toBeVisible();
  await deployNewerVersion(page);

  const reloaded = page.waitForEvent("load");
  await focusUntilChecked(page);

  await reloaded;
});

test("a form with unsaved input holds the reload", async ({ page }) => {
  await page.goto(`${appUrl}/signup`);
  const main = visiblePage(page);
  await main.getByLabel("Email", { exact: true }).fill("someone@example.com");
  await deployNewerVersion(page);
  let reloaded = false;
  page.on("load", () => {
    reloaded = true;
  });

  await focusUntilChecked(page);
  await page.waitForTimeout(1500);

  expect(reloaded).toBe(false);
  await expect(main.getByLabel("Email", { exact: true })).toHaveValue(
    "someone@example.com",
  );
});

test("the live deployment can be asked for while signed out", async ({
  request,
}) => {
  const response = await request.get(`${appUrl}/api/version`);
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ deploymentId: "e2e" });
});
