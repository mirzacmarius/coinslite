import { expect, test } from "@playwright/test";
import { newEmail, runInBackend, signUpAndVerify } from "../support/accounts";
import { hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where prices can be stored directly",
);
test.use({ locale: "en-US" });

test("the sidebar shows Spot prices in the Home currency", async ({ page }) => {
  // Stored the way the scheduled refresh stores them; the test backend has no provider key.
  runInBackend("spotPrices:record", {
    quotedAt: Date.now(),
    perDollar: {
      NOK: 10,
      SEK: 10.5,
      DKK: 6,
      EUR: 0.8,
      RON: 4,
      GBP: 0.75,
      USD: 1,
      CHF: 0.9,
      XAU: 1 / 2400,
      XAG: 1 / 30,
    },
  });

  // An American browser suggests US dollars as the Home currency.
  await signUpAndVerify(page, newEmail());

  const prices = page.getByRole("region", { name: "Spot prices" });
  await expect(prices.getByRole("row", { name: /Gold/ })).toContainText(
    "$2,400.00",
  );
  await expect(prices.getByRole("row", { name: /Silver/ })).toContainText(
    "$30.00",
  );
});
