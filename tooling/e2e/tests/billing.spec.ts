import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("the Plans page offers Premium monthly or yearly", async ({ page }) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/settings/billing`);
  const main = visiblePage(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Plans" }),
  ).toBeVisible();
  await expect(main.getByRole("heading", { name: "Premium" })).toBeVisible();
  await expect(main.getByRole("radio", { name: /Yearly/ })).toBeChecked();
  await main.getByText("Monthly", { exact: true }).click();
  await expect(main.getByRole("radio", { name: /Monthly/ })).toBeChecked();
  await expect(
    main.getByRole("button", { name: "Upgrade to Premium" }),
  ).toBeVisible();
});

test("Account leads someone on the Free plan to Premium on the Plans page", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/settings`);

  await visiblePage(page)
    .getByRole("link", { name: "Upgrade to Premium" })
    .click();

  await page.waitForURL((url) => url.pathname === "/settings/billing");
  await expect(
    visiblePage(page).getByRole("button", { name: "Upgrade to Premium" }),
  ).toBeVisible();
});

/**
 * The real checkout, in Polar's sandbox. Set E2E_POLAR_SANDBOX=1 once the test
 * backend has a sandbox organization's POLAR_ORGANIZATION_TOKEN,
 * POLAR_WEBHOOK_SECRET, POLAR_PREMIUM_MONTHLY_PRODUCT_ID,
 * POLAR_PREMIUM_YEARLY_PRODUCT_ID and SITE_URL, and the organization's
 * webhook reaches the backend's /polar/events (a tunnel, for a local one).
 */
test.describe("Polar sandbox checkout and customer portal", () => {
  test.skip(
    !process.env.E2E_POLAR_SANDBOX,
    "Needs Polar sandbox credentials on the test backend and Polar's webhook reaching it",
  );

  test("buying Premium returns to the confirmation page, on Premium, and Account opens the portal", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signUpAndVerify(page, newEmail());
    await page.goto(`${appUrl}/settings/billing`);
    const main = visiblePage(page);
    await main.getByText("Monthly", { exact: true }).click();
    await main.getByRole("button", { name: "Upgrade to Premium" }).click();

    await page.waitForURL(/polar\.sh\/checkout\//, { timeout: 30_000 });
    // Polar's checkout takes card details in Stripe's payment frame.
    const card = page.frameLocator('iframe[title*="payment" i]').first();
    await card.getByLabel(/card number/i).fill("4242424242424242");
    await card.getByLabel(/expiration/i).fill("12 / 34");
    await card.getByLabel(/security code|cvc/i).fill("123");
    const name = page.getByLabel(/cardholder name/i);
    if (await name.isVisible()) await name.fill("Ada Lovelace");
    await page.getByRole("button", { name: /subscribe|pay/i }).click();

    await page.waitForURL(/\/settings\/billing\/confirmation/, {
      timeout: 60_000,
    });
    await expect(
      visiblePage(page).getByRole("heading", { name: "Welcome to Premium" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/\/ 50 Items/)).toBeHidden();

    // Account shows the plan and its renewal, and opens Polar's portal to change or cancel it.
    await page.goto(`${appUrl}/settings`);
    const account = visiblePage(page);
    await expect(account.getByText(/^Monthly · Renews on /)).toBeVisible({
      timeout: 30_000,
    });
    await account.getByRole("button", { name: "Manage subscription" }).click();
    await page.waitForURL(/polar\.sh\/.*portal/, { timeout: 30_000 });
  });
});
