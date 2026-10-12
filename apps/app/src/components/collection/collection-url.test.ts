import { describe, expect, test } from "bun:test";
import { hrefAfterDeleting } from "./collection-url";

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
