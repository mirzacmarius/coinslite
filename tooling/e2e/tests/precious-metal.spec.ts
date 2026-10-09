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
  "Needs the local test backend, where prices can be stored directly",
);
test.use({ locale: "en-US" });

test("a bullion preset fills a coin's precious metal, and its detail shows the Metal value", async ({
  page,
}) => {
  // Stored the way the scheduled refresh stores them: gold at 2400 dollars an ounce.
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
  const main = visiblePage(page);

  await main.getByRole("button", { name: "Add Item" }).first().click();
  await addManually(page);
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByRole("button", { name: "More details" }).click();
  await expect(dialog.getByLabel("Weight")).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Bullion preset: Fill from a bullion coin" })
    .click();
  await page.getByRole("option", { name: "Krugerrand 1 oz gold" }).click();

  await expect(dialog.getByLabel("Title")).toHaveValue("Krugerrand 1 oz gold");
  await expect(
    dialog.getByRole("button", { name: "Country: South Africa" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Metal: Gold" }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Weight")).toHaveValue("33.93");
  await expect(dialog.getByLabel("Purity")).toHaveValue("0.9167");
  await expect(
    dialog.getByLabel("Bullion coin, bought for its metal"),
  ).toBeChecked();
  await dialog.getByLabel("Quantity").fill("2");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  await main.getByRole("link", { name: /Krugerrand 1 oz gold/ }).click();
  const detail = visiblePage(page);
  await expect(detail.getByText("33.93 g")).toBeVisible();
  // 33.93 g × 0.9167 is a hair over a troy ounce of gold: $2,400.01 a piece, × 2.
  await expect(detail.getByText("$4,800.02")).toBeVisible();
});
