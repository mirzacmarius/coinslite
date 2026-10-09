import { readFile } from "node:fs/promises";
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
  "Needs the local test backend, where Premium can be granted without a payment",
);
test.use({ locale: "en-US" });

test("the Insurance report is Premium's; a Premium member previews it and downloads the PDF", async ({
  page,
}) => {
  const email = newEmail();
  // An American browser suggests US dollars as the Home currency.
  await signUpAndVerify(page, email);

  await expect(async () => {
    await page.keyboard.press("c");
    await expect(page.getByRole("dialog", { name: "New Item" })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  const dialog = page.getByRole("dialog", { name: "New Item" });
  await dialog.getByLabel("Title").fill("2 kroner 1914");
  await dialog.getByLabel("Quantity").fill("3");
  await dialog.getByRole("button", { name: "More details" }).click();
  await dialog.getByLabel("Market value").fill("200");
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();

  // On the Free plan, Account's link leads to the way to Premium.
  await page.goto(`${appUrl}/settings`);
  await visiblePage(page)
    .getByRole("link", { name: /Insurance report/ })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Insurance report" }),
  ).toBeVisible();
  const main = visiblePage(page);
  await expect(
    main.getByRole("heading", {
      name: "The Insurance report is part of Premium",
    }),
  ).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Upgrade to Premium" }),
  ).toHaveAttribute("href", /\/settings\/billing$/);

  // Premium arrives (here without a payment) and the report opens up.
  runInBackend("testing/premium:grant", { email });
  await expect(
    main.getByRole("checkbox", { name: "Insured value" }),
  ).toBeChecked();
  await expect(
    main.getByRole("checkbox", { name: "Purchase price" }),
  ).not.toBeChecked();
  const preview = main.getByRole("region", { name: "Preview" });
  const figure = (term: string) =>
    preview.locator(`dt:text-is("${term}") + dd`);
  await expect(figure("Pieces")).toHaveText("3");
  // 3 × $200, the highest of the chosen values.
  await expect(figure("Insured value")).toHaveText("$600.00");

  const downloading = page.waitForEvent("download");
  await main.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    /^insurance-report-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  const pdf = await readFile(await download.path());
  expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
});
