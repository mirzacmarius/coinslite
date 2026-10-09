import { readFile } from "node:fs/promises";
import { type Locator, type Page, expect, test } from "@playwright/test";
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

/** Adds an Item of the given type with just a title. */
async function addItem(page: Page, main: Locator, title: string, type: string) {
  await main.getByRole("button", { name: "Add Item" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill(title);
  if (type !== "Coin") {
    await dialog.getByRole("button", { name: "Item type: Coin" }).click();
    await page.getByRole("option", { name: type }).click();
  }
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();
}

test("search, filter, sort and switch views, with the view kept in the URL", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await addItem(page, main, "Krone 1875", "Coin");
  await addItem(page, main, "100 kroner note", "Banknote");
  await addItem(page, main, "Posthorn", "Stamp");
  const items = main.getByRole("listitem").getByRole("link");
  await expect(items).toHaveCount(3);

  // Search runs as you type and lands in the URL.
  await main.getByLabel("Search the Collection").fill("kron");
  await expect(page).toHaveURL(/[?&]q=kron/);
  await expect(items).toHaveCount(2);
  await main.getByRole("button", { name: "Clear search" }).click();
  await expect(items).toHaveCount(3);

  // A filter becomes a chip, survives a reload, and comes off again.
  await main.getByRole("button", { name: /^Filter/ }).click();
  await page.getByRole("option", { name: /^Item type/ }).click();
  await page.getByRole("option", { name: /^Banknote/ }).click();
  await expect(page).toHaveURL(/[?&]type=banknote/);
  await expect(items).toHaveCount(1);
  await expect(items).toContainText("100 kroner note");
  await page.reload();
  const reloaded = visiblePage(page);
  await expect(
    reloaded.getByRole("button", { name: "Item type: Banknote" }),
  ).toBeVisible();
  await expect(reloaded.getByRole("listitem").getByRole("link")).toHaveCount(1);
  await reloaded
    .getByRole("button", { name: "Remove filter: Item type" })
    .click();
  await expect(reloaded.getByRole("listitem").getByRole("link")).toHaveCount(3);

  // Sort and layout live in the Display menu; the layout is kept on the device.
  await reloaded.getByRole("button", { name: "Display" }).click();
  await page.getByRole("combobox", { name: "Sort" }).click();
  await page.getByRole("option", { name: "Newest added" }).click();
  await expect(page).toHaveURL(/[?&]sort=newest/);
  await expect(
    reloaded.getByRole("listitem").getByRole("link").first(),
  ).toContainText("Posthorn");
  await page.getByRole("radio", { name: "Grid" }).check();
  await page.keyboard.press("Escape");
  await page.goto(`${appUrl}/collection`);
  const later = visiblePage(page);
  await expect(later.getByRole("listitem").getByRole("link")).toHaveCount(3);
  await later.getByRole("button", { name: "Display" }).click();
  await expect(page.getByRole("radio", { name: "Grid" })).toBeChecked();
});

test("a view nothing matches says so and clears in one click", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await addItem(page, main, "Krone 1875", "Coin");

  await page.goto(`${appUrl}/collection?q=dollar`);
  const filtered = visiblePage(page);
  await expect(
    filtered.getByText("No Items match these filters"),
  ).toBeVisible();
  await filtered.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    filtered.getByRole("link", { name: /Krone 1875/ }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/collection$/);
});

test("on the Free plan, Export shows the way to Premium instead of a file", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await addItem(page, main, "Krone 1875", "Coin");

  await main.getByRole("button", { name: "Export" }).click();
  await expect(
    page.getByText("Exporting your Collection is part of Premium."),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Upgrade to Premium" }).click();
  await expect(page).toHaveURL(/\/settings\/billing$/);
});

test("a Premium member exports the Collection view as a PDF and as a CSV", async ({
  page,
}) => {
  const email = newEmail();
  await signUpAndVerify(page, email);
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await addItem(page, main, "Krone 1875", "Coin");
  await addItem(page, main, "Posthorn", "Stamp");
  // Premium, here without a payment.
  runInBackend("testing/premium:grant", { email });

  // The exports cover the view on screen.
  await main.getByLabel("Search the Collection").fill("krone");
  await expect(page).toHaveURL(/[?&]q=krone/);
  await expect(main.getByRole("listitem").getByRole("link")).toHaveCount(1);

  const menu = page.getByRole("menu");
  const openExport = async (format: "PDF" | "CSV") => {
    const entry = menu.getByRole("menuitem", { name: `Export as ${format}` });
    // Retried until the menu shows Premium's entries.
    await expect(async () => {
      if (await menu.isVisible()) await page.keyboard.press("Escape");
      await main.getByRole("button", { name: "Export" }).click();
      await expect(menu.getByText("1 Item in this view")).toBeVisible({
        timeout: 1000,
      });
      await expect(entry).toBeEnabled({ timeout: 1000 });
    }).toPass();
    return entry;
  };

  const pdfDownload = page.waitForEvent("download");
  await (await openExport("PDF")).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(
    /^coinslite-collection-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  const pdfFile = await readFile(await pdf.path());
  expect(pdfFile.subarray(0, 5).toString("latin1")).toBe("%PDF-");

  const csvDownload = page.waitForEvent("download");
  await (await openExport("CSV")).click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toMatch(
    /^coinslite-collection-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const csvText = await readFile(await csv.path(), "utf8");
  expect(csvText).toContain("Krone 1875");
  expect(csvText).not.toContain("Posthorn");
});
