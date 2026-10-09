import { execFileSync } from "node:child_process";
import { type Page, expect } from "@playwright/test";
import { appUrl, backendDir } from "../urls";

export const password = "correct horse battery";
export const newEmail = () =>
  `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

/** The newest code emailed to an address, read from the test backend's outbox. */
export function latestCode(email: string): string {
  const output = execFileSync(
    "npx",
    [
      "convex",
      "run",
      "accounts/emails:latestCodeFor",
      JSON.stringify({ email }),
    ],
    {
      cwd: backendDir,
      env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
      encoding: "utf8",
    },
  );
  const code = JSON.parse(output.trim());
  if (typeof code !== "string")
    throw new Error(`No code was emailed to ${email}`);
  return code;
}

export async function signUp(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox", { name: /I accept/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
}

export async function signUpAndVerify(page: Page, email: string) {
  await page.goto(`${appUrl}/signup`);
  await signUp(page, email);
  await page.getByLabel("Code").fill(latestCode(email));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
}

export async function signOut(page: Page) {
  // A click before the page has hydrated doesn't open the menu; try again until it does.
  await expect(async () => {
    await page.getByRole("button", { name: "Account and preferences" }).click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
