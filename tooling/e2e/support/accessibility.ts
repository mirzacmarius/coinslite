import AxeBuilder from "@axe-core/playwright";
import { type Page, expect } from "@playwright/test";

/** Fails with the rule ids and elements of any WCAG 2.1 A/AA violation on the page. */
export async function expectNoAccessibilityViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map(
      ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(", ")}`,
    ),
  ).toEqual([]);
}
