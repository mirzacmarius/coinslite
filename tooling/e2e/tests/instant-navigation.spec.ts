import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify } from "../support/accounts";
import { hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

// Moving between sections must not wait for the server: the next screen comes
// from the shell prefetched for its route. `instant` holds back everything
// else while the callback runs, so the assertions see only what is there at once.
test("moving between sections shows the next screen at once", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());

  await instant(page, async () => {
    await page.getByRole("link", { name: "Collection" }).click();
    await page.waitForURL((url) => url.pathname === "/collection");
    await expect(
      page.getByRole("heading", { level: 1, name: "Collection" }),
    ).toBeVisible();
  });

  await instant(page, async () => {
    await page.getByRole("link", { name: "Account" }).click();
    await page.waitForURL((url) => url.pathname === "/settings");
    await expect(
      page.getByRole("heading", { level: 1, name: "Account" }),
    ).toBeVisible();
  });

  await instant(page, async () => {
    await page.getByRole("link", { name: "Overview" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
  });
});
