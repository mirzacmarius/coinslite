import { type Locator, type Page, expect, test } from "@playwright/test";
import de from "../../../apps/app/src/locales/de";
import en from "../../../apps/app/src/locales/en";
import fr from "../../../apps/app/src/locales/fr";
import nb from "../../../apps/app/src/locales/nb";
import ro from "../../../apps/app/src/locales/ro";
import type { Dictionary } from "../../../apps/app/src/locales/types";
import {
  newEmail,
  runInBackend,
  signUpAndVerify,
  visiblePage,
} from "../support/accounts";
import { waitForAddedToasts } from "../support/items";
import { appUrl, hasLocalBackend } from "../urls";

test.skip(
  !hasLocalBackend,
  "Needs the local test backend, where Premium can be granted and the Catalog loaded",
);
test.use({ locale: "en-US" });

/**
 * The key screens in each language: each opens in that language, shows its
 * texts from the language's dictionary, and none of them in English. The
 * dictionaries themselves are checked for English fallbacks by unit tests
 * (apps/app/src/locales/dictionaries.test.ts); this checks the screens use them.
 */

type Text = (t: Dictionary) => string;

const languages = [
  {
    code: "nb",
    name: "Norsk bokmål",
    t: nb,
    unitedStates: "USA",
    highRelief: "Preget i høyt relieff, senket fra 1922.",
  },
  {
    code: "de",
    name: "Deutsch",
    t: de,
    unitedStates: "Vereinigte Staaten",
    highRelief: "In Hochrelief geprägt, ab 1922 flacher.",
  },
  {
    code: "fr",
    name: "Français",
    t: fr,
    unitedStates: "États-Unis",
    highRelief: "Frappé en haut relief, abaissé à partir de 1922.",
  },
  {
    code: "ro",
    name: "Română",
    t: ro,
    unitedStates: "Statele Unite ale Americii",
    highRelief: "Bătut în relief înalt, coborât începând din 1922.",
  },
] as const;

const stampTitle = "Posthorn 1 øre 1872";

/** The screens, each with its main heading and texts it always shows. */
const screens: Array<{
  path: string | ((itemPath: string) => string);
  heading: Text | null;
  texts: Text[];
}> = [
  {
    path: "/",
    heading: (t) => t.dashboard.headerTitle,
    texts: [
      (t) => t.overview.add.coin,
      (t) => t.overview.add.stamp,
      (t) => t.overview.latestItems,
      (t) => t.overview.viewCollection,
      (t) => t.spotPrices.title,
    ],
  },
  {
    path: "/collection",
    heading: (t) => t.nav.collection,
    texts: [
      (t) => t.collection.filter,
      (t) => t.collection.display,
      (t) => t.collectionExport.menu,
      (t) => t.collectionTotals.section,
    ],
  },
  {
    // The Item's own page: its title is the owner's, the rest is CoinsLite's.
    path: (itemPath) => itemPath,
    heading: null,
    texts: [
      (t) => t.items.edit,
      (t) => t.items.duplicate,
      (t) => t.items.details,
      (t) => t.items.type,
      (t) => t.items.types.stamp,
    ],
  },
  {
    path: "/albums",
    heading: (t) => t.nav.albums,
    texts: [
      (t) => t.albums.new,
      (t) => t.albums.emptyTitle,
      (t) => t.albums.emptyDescription,
    ],
  },
  {
    path: "/catalog",
    heading: (t) => t.nav.catalog,
    texts: [(t) => t.catalog.theme],
  },
  {
    path: "/settings",
    heading: (t) => t.account.pageTitle,
    texts: [
      (t) => t.account.contact.title,
      (t) => t.account.preferences.title,
      (t) => t.account.preferences.homeCurrency,
      (t) => t.account.email.title,
      (t) => t.account.danger.title,
    ],
  },
  {
    path: "/settings/billing",
    heading: (t) => t.shell.plans,
    texts: [(t) => t.billing.currentPlan, (t) => t.billing.premiumDescription],
  },
  {
    path: "/settings/insurance-report",
    heading: (t) => t.insuranceReport.title,
    texts: [
      (t) => t.insuranceReport.scopeTitle,
      (t) => t.insuranceReport.valuesTitle,
      (t) => t.insuranceReport.previewTitle,
      (t) => t.insuranceReport.ownerTitle,
      (t) => t.insuranceReport.columns.insuredValue,
      (t) => t.insuranceReport.download,
    ],
  },
];

/**
 * The English text as whole words, so a translation that starts the same way
 * ("Exportieren", "Exportă" for "Export") doesn't count as English.
 */
function wholeWords(text: string) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u");
}

/**
 * The words a screen shows, and none of the English ones they replace. Only
 * rendered text counts (innerText), so a page kept hidden after moving on
 * doesn't, and `where` can be all of <main>, header bar included.
 */
