import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("a new account isn't prompted about releases, and Account lists them all", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/settings`);
  const main = visiblePage(page);
  await expect(main.getByText("Free plan")).toBeVisible();

  // New accounts start at the current release: no highlights and no marker.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const updates = main.getByRole("link", { name: "Updates" });
  await expect(updates).toHaveText("Updates");

  await updates.click();
  await page.waitForURL((url) => url.pathname === "/settings/updates");
  await expect(
    page.getByRole("heading", { level: 1, name: "Updates" }),
  ).toBeVisible();
  const list = visiblePage(page);
  await expect(
    list.getByRole("heading", { level: 2, name: "Version 1.0" }),
  ).toBeVisible();
  await expect(
    list.getByRole("heading", { level: 3, name: "New features" }).last(),
  ).toBeVisible();
});
