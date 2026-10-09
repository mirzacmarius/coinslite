import { expect, test } from "@playwright/test";
import { visiblePage } from "../support/accounts";
import { appUrl } from "../urls";

test.use({ locale: "en-US" });

/** Makes the app believe a newer deployment just went live (the test servers are "e2e"). */
async function deployNewerVersion(page: import("@playwright/test").Page) {
  await page.route("**/api/version", (route) =>
    route.fulfill({ json: { deploymentId: "e2e-newer" } }),
  );
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
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));

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

  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
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
