import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";
import { appUrl } from "../urls";

const galleryUrl = `${appUrl}/design`;

async function expectNoAccessibilityViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map(
      ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(", ")}`,
    ),
  ).toEqual([]);
}

/** The sidebar and the phone tabs share a label; only one is shown at a time. */
const visibleNavigation = (page: Page) =>
  page.getByRole("navigation", { name: "Main" }).filter({ visible: true });

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

  test("keyboard users can skip straight to the content", async ({ page }) => {
    await page.goto(galleryUrl);
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
