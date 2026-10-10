import { expect, test } from "@playwright/test";
import {
  newEmail,
  runInBackend,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where the bundled Catalog can be loaded",
);
test.use({ locale: "en-US" });

test("browse the Catalog down to an entry, by grouping and by denomination", async ({
  page,
}) => {
  // The bundled Catalog: United States silver dollars. Loading it again changes nothing.
  runInBackend("catalog/seed:load", {});
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/catalog`);
  const main = visiblePage(page);
  const heading = (name: string) =>
    main.getByRole("heading", { level: 1, name, exact: true });

  // Countries and Themes, then a country's groupings, then their entries.
  await main.getByRole("link", { name: /^United States/ }).click();
  await page.waitForURL((url) => url.pathname === "/catalog/us");
  await expect(heading("United States")).toBeVisible();
  await main.getByRole("link", { name: /^Morgan dollar/ }).click();
  await page.waitForURL((url) => url.pathname === "/catalog/us-morgan-dollar");
  await main.getByRole("link", { name: /^Morgan dollar 1881-CC/ }).click();
  await page.waitForURL(
    (url) => url.pathname === "/catalog/us-morgan-dollar-1881-cc",
  );
  await expect(heading("Morgan dollar 1881-CC")).toBeVisible();
  // Mint and mint mark are facts with labels of their own.
  await expect(main.getByText("Carson City", { exact: true })).toBeVisible();
  await expect(main.getByText("CC", { exact: true })).toBeVisible();
  await expect(main.getByRole("img", { name: "No image yet" })).toBeVisible();

  // Back up the breadcrumb, then by denomination and series.
  await main.getByRole("link", { name: "United States", exact: true }).click();
  await main.getByRole("link", { name: "Denominations" }).click();
  await page.waitForURL((url) => url.search === "?by=denomination");
  await main.getByRole("link", { name: /^1 dollar/ }).click();
  await expect(heading("1 dollar")).toBeVisible();
  await main.getByRole("link", { name: /^Peace dollar/ }).click();
  await expect(heading("Peace dollar")).toBeVisible();
  await expect(
    main.getByRole("link", { name: /^Peace dollar 1934-D/ }),
  ).toBeVisible();

  // Every level has its own URL.
  await page.reload();
  await expect(heading("Peace dollar")).toBeVisible();
  await expect(
    main.getByRole("link", { name: /^Peace dollar 1934-D/ }),
  ).toBeVisible();
});
