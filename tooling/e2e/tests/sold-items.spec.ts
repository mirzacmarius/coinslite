import { type Page, expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { addManually } from "../support/items";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

async function addItem(page: Page, title: string) {
  await visiblePage(page)
    .getByRole("button", { name: "Add Item" })
    .first()
    .click();
  await addManually(page);
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();
}

test("sell an Item, find it in the sold view, then mark it owned again", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  await addItem(page, "1 krone 1875");
  await addItem(page, "5 kroner 1999");
  const main = visiblePage(page);
  await main.getByRole("link", { name: /1 krone 1875/ }).click();

  const detail = visiblePage(page);
  await detail.getByRole("button", { name: "Sell" }).click();
  const dialog = page.getByRole("dialog", { name: "Sell “1 krone 1875”" });
  await dialog.getByLabel("Sold on").fill("2026-10-01");
  await dialog.getByLabel("Sale price").fill("210");
  await dialog.getByLabel("Note").fill("Oslo coin fair");
  await dialog.getByRole("button", { name: /^Mark as sold/ }).click();
  await expect(dialog).toBeHidden();
  await expect(detail.getByText("Sold", { exact: true })).toBeVisible();
  await expect(detail.getByText("Oslo coin fair")).toBeVisible();

  // The sold Item leaves the Collection's default view…
  await page.goto(`${appUrl}/collection`);
  await expect(main.getByRole("link", { name: /5 kroner 1999/ })).toBeVisible();
  await expect(main.getByRole("link", { name: /1 krone 1875/ })).toHaveCount(0);

  // …and the sold view shows only it, with a chip to leave it.
  await main.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("option", { name: /Status/ }).click();
  await page.getByRole("option", { name: /Sold/ }).click();
  await expect(page).toHaveURL(/status=sold/);
  await expect(main.getByRole("link", { name: /1 krone 1875/ })).toBeVisible();
  await expect(main.getByRole("link", { name: /5 kroner 1999/ })).toHaveCount(
    0,
  );
  await main.getByRole("link", { name: /1 krone 1875/ }).click();

  await detail.getByRole("button", { name: "Mark as owned" }).click();
  await page
    .getByRole("alertdialog", { name: "Mark “1 krone 1875” as owned?" })
    .getByRole("button", { name: "Mark as owned" })
    .click();
  await expect(detail.getByRole("button", { name: "Sell" })).toBeVisible();
  await page.goto(`${appUrl}/collection`);
  await expect(main.getByRole("link", { name: /1 krone 1875/ })).toBeVisible();
});
