import { type Page, expect } from "@playwright/test";

/** The Catalog picker the New Item dialog opens on for coins and banknotes. */
export const catalogPicker = (page: Page) =>
  page.getByRole("dialog", { name: "Pick from the Catalog" });

/**
 * Coins and banknotes are added from the Catalog by default: the New Item
 * dialog opens on the Catalog picker. "Add manually" leaves it to type the
 * facts in.
 */
export async function addManually(page: Page) {
  const picker = catalogPicker(page);
  await picker.getByRole("button", { name: "Add manually" }).click();
  await expect(picker).toBeHidden();
}
