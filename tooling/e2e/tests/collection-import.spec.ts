import { type Page, expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, which keeps emails in an outbox",
);
test.use({ locale: "en-US" });

/** Picks a CSV file in the open Import dialog. */
async function pickFile(page: Page, text: string) {
  await page
    .getByRole("dialog", { name: "Import Items" })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "collection.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(text),
    });
}

test("import a three-row file from the empty Collection: preview, confirm, see the Items", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await main.getByRole("button", { name: "Import from CSV" }).click();

  await pickFile(
    page,
    [
      "Item type,Title,Year,Purchase price,Currency",
      "Coin,Morgan dollar 1881,1881,75.50,USD",
      "Banknote,100 kroner 1977,1977,,",
      "Stamp,Posthorn,,,",
      "Spoon,A spoon,,,",
    ].join("\n"),
  );
  const dialog = page.getByRole("dialog", { name: "Import Items" });
  await expect(dialog.getByText("3 Items will be added")).toBeVisible();
  await expect(
    dialog.getByText("Row 5: the Item type isn't coin, banknote or stamp"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Import 3 Items" }).click();
  await expect(dialog).toBeHidden();

  for (const title of ["Morgan dollar 1881", "100 kroner 1977", "Posthorn"])
    await expect(
      main.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
});

test("import a two-row file with an album column: the Album exists and holds both", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);
  await main.getByRole("button", { name: "Import from CSV" }).click();
  await pickFile(
    page,
    [
      "type,title,album",
      "coin,1 krone 1875,Travel",
      "coin,5 kroner 1999,Travel",
    ].join("\n"),
  );
  const dialog = page.getByRole("dialog", { name: "Import Items" });
  await expect(dialog.getByText("1 new Album")).toBeVisible();
  await dialog.getByRole("button", { name: "Import 2 Items" }).click();
  await expect(dialog).toBeHidden();

  // From the toolbar's menu, the Collection now has Items.
  await expect(
    main.getByRole("button", { name: /Export and import/ }),
  ).toBeVisible();
  await page.goto(`${appUrl}/albums`);
  await expect(
    visiblePage(page).getByRole("link", { name: /Travel/ }),
  ).toContainText("2");
});
