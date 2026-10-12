import { describe, expect, test } from "bun:test";
import {
  type CollectionDisplay,
  narrowsView,
  readDisplay,
  totalsOpen,
} from "./collection-display";

describe("readDisplay", () => {
  test("a device that remembers nothing gets the defaults", () => {
    expect(readDisplay(null)).toEqual({ layout: "list", pageSize: 25 });
  });

  test("keeps what this device chose, open or collapsed totals included", () => {
    expect(
      readDisplay('{"layout":"grid","pageSize":50,"totalsOpen":false}'),
    ).toEqual({ layout: "grid", pageSize: 50, totalsOpen: false });
  });

  test("drops what it doesn't recognise, field by field", () => {
    expect(
      readDisplay('{"layout":"table","pageSize":15,"totalsOpen":"yes"}'),
    ).toEqual({ layout: "list", pageSize: 15 });
    expect(readDisplay("not json")).toEqual({ layout: "list", pageSize: 25 });
  });
});

describe("narrowsView", () => {
  test("a search, a filter or picking Items for an Album narrows the list", () => {
    expect(narrowsView({ search: "krone" })).toBe(true);
    expect(narrowsView({ type: "coin" })).toBe(true);
    expect(narrowsView({ bullionOnly: true })).toBe(true);
    expect(narrowsView({ album: "none" })).toBe(true);
    expect(narrowsView({ notInAlbum: "albums-1" })).toBe(true);
  });

  test("the sort alone shows every Item", () => {
    expect(narrowsView({})).toBe(false);
    expect(narrowsView({ sort: "newest" })).toBe(false);
  });
});

describe("totalsOpen", () => {
  const unchosen: CollectionDisplay = { layout: "list", pageSize: 25 };
  const open = { ...unchosen, totalsOpen: true };
  const collapsed = { ...unchosen, totalsOpen: false };

  test("unchosen, they're open only where the list still starts in view", () => {
    const at = (width: number, height: number) =>
      totalsOpen(unchosen, { narrowed: false, screen: { width, height } });
    expect(at(390, 844)).toBe(false);
    expect(at(1280, 800)).toBe(false);
    expect(at(1440, 1100)).toBe(true);
  });

  test("the screen needs to be at least 1024 px wide and 1000 px tall", () => {
    const at = (width: number, height: number) =>
      totalsOpen(unchosen, { narrowed: false, screen: { width, height } });
    expect(at(1024, 1000)).toBe(true);
    expect(at(1023, 1400)).toBe(false);
    expect(at(2560, 999)).toBe(false);
  });

  test("the page's CSS decides while the screen size isn't known", () => {
    expect(
      totalsOpen(unchosen, { narrowed: false, screen: undefined }),
    ).toBeUndefined();
  });

  test("the device's choice wins over the screen size", () => {
    const phone = { width: 390, height: 844 };
    const desktop = { width: 1440, height: 1100 };
    expect(totalsOpen(open, { narrowed: false, screen: phone })).toBe(true);
    expect(totalsOpen(collapsed, { narrowed: false, screen: desktop })).toBe(
      false,
    );
    expect(totalsOpen(collapsed, { narrowed: false, screen: undefined })).toBe(
      false,
    );
  });

  test("a searched or filtered view starts collapsed, whatever was chosen", () => {
    const desktop = { width: 1440, height: 1100 };
    expect(totalsOpen(open, { narrowed: true, screen: desktop })).toBe(false);
    expect(totalsOpen(unchosen, { narrowed: true, screen: desktop })).toBe(
      false,
    );
    expect(totalsOpen(unchosen, { narrowed: true, screen: undefined })).toBe(
      false,
    );
  });
});
