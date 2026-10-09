import { expect, test } from "@playwright/test";
import {
  latestCode,
  newEmail,
  password,
  signOut,
  signUp,
  signUpAndVerify,
} from "../support/accounts";
import { appUrl, hasLocalBackend, webUrl } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("sign up, verify with the emailed code, and land on the page asked for", async ({
  page,
}) => {
  const email = newEmail();
  await page.goto(`${appUrl}/collection`);
  await expect(page).toHaveURL(/\/login\?next=%2Fcollection$/);
  await page.getByRole("link", { name: "Create an account" }).click();

  // en-US suggests US dollars as the Home currency.
  await expect(
    page.getByRole("button", { name: "Home currency: USD" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("Accept the privacy policy and terms of use to continue."),
  ).toBeVisible();

  await page.getByRole("checkbox", { name: /I accept/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await page.getByLabel("Code").fill(latestCode(email));
  await page.getByRole("button", { name: "Verify email" }).click();

  await expect(page).toHaveURL(/\/collection$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Collection" }),
  ).toBeVisible();
});

test("the link in the verification email works in another browser", async ({
  page,
  browser,
}) => {
  const email = newEmail();
  await page.goto(`${appUrl}/signup`);
  await signUp(page, email);
  const fragment = new URLSearchParams({ email, code: latestCode(email) });

  const otherBrowser = await browser.newContext({ locale: "en-US" });
  const other = await otherBrowser.newPage();
  await other.goto(`${appUrl}/verify#${fragment}`);
  await expect(
    other.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
  await otherBrowser.close();
});

test("sign out and back in; a wrong password is refused", async ({ page }) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await signOut(page);

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("not the password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/don't match/)).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
});

test("a forgotten password is replaced from the emailed link", async ({
  page,
  browser,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await signOut(page);

  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a new password" }),
  ).toBeVisible();

  const fragment = new URLSearchParams({ email, code: latestCode(email) });
  const mailClient = await browser.newContext({ locale: "en-US" });
  const fromEmail = await mailClient.newPage();
  await fromEmail.goto(`${appUrl}/reset#${fragment}`);
  await fromEmail.getByLabel("New password").fill("battery staple horse");
  await fromEmail.getByRole("button", { name: "Save password" }).click();
  await expect(
    fromEmail.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
  await mailClient.close();

  await page.goto(`${appUrl}/login`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("battery staple horse");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
});

test("signed-in visitors skip sign-in and the marketing site", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());

  await page.goto(`${appUrl}/login?next=%2Fcatalog`);
  await expect(page).toHaveURL(/\/catalog$/);
  // Paths that only look local are refused too: browsers drop the tab and read "//example.com".
  for (const next of [
    "%2F%2Fexample.com",
    "%2F%09%2Fexample.com",
    "%2F%5Cexample.com",
  ]) {
    await page.goto(`${appUrl}/login?next=${next}`);
    await expect(page).toHaveURL(`${appUrl}/`);
  }
  await page.goto(webUrl);
  await expect(page).toHaveURL(`${appUrl}/`);
});
