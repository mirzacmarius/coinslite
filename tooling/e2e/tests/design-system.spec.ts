import { type Locator, type Page, expect, test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "../support/accessibility";
import { appUrl } from "../urls";

const galleryUrl = `${appUrl}/design`;

/** The sidebar and the phone tabs share a label; only one is shown at a time. */
const visibleNavigation = (page: Page) =>
  page.getByRole("navigation", { name: "Main" }).filter({ visible: true });

/**
 * Clicks `target` until `opened` shows. The page shows before it has hydrated,
 * and a click before then opens nothing.
 */
async function openWith(target: Locator, opened: Locator) {
  await expect(async () => {
    // Don't click again once it's open: that could close it.
    if (!(await opened.isVisible())) await target.click();
    await expect(opened).toBeVisible({ timeout: 1000 });
  }).toPass();
}

test.describe("on a desktop screen", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the shell shows the sidebar navigation", async ({ page }) => {
    await page.goto(galleryUrl);
    const sidebar = visibleNavigation(page);
    await expect(
      sidebar.getByRole("link", { name: "Collection" }),
    ).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Albums" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Design system" }),
    ).toBeVisible();
  });

  test("meets WCAG AA in the light theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(galleryUrl);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expectNoAccessibilityViolations(page);
  });

  test("meets WCAG AA in the dark theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(galleryUrl);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectNoAccessibilityViolations(page);
  });

  test("the workspace menu holds the account, language, appearance and sign-out", async ({
    page,
  }) => {
    await page.goto(galleryUrl);
    await openWith(
      page.getByRole("button", { name: "Account and preferences" }),
      page.getByRole("menu"),
    );
    for (const name of [
      "Account",
      "Plans",
      "Language",
      "Appearance",
      "Sign out",
    ]) {
      await expect(page.getByRole("menuitem", { name })).toBeVisible();
    }
    await page.getByRole("menuitem", { name: "Appearance" }).hover();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("a property pill opens a searchable list and keeps the pick", async ({
    page,
  }) => {
    await page.goto(galleryUrl);
    const search = page.getByPlaceholder("Album");
    await openWith(
      page.getByRole("button", { name: "Album: Travel" }).first(),
      search,
    );
    await search.fill("mor");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Album: Morgans" }).first(),
    ).toBeVisible();
  });

  test("a dialog traps focus, passes WCAG AA and gives focus back on Esc", async ({
    page,
  }) => {
    // Shortcut hints read "Ctrl" outside Apple devices; check that longer text everywhere.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "platform", {
        get: () => "Linux x86_64",
      });
    });
    await page.goto(galleryUrl);
    const trigger = page.getByRole("button", { name: "New Item dialog" });
    const dialog = page.getByRole("dialog", { name: "New Item" });
    await openWith(trigger, dialog);
    // Scan once the opening fade has finished, not mid-animation.
    await dialog.evaluate((element) =>
      Promise.all(
        element
          .getAnimations({ subtree: true })
          .map(({ finished }) => finished),
      ),
    );
    await expectNoAccessibilityViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("keyboard users can skip straight to the content", async ({ page }) => {
    await page.goto(galleryUrl);
    // The shell streams in after the page loads; until it shows, Tab has
    // nothing of the app's to land on.
    await expect(
      page.getByRole("heading", { level: 1, name: "Design system" }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("the shell shows the four tabs instead of the sidebar", async ({
    page,
  }) => {
    await page.goto(galleryUrl);
    const tabs = visibleNavigation(page);
    await expect(tabs).toHaveCount(1);
    for (const name of ["Overview", "Collection", "Catalog", "Account"]) {
      await expect(tabs.getByRole("link", { name })).toBeVisible();
    }
    await expect(tabs.getByRole("link", { name: "Albums" })).toHaveCount(0);
  });
});

test.describe("on a tablet", () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true });

  test("the shell shows the sidebar, Albums included", async ({ page }) => {
    await page.goto(galleryUrl);
    const sidebar = visibleNavigation(page);
    await expect(sidebar).toHaveCount(1);
    await expect(sidebar.getByRole("link", { name: "Albums" })).toBeVisible();
  });
});

test("the app can be installed: manifest and icons are served", async ({
  request,
}) => {
  const manifest = await request.get(`${appUrl}/manifest.webmanifest`);
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({
    name: "CoinsLite",
    display: "standalone",
  });
  for (const path of ["/icon/192", "/icon/512", "/apple-icon"]) {
    const icon = await request.get(`${appUrl}${path}`);
    expect(icon.ok(), path).toBe(true);
    expect(icon.headers()["content-type"]).toContain("image/png");
  }
});
