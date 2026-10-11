import { type Page, expect, test } from "@playwright/test";
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
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

async function addItem(page: Page, title: string, marketValue?: string) {
  await visiblePage(page)
    .getByRole("button", { name: "Add Item" })
    .first()
    .click();
  await addManually(page);
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill(title);
  if (marketValue) {
    await dialog.getByRole("button", { name: "More details" }).click();
    await dialog.getByLabel("Market value").fill(marketValue);
  }
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
  await dialog.getByLabel("Sale note").fill("Oslo coin fair");
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

test("a sold Item leaves the Collection totals and the Insurance report", async ({
  page,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await page.goto(`${appUrl}/collection`);
  await addItem(page, "1 krone 1875", "100");
  await addItem(page, "5 kroner 1999", "50");
  const main = visiblePage(page);
  // The totals are a direct child of the page, which visiblePage leaves out.
  const totals = page.getByRole("region", {
    name: /^(Collection totals|Totals)$/,
  });
  await expect(totals).toContainText("$150.00");

  await main.getByRole("link", { name: /5 kroner 1999/ }).click();
  await visiblePage(page).getByRole("button", { name: "Sell" }).click();
  const dialog = page.getByRole("dialog", { name: "Sell “5 kroner 1999”" });
  await dialog.getByRole("button", { name: /^Mark as sold/ }).click();
  await expect(dialog).toBeHidden();

  await page.goto(`${appUrl}/collection`);
  await expect(totals).toContainText("$100.00");
  await expect(totals).not.toContainText("$150.00");

  runInBackend("testing/premium:grant", { email });
  await page.goto(`${appUrl}/settings/insurance-report`);
  const preview = main.getByRole("region", { name: "Preview" });
  const figure = (term: string) =>
    preview.locator(`dt:text-is("${term}") + dd`);
  await expect(figure("Pieces")).toHaveText("1");
  await expect(figure("Insured value")).toHaveText("$100.00");
});

test("sell part of an Item: the rest stay owned, the sold pieces show in the sold view", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await main.getByRole("button", { name: "Add Item" }).first().click();
  await addManually(page);
  const add = page.getByRole("dialog", { name: "New Item" });
  await add.getByLabel("Title").fill("1 krone 1875");
  await add.getByLabel("Quantity").fill("3");
  await add.getByRole("button", { name: /^Add Item/ }).click();
  await expect(add).toBeHidden();
  await main.getByRole("link", { name: /1 krone 1875/ }).click();

  await visiblePage(page).getByRole("button", { name: "Sell" }).click();
  const dialog = page.getByRole("dialog", { name: "Sell “1 krone 1875”" });
  await dialog.getByLabel("Pieces sold").fill("4");
  await dialog.getByRole("button", { name: /^Mark as sold/ }).click();
  await expect(
    dialog.getByText("Enter a whole number from 1 to 3."),
  ).toBeVisible();
  await dialog.getByLabel("Pieces sold").fill("1");
  await dialog.getByRole("button", { name: /^Mark as sold/ }).click();
  await expect(dialog).toBeHidden();

  await page.goto(`${appUrl}/collection`);
  await expect(main.getByRole("link", { name: /1 krone 1875/ })).toContainText(
    "×2",
  );
  await page.goto(`${appUrl}/collection?status=sold`);
  const sold = main.getByRole("link", { name: /1 krone 1875/ });
  await expect(sold).toHaveCount(1);
  await expect(sold).not.toContainText("×");
});

test("selling an Item with a Purchase price shows the Realised Gain/loss on the Overview", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await main.getByRole("button", { name: "Add Item" }).first().click();
  await addManually(page);
  const add = page.getByRole("dialog", { name: "New Item" });
  await add.getByLabel("Title").fill("1 krone 1875");
  await add.getByRole("button", { name: "More details" }).click();
  await add.getByLabel("Purchase price").fill("100");
  await add.getByRole("button", { name: /^Add Item/ }).click();
  await expect(add).toBeHidden();
  await addItem(page, "5 kroner 1999");

  await page.goto(`${appUrl}/`);
  const totals = main.getByRole("region", { name: "Collection totals" });
  await expect(totals).toContainText("Total Purchase price");
  await expect(totals).not.toContainText("Realised Gain/loss");

  await page.goto(`${appUrl}/collection`);
  await main.getByRole("link", { name: /1 krone 1875/ }).click();
  await visiblePage(page).getByRole("button", { name: "Sell" }).click();
  const dialog = page.getByRole("dialog", { name: "Sell “1 krone 1875”" });
  await dialog.getByLabel("Sale price").fill("150");
  await dialog.getByRole("button", { name: /^Mark as sold/ }).click();
  await expect(dialog).toBeHidden();

  await page.goto(`${appUrl}/`);
  await expect(totals).toContainText("Realised Gain/loss");
  await expect(totals).toContainText("+$50.00");

  // The sold view's totals, collapsed as for any narrowed view, sum up the
  // sale instead of the Market value.
  await page.goto(`${appUrl}/collection?status=sold`);
  const soldTotals = page.getByRole("region", { name: "Sold totals" });
  await expect(soldTotals).toContainText("Sold for $150.00");
  await expect(soldTotals).toContainText("Realised Gain/loss +$50.00");
  await expect(soldTotals).not.toContainText("Market value");
});
