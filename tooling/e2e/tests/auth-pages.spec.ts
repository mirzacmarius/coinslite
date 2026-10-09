import { expect, test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "../support/accessibility";
import { appUrl } from "../urls";

test.use({ locale: "en-US" });

const pages = [
  { path: "/login", heading: "Sign in to your collection" },
  { path: "/signup", heading: "Create your account" },
  { path: "/reset", heading: "Reset your password" },
  { path: "/verify", heading: "Verify your email" },
  { path: "/link", heading: "Sign in with a link" },
];

for (const { path, heading } of pages) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${path} meets WCAG AA in the ${colorScheme} theme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`${appUrl}${path}`);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });
  }
}

test("sign-up checks the form before sending anything", async ({ page }) => {
  await page.goto(`${appUrl}/signup`);
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByText("Enter an email address, like name@example.com."),
  ).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(
    page.getByText("Accept the privacy policy and terms of use to continue."),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("the privacy policy and terms are linked from sign-up", async ({
  page,
}) => {
  await page.goto(`${appUrl}/signup`);
  await expect(
    page.getByRole("link", { name: "privacy policy" }),
  ).toHaveAttribute("href", /\/privacy$/);
  await expect(
    page.getByRole("link", { name: "terms of use" }),
  ).toHaveAttribute("href", /\/terms$/);
});
