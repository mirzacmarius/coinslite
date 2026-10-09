import { expect, test } from "@playwright/test";
import {
  newEmail,
  runInBackend,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("an admin finds a user by email and opens their details", async ({
  page,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  runInBackend("admin/roles:grant", { email });

  await page.goto(`${appUrl}/admin/users`);
  const main = visiblePage(page);
  // The list shows once the page knows it's an admin's.
  const users = main.getByRole("table", { name: "Users" });
  await expect(users).toBeVisible();
  await main.getByRole("searchbox", { name: "Search users" }).fill(email);
  // The search lands in the URL after a pause; a link clicked before then
  // would lose its navigation to that URL change.
  await expect(page).toHaveURL(/[?&]q=/);
  // A whole email finds just that account: the header row and theirs.
  await expect(users.getByRole("row")).toHaveCount(2);
  await expect(users.getByRole("row").nth(1)).toContainText(email);
  // A new account's name is the start of its email.
  await users
    .getByRole("link", {
      name: email.slice(0, email.indexOf("@")),
      exact: true,
    })
    .click();

  await page.waitForURL((url) => url.pathname.startsWith("/admin/users/"));
  const detail = visiblePage(page);
  await expect(
    detail.getByRole("heading", { level: 3, name: "Profile" }),
  ).toBeVisible();
  await expect(
    detail.getByRole("heading", { level: 3, name: "Plan and subscription" }),
  ).toBeVisible();
  await expect(detail.getByText("Free plan").first()).toBeVisible();
});

test("the user list isn't there for anyone else", async ({ page }) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/admin/users`);
  await expect(
    visiblePage(page).getByText("This page isn't available"),
  ).toBeVisible();
});
