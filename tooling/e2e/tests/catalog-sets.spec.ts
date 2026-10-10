import { expect, test } from "@playwright/test";
import { newEmail, signUpAndVerify, visiblePage } from "../support/accounts";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where the bundled Catalog can be loaded",
);
test.use({ locale: "en-US" });

test("view a grouping as a Set, select what's missing and add it in one go", async ({
  page,
}) => {
  await signUpAndVerify(page, newEmail());
  await page.goto(`${appUrl}/catalog/us-peace-dollar`);
  const main = visiblePage(page);
  const heading = (name: string) =>
    main.getByRole("heading", { level: 1, name, exact: true });
  await expect(heading("Peace dollar")).toBeVisible();

  // 24 Peace dollars, none held: a small Set shows everything.
  await main.getByRole("link", { name: "View as Set" }).click();
  await page.waitForURL(
    (url) => url.pathname === "/catalog/us-peace-dollar/set",
  );
  await expect(heading("Set")).toBeVisible();
  await expect(main.getByText("0 of 24 held")).toBeVisible();
  await expect(main.getByRole("radio", { name: "All (24)" })).toBeChecked();

  // Select every missing entry; the bar offers to add them, within the Free plan.
  const bar = page.getByRole("region", {
    name: "Add selected Catalog entries",
  });
  const selectAllMissing = main.getByRole("button", {
    name: "Select all missing",
  });
  await expect(async () => {
    if (!(await bar.isVisible())) await selectAllMissing.click();
    await expect(bar).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(bar.getByText("24 selected")).toBeVisible();
  await expect(bar.getByText("50 Items left on the Free plan")).toBeVisible();
  await bar.getByRole("button", { name: /^Add 24 Items/ }).click();

  await expect(
    page.getByText("24 Items added to your Collection"),
  ).toBeVisible();
  await expect(bar).toBeHidden();
  await expect(main.getByText("24 of 24 held")).toBeVisible();
  await expect(main.getByText("100%")).toBeVisible();

  // 96 Morgan dollars open on what's missing; all of them don't fit the Free plan.
  await page.goto(`${appUrl}/catalog/us-morgan-dollar/set`);
  await expect(heading("Set")).toBeVisible();
  await expect(main.getByText("0 of 96 held")).toBeVisible();
  await expect(main.getByRole("radio", { name: "Missing (96)" })).toBeChecked();
  await expect(async () => {
    if (!(await bar.isVisible())) await selectAllMissing.click();
    await expect(bar).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(bar.getByText("96 selected")).toBeVisible();
  await expect(
    bar.getByText("The Free plan has room for 26 more Items."),
  ).toBeVisible();
  await expect(
    bar.getByRole("link", { name: "Upgrade to Premium" }),
  ).toBeVisible();
  await expect(
    bar.getByRole("button", { name: /^Add 96 Items/ }),
  ).toBeDisabled();
});