async function expectTranslated(where: Locator, t: Dictionary, texts: Text[]) {
  for (const text of texts) {
    await expect(where).toContainText(text(t), { useInnerText: true });
  }
  for (const text of texts) {
    const english = text(en);
    if (english === text(t)) continue;
    await expect(where).not.toContainText(wholeWords(english), {
      useInnerText: true,
    });
  }
}

/** Adds a stamp from the Overview's shortcut and returns its page's path. */
async function addStamp(page: Page) {
  const main = visiblePage(page);
  const dialog = page.getByRole("dialog", { name: en.items.new });
  // A click before the page has hydrated does nothing; try until it opens.
  await expect(async () => {
    if (!(await dialog.isVisible())) {
      await main.getByRole("button", { name: en.overview.add.stamp }).click();
    }
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  await dialog.getByLabel(en.items.title).fill(stampTitle);
  await dialog.getByRole("button", { name: /^Add Item/ }).click();
  await expect(dialog).toBeHidden();
  await waitForAddedToasts(page);
  const link = main.getByRole("link", { name: new RegExp(stampTitle) });
  const href = await link.getAttribute("href");
  if (!href) throw new Error("The new Item has no link");
  return new URL(href, appUrl).pathname;
}

/** Picks a language on the Account screen, which keeps it for the profile. */
async function chooseLanguage(page: Page, name: string, code: string) {
  await page.goto(`${appUrl}/settings`);
  const main = visiblePage(page);
  await expect(
    main.getByRole("heading", { level: 1, name: en.account.pageTitle }),
  ).toBeVisible();
  const option = page.getByRole("option", { name });
  await expect(async () => {
    if (!(await option.isVisible())) {
      await main.getByRole("button", { name: "Language: English" }).click();
    }
    await expect(option).toBeVisible({ timeout: 1000 });
  }).toPass();
  await option.click();
  await expect(page.locator("html")).toHaveAttribute("lang", code);
}

for (const { code, name, t, unitedStates, highRelief } of languages) {
  test(`the key screens read in ${name}`, async ({ page }) => {
    test.setTimeout(180_000);
    const email = newEmail();
    await signUpAndVerify(page, email);
    const itemPath = await addStamp(page);
    // Premium shows the Insurance report itself, not the way to it.
    runInBackend("testing/premium:grant", { email });
    await chooseLanguage(page, name, code);

    for (const screen of screens) {
      const path =
        typeof screen.path === "string" ? screen.path : screen.path(itemPath);
      await page.goto(`${appUrl}${path}`);
      await expect(page.locator("html")).toHaveAttribute("lang", code);
      const main = visiblePage(page);
      await expect(
        main.getByRole("heading", {
          level: 1,
          name: screen.heading ? screen.heading(t) : stampTitle,
          exact: true,
        }),
      ).toBeVisible();
      await expectTranslated(page.locator("main"), t, screen.texts);
    }

    // An address nothing answers.
    await page.goto(`${appUrl}/no-such-page`);
    await expect(
      page.getByRole("heading", { level: 1, name: t.notFound.title }),
    ).toBeVisible();
    await expectTranslated(page.locator("main"), t, [
      (t) => t.notFound.description,
      (t) => t.notFound.home,
    ]);

    // Countries are named in the reader's language, Catalog data stays as it is.
    await page.goto(`${appUrl}/catalog`);
    await expect(
      visiblePage(page).getByRole("link", { name: new RegExp(unitedStates) }),
    ).toBeVisible();

    // A Catalog entry's notes read in the reader's language where translated,
    // otherwise in their source's, marked so screen readers pronounce them right.
    await page.goto(`${appUrl}/catalog/us-peace-dollar-1921`);
    await expect(visiblePage(page).getByText(highRelief)).toBeVisible();
    await page.goto(
      `${appUrl}/catalog/eur2-gr-2004-olympic-games-in-athens-2004`,
    );
    await expect(
      visiblePage(page).getByRole("heading", {
        level: 1,
        name: "Ολυμπιακοί Αγώνες «Αθήνα 2004»",
      }),
    ).toBeVisible();
    await expect(
      visiblePage(page).locator('p[lang="en"]', {
        hasText: /^The twelve stars/,
      }),
    ).toHaveCount(code === "nb" ? 1 : 0);

    // The navigation, on every screen.
    await expectTranslated(
      page.getByRole("navigation", { name: t.shell.primaryNavigation }),
      t,
      [
        (t) => t.nav.overview,
        (t) => t.nav.collection,
        (t) => t.nav.catalog,
        (t) => t.nav.albums,
        (t) => t.nav.account,
      ],
    );
  });
}
