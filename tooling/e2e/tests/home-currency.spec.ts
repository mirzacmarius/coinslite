import { expect, test } from "@playwright/test";
import {
  newEmail,
  runInBackend,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { addManually } from "../support/items";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where exchange rates can be stored directly",
);
test.use({ locale: "en-US" });

test("changing the Home currency converts the Collection's amounts", async ({
  page,
}) => {
  // Stored the way the scheduled refresh stores them: 0.80 euro to the dollar.
  runInBackend("spotPrices:record", {
    quotedAt: Date.now(),
    perDollar: {
      NOK: 10,
      SEK: 10.5,
      DKK: 6,
      EUR: 0.8,
      RON: 4,
      GBP: 0.75,
      USD: 1,
      CHF: 0.9,
      XAU: 1 / 2400,
      XAG: 1 / 30,
    },
  });
  // An American browser suggests US dollars as the Home currency.
  await signUpAndVerify(page, newEmail());

  await page.goto(`${appUrl}/collection`);
  await visiblePage(page)
    .getByRole("button", { name: "Add Item" })
    .first()
    .click();
  await addManually(page);
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill("Morgan dollar 1881-S");
  await dialog.getByRole("button", { name: "More details" }).click();
  await dialog.getByLabel("Purchase price").fill("75.50");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  await page.goto(`${appUrl}/settings`);
  await visiblePage(page)
    .getByRole("button", { name: "Home currency: USD" })
    .click();
  await page.getByPlaceholder("Home currency").fill("EUR");
  await page.keyboard.press("Enter");

  const confirm = page.getByRole("alertdialog", {
    name: "Change Home currency to EUR?",
  });
  // One stored amount, the Purchase price, at the stored rate.
  await expect(confirm.getByRole("term").first()).toHaveText(
    "Amounts to convert",
  );
  await expect(confirm.getByRole("definition").first()).toHaveText("1");
  await expect(confirm.getByText("1 USD = 0.8 EUR")).toBeVisible();
  await confirm.getByRole("button", { name: "Change to EUR" }).click();
  await expect(confirm).toBeHidden();
  await expect(
    visiblePage(page).getByRole("button", { name: "Home currency: EUR" }),
  ).toBeVisible();

  await page.goto(`${appUrl}/collection`);
  await visiblePage(page)
    .getByRole("link", { name: /Morgan dollar 1881-S/ })
    .click();
  // The Collection shows the amount too; check it on the Item once it's open.
  const detail = visiblePage(page);
  await expect(
    detail.getByRole("heading", { level: 1, name: "Morgan dollar 1881-S" }),
  ).toBeVisible();
  // $75.50 at 0.80 is €60.40.
  await expect(detail.getByText("€60.40")).toBeVisible();
});
