import { type BrowserContext, expect, test } from "@playwright/test";
import { appUrl } from "../urls";

const LANGUAGE_COOKIE = "coinslite-language";
const languageCookie = async (context: BrowserContext) =>
  (await context.cookies()).find(({ name }) => name === LANGUAGE_COOKIE);

test.describe("with a German browser", () => {
  test.use({ locale: "de-DE" });

  test("sign-in is shown in German without storing a choice", async ({
    page,
    context,
  }) => {
    await page.goto(appUrl);

    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(
      page.getByText("Melde dich an, um deine Sammlung zu sehen"),
    ).toBeVisible();
    expect(await languageCookie(context)).toBeUndefined();
  });
});

test.describe("with an English browser", () => {
  test.use({ locale: "en-US" });

  test("a picked language translates the page and is kept for later visits", async ({
    page,
    context,
  }) => {
    await page.goto(appUrl);
    await expect(page.getByText("Sign in to your collection")).toBeVisible();

    await page.getByRole("combobox", { name: "Language" }).click();
    await page.getByRole("option", { name: "Română" }).click();

    await expect(page.getByText("Conectează-te la colecția ta")).toBeVisible();
    const cookie = await languageCookie(context);
    expect(cookie?.value).toBe("ro");
    const oneMonthFromNow = Date.now() / 1000 + 30 * 24 * 60 * 60;
    expect(cookie?.expires).toBeGreaterThan(oneMonthFromNow);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
    await expect(page.getByText("Conectează-te la colecția ta")).toBeVisible();
  });
});
