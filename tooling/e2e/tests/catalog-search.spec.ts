import { expect, test } from "@playwright/test";
import {
  newEmail,
  runInBackend,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where the bundled Catalog can be loaded",
);
test.use({ locale: "en-US" });

test("search the Catalog with a few words, in any order", async ({ page }) => {
  // The bundled Catalog: United States silver dollars. Loading it again changes nothing.
  runInBackend("catalog/seed:load", {});
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/catalog`);
  const main = visiblePage(page);

  const dialog = page.getByRole("dialog", { name: "Search the Catalog" });
  // Retried until the page is interactive.
  await expect(async () => {
    await main.getByRole("button", { name: "Search" }).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  const search = dialog.getByPlaceholder(
    "Search by title, denomination, series or country…",
  );
  await expect(search).toBeFocused();

  await search.fill("m");
  await expect(
    dialog.getByText("Type at least 2 characters to search."),
  ).toBeVisible();

  await search.fill("1881 cc morgan");
  await expect(dialog.getByText("United States · Morgan dollar")).toBeVisible();
  await expect(
    dialog.getByRole("option", { name: /Morgan dollar 1881-CC/ }),
  ).toBeVisible();

  await search.fill("dollar");
  await expect(
    dialog.getByText("Showing the first 50. Add a word to narrow the search."),
  ).toBeVisible();

  await search.fill("zzz");
  await expect(
    dialog.getByText("Nothing in the Catalog matches “zzz”."),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
