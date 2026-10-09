import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

test("after adding an Item, the Overview shows it among the latest and in the totals", async ({
  page,
}) => {
  // An American browser suggests US dollars as the Home currency.
  await signUpAndVerify(page, newEmail());
  const main = visiblePage(page);
  await expect(main.getByText("Start your Collection")).toBeVisible();

  // A click before the page has hydrated does nothing; try until the dialog opens.
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await expect(async () => {
    await main.getByRole("button", { name: "Add banknote" }).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(
    dialog.getByRole("button", { name: "Item type: Banknote" }),
  ).toBeVisible();
  await dialog.getByLabel("Title").fill("100 kroner 1977");
  await dialog.getByLabel("Quantity").fill("2");
  await dialog.getByRole("button", { name: "More details" }).click();
  await dialog.getByLabel("Year").fill("1977");
  await dialog.getByLabel("Denomination").fill("100 kroner");
  await dialog.getByLabel("Purchase price").fill("75");
  await dialog.getByLabel("Market value").fill("100");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  const latest = main.getByRole("region", { name: "Latest Items" });
  const row = latest.getByRole("link", { name: /100 kroner 1977/ });
  await expect(row).toContainText("1977 · 100 kroner");
  const totals = main.getByRole("region", { name: "Collection totals" });
  await expect(totals).toContainText("Banknotes 2");
  await expect(totals).toContainText("$150.00");
  await expect(totals).toContainText("$200.00");
  await expect(totals).toContainText("+$50.00");
  await expect(main.getByText("Start your Collection")).toHaveCount(0);

  await row.click();
  await expect(
    visiblePage(page).getByRole("heading", {
      level: 1,
      name: "100 kroner 1977",
    }),
  ).toBeVisible();
});
