import { expect, test } from "@playwright/test";
import {
  latestCode,
  latestLink,
  newEmail,
  password,
  signOut,
  signUp,
  signUpAndVerify,
  visiblePage,
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
  await visiblePage(page)
    .getByRole("link", { name: "Create an account" })
    .click();

  // en-US suggests US dollars as the Home currency.
  await expect(
    visiblePage(page).getByRole("button", { name: "Home currency: USD" }),
  ).toBeVisible();
  await visiblePage(page).getByLabel("Email", { exact: true }).fill(email);
  await visiblePage(page)
    .getByLabel("Password", { exact: true })
    .fill(password);
  await visiblePage(page)
    .getByRole("button", { name: "Create account" })
    .click();
  await expect(
    visiblePage(page).getByText(
      "Accept the privacy policy and terms of use to continue.",
    ),
  ).toBeVisible();

  await visiblePage(page)
    .getByRole("checkbox", { name: /I accept/ })
    .check();
  await visiblePage(page)
    .getByRole("button", { name: "Create account" })
    .click();
  await expect(
    visiblePage(page).getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await visiblePage(page).getByLabel("Code").fill(latestCode(email));
  await visiblePage(page).getByRole("button", { name: "Verify email" }).click();

  await expect(page).toHaveURL(/\/collection$/);
  await expect(
    visiblePage(page).getByRole("heading", { level: 1, name: "Collection" }),
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

  await visiblePage(page).getByLabel("Email", { exact: true }).fill(email);
  await visiblePage(page)
    .getByLabel("Password", { exact: true })
    .fill("not the password");
  await visiblePage(page)
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(visiblePage(page).getByText(/don't match/)).toBeVisible();

  await visiblePage(page)
    .getByLabel("Password", { exact: true })
    .fill(password);
  await visiblePage(page)
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(
    visiblePage(page).getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
});

test("a forgotten password is replaced from the emailed link", async ({
  page,
  browser,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await signOut(page);

  await visiblePage(page)
    .getByRole("link", { name: "Forgot password?" })
    .click();
  await expect(
    visiblePage(page).getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
  await visiblePage(page).getByLabel("Email", { exact: true }).fill(email);
  await visiblePage(page).getByRole("button", { name: "Send code" }).click();
  await expect(
    visiblePage(page).getByRole("heading", { name: "Choose a new password" }),
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
  await visiblePage(page).getByLabel("Email", { exact: true }).fill(email);
  await visiblePage(page)
    .getByLabel("Password", { exact: true })
    .fill("battery staple horse");
  await visiblePage(page)
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(
    visiblePage(page).getByRole("heading", { level: 1, name: "Overview" }),
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

test("a sign-in link signs up a new email, which finishes setting up and lands on the page asked for", async ({
  page,
  browser,
}) => {
  const email = newEmail();
  await page.goto(`${appUrl}/catalog`);
  await visiblePage(page)
    .getByRole("link", { name: "Email me a sign-in link" })
    .click();
  const main = visiblePage(page);
  await expect(
    main.getByRole("heading", { name: "Sign in with a link" }),
  ).toBeVisible();
  await main.getByLabel("Email", { exact: true }).fill(email);
  await main.getByRole("button", { name: "Email me a link" }).click();
  await expect(
    main.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  // The mail app opens the link in its own browser.
  const mailClient = await browser.newContext({ locale: "en-US" });
  const fromEmail = await mailClient.newPage();
  await fromEmail.goto(latestLink(email));
  const welcome = visiblePage(fromEmail);
  await expect(
    welcome.getByRole("heading", { name: "Finish setting up your account" }),
  ).toBeVisible();
  await expect(
    welcome.getByRole("button", { name: "Home currency: USD" }),
  ).toBeVisible();
  await welcome.getByRole("button", { name: "Start using CoinsLite" }).click();
  await expect(
    welcome.getByText(
      "Accept the privacy policy and terms of use to continue.",
    ),
  ).toBeVisible();
  await welcome.getByRole("checkbox", { name: /I accept/ }).check();
  await welcome.getByRole("button", { name: "Start using CoinsLite" }).click();

  await expect(fromEmail).toHaveURL(/\/catalog$/);
  await expect(
    visiblePage(fromEmail).getByRole("heading", { level: 1, name: "Catalog" }),
  ).toBeVisible();
  await mailClient.close();
});

test("a sign-in link signs into the existing account for that email", async ({
  page,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await signOut(page);

  await page.goto(`${appUrl}/link`);
  const main = visiblePage(page);
  await main.getByLabel("Email", { exact: true }).fill(email);
  await main.getByRole("button", { name: "Email me a link" }).click();
  await expect(
    main.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
  await page.goto(latestLink(email));

  await expect(
    visiblePage(page).getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
});
