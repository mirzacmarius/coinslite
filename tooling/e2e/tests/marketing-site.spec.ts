import { expect, test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "../support/accessibility";
import { appUrl, webUrl } from "../urls";

test.describe("with a German browser", () => {
  test.use({ locale: "de-DE" });

  test("the site opens in German, at its own address", async ({ page }) => {
    await page.goto(webUrl);

    await expect(page).toHaveURL(`${webUrl}/de`);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Deine Sammlung, sauber erfasst und in deiner Währung bewertet",
      }),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test("the old privacy policy and terms addresses open in German", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/privacy`);
    await expect(page).toHaveURL(`${webUrl}/de/privacy`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Datenschutzerklärung" }),
    ).toBeVisible();

    await page.goto(`${webUrl}/terms`);
    await expect(page).toHaveURL(`${webUrl}/de/terms`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Nutzungsbedingungen" }),
    ).toBeVisible();
  });

  test("an address the site doesn't have says so in German", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/no-such-page`);

    await expect(page).toHaveURL(`${webUrl}/de/no-such-page`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" }),
    ).toBeVisible();
  });
});

test.describe("with an English browser", () => {
  test.use({ locale: "en-US" });

  test("creating an account opens the app in the language being read", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/de`);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Kostenloses Konto erstellen" })
      .first()
      .click();

    await expect(page).toHaveURL(`${appUrl}/signup`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Erstelle dein Konto" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Datenschutzerklärung" }),
    ).toHaveAttribute("href", `${webUrl}/de/privacy`);
  });

  test("a picked language is kept for later visits", async ({ page }) => {
    await page.goto(`${webUrl}/en`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Your Collection, recorded properly and valued in your currency",
      }),
    ).toBeVisible();

    // The menu opens once the page has hydrated: retry the click until it does.
    const trigger = page.getByRole("button", { name: "Language: English" });
    const romanian = page.getByRole("menuitem", { name: "Română" });
    await expect(async () => {
      if (!(await romanian.isVisible())) await trigger.click();
      await expect(romanian).toBeVisible({ timeout: 1000 });
    }).toPass();
    await romanian.click();

    await expect(page).toHaveURL(`${webUrl}/ro`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Colecția ta, înregistrată cum trebuie și evaluată în moneda ta",
      }),
    ).toBeVisible();

    await page.goto(webUrl);
    await expect(page).toHaveURL(`${webUrl}/ro`);
  });

  test("the legal pages are drafts until the operator's details are in", async ({
    page,
  }) => {
    await page.goto(`${webUrl}/en/terms`);

    await expect(page.getByText(/^Draft:/)).toBeVisible();
    await expect(
      page.getByText("[operator’s legal name]").first(),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
});
