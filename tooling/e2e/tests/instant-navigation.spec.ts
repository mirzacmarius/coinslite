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
  // The sidebar's links: pages link to sections too, like the Overview's
  // "View Collection" while its latest Items load.
  const nav = page.getByRole("navigation", { name: "Main" });

  await instant(page, async () => {
    await nav.getByRole("link", { name: "Collection", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/collection");
    await expect(
      page.getByRole("heading", { level: 1, name: "Collection" }),
    ).toBeVisible();
  });

  await instant(page, async () => {
    await nav.getByRole("link", { name: "Account", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/settings");
    await expect(
      page.getByRole("heading", { level: 1, name: "Account" }),
    ).toBeVisible();
  });

  await instant(page, async () => {
    await nav.getByRole("link", { name: "Overview", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
  });

  await instant(page, async () => {
    await nav.getByRole("link", { name: "Albums", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/albums");
    await expect(
      page.getByRole("heading", { level: 1, name: "Albums" }),
    ).toBeVisible();
  });

  await instant(page, async () => {
    await nav.getByRole("link", { name: "Catalog", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/catalog");
    await expect(
      page.getByRole("heading", { level: 1, name: "Catalog" }),
    ).toBeVisible();
  });
});
