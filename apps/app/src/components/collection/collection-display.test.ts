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

  test("unchosen, they're collapsed on a phone and open on wider screens", () => {
    expect(totalsOpen(unchosen, { narrowed: false, phone: true })).toBe(false);
    expect(totalsOpen(unchosen, { narrowed: false, phone: false })).toBe(true);
  });

  test("the screen decides while its size isn't known", () => {
    expect(
      totalsOpen(unchosen, { narrowed: false, phone: undefined }),
    ).toBeUndefined();
  });

  test("the device's choice wins over the screen size", () => {
    expect(totalsOpen(open, { narrowed: false, phone: true })).toBe(true);
    expect(totalsOpen(collapsed, { narrowed: false, phone: false })).toBe(
      false,
    );
    expect(totalsOpen(collapsed, { narrowed: false, phone: undefined })).toBe(
      false,
    );
  });

  test("a searched or filtered view starts collapsed, whatever was chosen", () => {
    expect(totalsOpen(open, { narrowed: true, phone: false })).toBe(false);
    expect(totalsOpen(unchosen, { narrowed: true, phone: undefined })).toBe(
      false,
    );
  });
});
