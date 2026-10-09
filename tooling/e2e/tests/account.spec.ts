import { expect, test } from "@playwright/test";
import {
  latestLink,
  newEmail,
  password,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("the Account screen shows the plan and keeps contact details", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/settings`);
  const main = visiblePage(page);
  await expect(main.getByText("Free plan")).toBeVisible();

  await main.getByLabel("Full name").fill("Ada Lovelace");
  await main.getByLabel("City").fill("London");
  await main.getByRole("button", { name: "Country: Set country" }).click();
  await page.getByPlaceholder("Country").fill("United Kingdom");
  await page.keyboard.press("Enter");
  await main.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(visiblePage(page).getByLabel("Full name")).toHaveValue(
    "Ada Lovelace",
  );
  await expect(
    visiblePage(page).getByRole("button", { name: "Country: United Kingdom" }),
  ).toBeVisible();
});

test("a new email takes over once the link sent to it is opened", async ({
  page,
  browser,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await page.goto(`${appUrl}/settings`);
  const main = visiblePage(page);
  const replacement = newEmail();

  await main.getByLabel("New email").fill(replacement);
  await main.getByRole("button", { name: "Send confirmation link" }).click();
  await expect(
    main.getByText(`We sent a link to ${replacement}.`, { exact: false }),
  ).toBeVisible();

  // Opened where nobody is signed in: the link waits while its owner signs in.
  const phone = await browser.newContext({ locale: "en-US" });
  const other = await phone.newPage();
  await other.goto(latestLink(replacement));
  await visiblePage(other)
    .getByRole("link", { name: "Sign in to confirm" })
    .click();
  const login = visiblePage(other);
  await login.getByLabel("Email", { exact: true }).fill(email);
  await login.getByLabel("Password", { exact: true }).fill(password);
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await visiblePage(other)
    .getByRole("button", { name: "Confirm new email" })
    .click();
  await expect(
    visiblePage(other).getByText(`Your email is now ${replacement}.`),
  ).toBeVisible();
  await phone.close();

  await page.goto(`${appUrl}/settings`);
  await expect(
    visiblePage(page).getByText(`You sign in as ${replacement}.`),
  ).toBeVisible();
});

test("the language picked on one device is used on the next", async ({
  page,
  browser,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await page.goto(`${appUrl}/settings`);
  await visiblePage(page)
    .getByRole("button", { name: "Language: English" })
    .click();
  await page.getByRole("option", { name: "Română" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");

  const laptop = await browser.newContext({ locale: "en-US" });
  const other = await laptop.newPage();
  await other.goto(`${appUrl}/login`);
  const login = visiblePage(other);
  await login.getByLabel("Email", { exact: true }).fill(email);
  await login.getByLabel("Password", { exact: true }).fill(password);
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(other.locator("html")).toHaveAttribute("lang", "ro");
  await laptop.close();
});

test("feedback goes to the team from the Account screen", async ({ page }) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/settings`);
  await visiblePage(page)
    .getByRole("button", { name: "Send feedback" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Send feedback" });

  await dialog.getByRole("button", { name: "Send" }).click();
  await expect(dialog.getByText("Write a message first.")).toBeVisible();
  await dialog.getByLabel("Message").fill("Albums for stamps, please.");
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect(page.getByText("Thanks! Your feedback was sent.")).toBeVisible();
  await expect(dialog).toBeHidden();
});
