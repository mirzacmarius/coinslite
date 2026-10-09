import { execFileSync } from "node:child_process";
import { type Page, expect } from "@playwright/test";
import { appUrl, backendDir } from "../urls";

export const password = "correct horse battery";
export const newEmail = () =>
  `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

export function runInBackend(functionName: string, args: object) {
  const output = execFileSync(
    "npx",
    ["convex", "run", functionName, JSON.stringify(args)],
    {
      cwd: backendDir,
      env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
      encoding: "utf8",
    },
  );
  // Functions that return nothing print nothing.
  const result = output.trim();
  return result ? (JSON.parse(result) as unknown) : undefined;
}

/**
 * The link in the newest email to an address, pointed at the app under test
 * (the backend may know the app by another origin).
 */
export function latestLink(email: string): string {
  const link = runInBackend("accounts/emails:latestLinkFor", { email });
  if (typeof link !== "string")
    throw new Error(`No link was emailed to ${email}`);
  const { pathname, search, hash } = new URL(link);
  return `${appUrl}${pathname}${search}${hash}`;
}

/** The newest code emailed to an address, read from the test backend's outbox. */
export function latestCode(email: string): string {
  const code = runInBackend("accounts/emails:latestCodeFor", { email });
  if (typeof code !== "string")
    throw new Error(`No code was emailed to ${email}`);
  return code;
}

/**
 * The page on screen. After a link click the previous page stays in the DOM,
 * hidden, so that going back is instant; locators must not match its fields.
 */
export const visiblePage = (page: Page) =>
  // The hidden page can sit inside the same <main>, so take main's visible children.
  page.locator("main:visible > :visible");

export async function signUp(page: Page, email: string) {
  const main = visiblePage(page);
  await main.getByLabel("Email", { exact: true }).fill(email);
  await main.getByLabel("Password", { exact: true }).fill(password);
  await main.getByRole("checkbox", { name: /I accept/ }).check();
  await main.getByRole("button", { name: "Create account" }).click();
  await expect(
    main.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();
}

export async function signUpAndVerify(page: Page, email: string) {
  await page.goto(`${appUrl}/signup`);
  await signUp(page, email);
  const main = visiblePage(page);
  await main.getByLabel("Code").fill(latestCode(email));
  await main.getByRole("button", { name: "Verify email" }).click();
  await expect(
    main.getByRole("heading", { level: 1, name: "Overview" }),
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
