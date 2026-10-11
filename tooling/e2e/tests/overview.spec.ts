import { type Page, expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { addManually, catalogPicker } from "../support/items";
import { appUrl, hasLocalBackend } from "../urls";

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

  // A click before the page has hydrated does nothing; try until the
  // dialog opens, on the Catalog picker as for every banknote.
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await expect(async () => {
    await main.getByRole("button", { name: "Add banknote" }).click();
    await expect(catalogPicker(page)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(
    catalogPicker(page).getByPlaceholder(
      "Search banknotes by title, denomination, series or country…",
    ),
  ).toBeVisible();
  await addManually(page);
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

/** Every row of the totals card reaches the card's right edge: no empty cell ends a row. */
async function expectTotalsRowsFull(page: Page) {
  // The Collection page's totals are a direct child of the page, which
  // visiblePage's descendants leave out; a hidden earlier page has no role.
  const figures = page
    .getByRole("region", { name: /^(Collection totals|Totals)$/ })
    .locator("dl")
    .first();
  const rows = await figures.evaluate((list) => {
    const right = list.getBoundingClientRect().right;
    const byTop = new Map<number, number>();
    for (const cell of Array.from(list.children)) {
      const box = cell.getBoundingClientRect();
      const top = Math.round(box.top);
      byTop.set(top, Math.max(byTop.get(top) ?? 0, box.right));
    }
    return [...byTop.values()].map((rowRight) => right - rowRight);
  });
  expect(rows.length).toBeGreaterThan(0);
  for (const gap of rows) expect(gap).toBeLessThanOrEqual(2);
}

test("the totals card has no empty cell, and a stamp's Grade note hint suits stamps", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  const main = visiblePage(page);

  // A stamp, typed in.
  await page.goto(`${appUrl}/collection`);
  await main.getByRole("button", { name: "Add Item" }).first().click();
  await addManually(page);
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill("Posthorn 1872");
  await dialog.getByRole("button", { name: "Item type: Coin" }).click();
  await page.getByRole("option", { name: "Stamp" }).click();
  await dialog.getByRole("button", { name: "More details" }).click();
  await expect(dialog.getByLabel("Grade note")).toHaveAttribute(
    "placeholder",
    "e.g. short perforation, thin",
  );
  await dialog.getByLabel("Market value").fill("40");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/collection"]) {
      await page.goto(`${appUrl}${path}`);
      // The Collection page's totals start collapsed on a phone.
      if (path === "/collection" && width === 375) {
        const totals = visiblePage(page).getByRole("button", {
          name: /^Totals/,
        });
        await expect(totals).toHaveAttribute("aria-expanded", "false");
        await totals.click();
      }
      await expectTotalsRowsFull(page);
    }
  }
});
