import { describe, expect, test } from "bun:test";
import {
  hrefAfterDeleting,
  readCollectionUrl,
  writeCollectionUrl,
} from "./collection-url";

describe("the view in the URL", () => {
  test("round-trips the Kept in filter and the sort", () => {
    const view = { storage: "Safe, tray 1", sort: "value" as const };
    const params = writeCollectionUrl(view, 1);
    expect(params.toString()).toBe("storage=Safe%2C+tray+1&sort=value");
    expect(readCollectionUrl(params)).toEqual({ view, page: 1 });
  });

  test("round-trips a year range and a material, a range written backwards the right way round", () => {
    const view = { yearFrom: 1800, yearTo: 1899, material: "silver" as const };
    const params = writeCollectionUrl(view, 1);
    expect(params.toString()).toBe("yearFrom=1800&yearTo=1899&material=silver");
    expect(readCollectionUrl(params).view).toEqual(view);
    expect(
      readCollectionUrl(new URLSearchParams("yearFrom=1899&yearTo=1800")).view,
    ).toEqual({ yearFrom: 1800, yearTo: 1899 });
    expect(
      readCollectionUrl(new URLSearchParams("yearFrom=abc&material=wood")).view,
    ).toEqual({});
  });

  test("round-trips a tag", () => {
    const view = { tag: "For sale" };
    const params = writeCollectionUrl(view, 1);
    expect(params.toString()).toBe("tag=For+sale");
    expect(readCollectionUrl(params).view).toEqual(view);
    expect(readCollectionUrl(new URLSearchParams("tag=%20")).view).toEqual({});
  });

  test("keeps the Items with no place recorded", () => {
    expect(readCollectionUrl(new URLSearchParams("storage=none")).view).toEqual(
      { storage: "none" },
    );
  });
});

describe("hrefAfterDeleting", () => {
  test("an Item opened from outside the Collection goes to the Collection", () => {
    expect(hrefAfterDeleting(new URLSearchParams(""), undefined, 25)).toBe(
      "/collection",
    );
  });

  test("goes back to the view it was opened from, at the page that showed it", () => {
    expect(
      hrefAfterDeleting(
        new URLSearchParams("q=krone&type=coin&sort=price&view=1"),
        { position: 55, total: 70 },
        25,
      ),
    ).toBe("/collection?q=krone&type=coin&sort=price&page=3");
  });

  test("goes to the page before when the Item was alone on the last page", () => {
    expect(
      hrefAfterDeleting(
        new URLSearchParams("type=coin&view=1"),
        { position: 50, total: 51 },
        25,
      ),
    ).toBe("/collection?type=coin&page=2");
  });

  test("goes to the view, now empty, when the Item was all it showed", () => {
    expect(
      hrefAfterDeleting(
        new URLSearchParams("country=NO&view=1"),
        { position: 0, total: 1 },
        25,
      ),
    ).toBe("/collection?country=NO");
  });

  test("goes to the view's first page when its place in the view isn't known", () => {
    expect(
      hrefAfterDeleting(
        new URLSearchParams("status=sold&view=1"),
        undefined,
        25,
      ),
    ).toBe("/collection?status=sold");
  });

  test("an Item opened from the whole Collection goes back to it, at its page", () => {
    const fromCollection = new URLSearchParams("view=1");
    expect(
      hrefAfterDeleting(fromCollection, { position: 3, total: 40 }, 25),
    ).toBe("/collection");
    expect(
      hrefAfterDeleting(fromCollection, { position: 30, total: 40 }, 25),
    ).toBe("/collection?page=2");
  });
});
