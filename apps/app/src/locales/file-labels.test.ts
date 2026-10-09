import { exportLabels } from "@coinslite/backend/convex/collection/exportLabels";
import { collectionPdfMessages } from "@coinslite/backend/convex/collection/pdfMessages";
import { reportMessages } from "@coinslite/backend/convex/insuranceReport/messages";
import { type Locale, locales } from "@coinslite/i18n";
import { describe, expect, test } from "vitest";
import { loaders } from "./loaders";

/**
 * The CSV and the PDFs are written on the server, which can't read these
 * dictionaries, so they keep their own words. They must be the app's words:
 * an Item type, a Grade or a column reads the same on screen and on paper.
 */
describe.each(locales)("%s", async (locale: Locale) => {
  const t = (await loaders[locale]()).default;

  test("the Collection CSV names things as the app does", () => {
    const csv = exportLabels[locale];
    expect(csv.types).toEqual(t.items.types);
    expect(csv.materials).toEqual(t.items.materials);
    expect(csv.scales).toEqual(t.grades.scales);
    expect(csv.strikes).toEqual(t.grades.strikes);
    expect(csv.stampGrades).toEqual(t.grades.stamp);
    const { currency, ...columns } = csv.columns;
    expect(columns).toEqual({
      type: t.items.type,
      title: t.items.title,
      year: t.items.year,
      denomination: t.items.denomination,
      grade: t.items.grade,
      gradingScale: t.items.gradingScale,
      strike: t.items.strike,
      material: t.items.material,
      country: t.items.country,
      quantity: t.items.quantity,
      purchasePrice: t.items.purchasePrice,
      marketValue: t.items.marketValue,
      purchaseDate: t.items.purchaseDate,
      source: t.items.source,
    });
  });

  test("the Collection PDF names things as the Collection page does", () => {
    const pdf = collectionPdfMessages[locale];
    expect(pdf.sorts).toEqual(t.collection.sorts);
    expect({
      title: pdf.title,
      origin: pdf.origin,
      album: pdf.album,
      bullionCoins: pdf.bullionCoins,
      own: pdf.origins.own("{country}"),
      foreign: pdf.origins.foreign,
      withoutAlbum: pdf.withoutAlbum,
      unknownAlbum: pdf.unknownAlbum,
      items: pdf.items,
      pieces: pdf.pieces,
      gainLoss: pdf.gainLoss,
    }).toEqual({
      title: t.nav.collection,
      origin: t.collection.filters.origin,
      album: t.collection.filters.album,
      bullionCoins: t.collection.bullionCoins,
      own: t.collection.origins.own,
      foreign: t.collection.origins.foreign,
      withoutAlbum: t.collection.withoutAlbum,
      unknownAlbum: t.collection.unknownAlbum,
      items: t.collectionTotals.items,
      pieces: t.collectionTotals.pieces,
      gainLoss: t.collectionTotals.gainLoss,
    });
  });

  test("the Insurance report names things as its page does", () => {
    const report = reportMessages[locale];
    expect(report.itemTypes).toEqual(t.items.types);
    expect(report.stampGrades).toEqual(t.grades.stamp);
    expect(report.columns).toEqual(t.insuranceReport.columns);
    expect({
      title: report.title,
      wholeCollection: report.wholeCollection,
      withoutAlbum: report.withoutAlbum,
      items: report.items,
      pieces: report.pieces,
      owner: report.owner,
      spotPrices: report.spotPrices,
      gold: report.gold,
      silver: report.silver,
    }).toEqual({
      title: t.insuranceReport.title,
      wholeCollection: t.insuranceReport.wholeCollection,
      withoutAlbum: t.insuranceReport.withoutAlbum,
      items: t.insuranceReport.items,
      pieces: t.insuranceReport.pieces,
      owner: t.insuranceReport.ownerTitle,
      spotPrices: t.spotPrices.title,
      gold: t.items.materials.gold,
      silver: t.items.materials.silver,
    });
  });
});
