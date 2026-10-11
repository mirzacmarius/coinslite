import { type BrowserContext, type Page, expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify } from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

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
      page.getByRole("heading", {
        level: 1,
        name: "Melde dich an, um deine Sammlung zu sehen",
      }),
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
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sign in to your collection",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: /^Language/ }).click();
    await page.getByRole("menuitemradio", { name: "Română" }).click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Conectează-te la colecția ta",
      }),
    ).toBeVisible();
    const cookie = await languageCookie(context);
    expect(cookie?.value).toBe("ro");
    const oneMonthFromNow = Date.now() / 1000 + 30 * 24 * 60 * 60;
    expect(cookie?.expires).toBeGreaterThan(oneMonthFromNow);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Conectează-te la colecția ta",
      }),
    ).toBeVisible();
  });
});

test.describe("a stale cookie of the translation library", () => {
  test.use({ locale: "en-US" });

  /** This browser chose `chosen`, but the library's own cookie still says `stale`. */
  const withCookies = async (
    context: BrowserContext,
    chosen: string,
    stale: string,
  ) => {
    const { hostname } = new URL(appUrl);
    await context.addCookies([
      { name: LANGUAGE_COOKIE, value: chosen, domain: hostname, path: "/" },
      { name: "Next-Locale", value: stale, domain: hostname, path: "/" },
    ]);
  };

  test("doesn't override English chosen on this browser", async ({
    page,
    context,
  }) => {
    await withCookies(context, "en", "nb");
    await page.goto(appUrl);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sign in to your collection",
      }),
    ).toBeVisible();
  });

  test("doesn't override Norwegian chosen on this browser", async ({
    page,
    context,
  }) => {
    await withCookies(context, "nb", "en");
    await page.goto(appUrl);
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    // A second page load in the same browser agrees.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  });
});

test.describe("signed in", () => {
  test.use({ locale: "en-US" });
  test.skip(!hasLocalBackend, "Needs the local test backend to sign up");

  /** Picks a language from the account menu. */
  async function pickLanguage(page: Page, name: RegExp) {
    await page
      .getByRole("button", {
        name: /^(Account and preferences|Konto og innstillinger)/,
      })
      .click();
    await page.getByRole("menuitem", { name: /^(Language|Språk)/ }).click();
    await page.getByRole("menuitemradio", { name }).click();
  }

  test("switching to Norwegian and back keeps English on the next visit", async ({
    page,
  }) => {
    await signUpAndVerify(page, newEmail());
    await page.goto(`${appUrl}/collection`);
    await pickLanguage(page, /^Norsk/);
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await pickLanguage(page, /^English/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // The profile's previous language mustn't win the switch back.
    await page.goto(`${appUrl}/settings`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.waitForTimeout(1_000);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
