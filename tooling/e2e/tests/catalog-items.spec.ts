import { expect, test } from "@playwright/test";
import {
  newEmail,
  runInBackend,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { catalogPicker } from "../support/items";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where the bundled Catalog can be loaded",
);
test.use({ locale: "en-US" });

test("add an Item from the Catalog, then more of it from the entry's page", async ({
  page,
}) => {
  // The bundled Catalog: United States silver dollars. Loading it again changes nothing.
  runInBackend("catalog/seed:load", {});
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/collection`);
  const main = visiblePage(page);

  // A coin starts on the Catalog picker.
  await main.getByRole("button", { name: "Add Item" }).first().click();
  const picker = catalogPicker(page);
  await picker
    .getByPlaceholder("Search coins by title, denomination, series or country…")
    .fill("1881 cc morgan");
  await picker.getByRole("option", { name: /Morgan dollar 1881-CC/ }).click();
  await expect(picker).toBeHidden();

  // Picking fills the title and the facts, and links the Item to the entry.
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await expect(
    dialog.getByRole("button", {
      name: "Catalog entry: Morgan dollar 1881-CC",
    }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Title")).toHaveValue("Morgan dollar 1881-CC");
  await expect(
    dialog.getByRole("button", { name: "Country: United States" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Grade: Set grade" }).click();
  await page.getByPlaceholder("Grade").fill("63");
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  const row = main.getByRole("link", { name: /Morgan dollar 1881-CC/ });
  await expect(row).toContainText("1881 · 1 dollar · United States");
  await expect(row).toContainText("MS-63");

  // The next coin's picker offers it among the recently picked.
  await main.getByRole("button", { name: "Add Item" }).first().click();
  await expect(picker.getByText("Recently picked")).toBeVisible();
  await expect(
    picker.getByRole("option", { name: /Morgan dollar 1881-CC/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // The Item shows the entry's facts and links back to it.
  await row.click();
  const detail = visiblePage(page);
  await expect(detail.getByText("26.73 g")).toBeVisible();
  await detail.getByRole("link", { name: "Morgan dollar 1881-CC" }).click();
  await page.waitForURL(
    (url) => url.pathname === "/catalog/us-morgan-dollar-1881-cc",
  );

  // Quick add: one more Item, with a Quantity of 3.
  const entry = visiblePage(page);
  await entry.getByRole("button", { name: "Add to Collection" }).click();
  const quickAdd = page.getByRole("dialog", { name: "Add to Collection" });
  await quickAdd.getByLabel("Quantity").fill("3");
  await quickAdd.getByRole("button", { name: /^Add Item/ }).click();
  await expect(quickAdd).toBeHidden();
  await expect(page.getByText("Item added to your Collection")).toBeVisible();

  await page.goto(`${appUrl}/collection`);
  const rows = visiblePage(page).getByRole("link", {
    name: /Morgan dollar 1881-CC/,
  });
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "×3" })).toHaveCount(1);
});
