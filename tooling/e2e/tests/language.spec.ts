import { expect, test } from "@playwright/test";
import { appUrl } from "../urls";

test.describe("with a German browser", () => {
  test.use({ locale: "de-DE" });

  test("sign-in is shown in German", async ({ page }) => {
    await page.goto(appUrl);

    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(
      page.getByText("Melde dich bei deiner Sammlung an"),
    ).toBeVisible();
  });
});

test.describe("with an English browser", () => {
  test.use({ locale: "en-US" });

  test("switching language translates the page and is remembered", async ({
    page,
  }) => {
    await page.goto(appUrl);
    await expect(page.getByText("Sign in to your collection")).toBeVisible();

    await page.getByRole("combobox", { name: "Language" }).click();
    await page.getByRole("option", { name: "Română" }).click();

    await expect(page.getByText("Conectează-te la colecția ta")).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
    await expect(page.getByText("Conectează-te la colecția ta")).toBeVisible();
  });
});
