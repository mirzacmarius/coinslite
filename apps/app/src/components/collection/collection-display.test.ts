import { describe, expect, test } from "bun:test";
import {
  narrowsBeyondStatus,
  narrowsView,
  readDisplay,
} from "./collection-display";

describe("narrowsBeyondStatus", () => {
  test("the sold view alone is a whole of its own, not a narrowing", () => {
    expect(narrowsBeyondStatus({ status: "sold" })).toBe(false);
    expect(narrowsBeyondStatus({ sort: "value" })).toBe(false);
    expect(narrowsBeyondStatus({ status: "sold", country: "NO" })).toBe(true);
    expect(narrowsBeyondStatus({ search: "krone" })).toBe(true);
    expect(narrowsBeyondStatus({ storage: "none" })).toBe(true);
  });
});

describe("readDisplay", () => {
  test("a device that remembers nothing gets the defaults", () => {
    expect(readDisplay(null)).toEqual({ layout: "list", pageSize: 25 });
  });

  test("keeps what this device chose", () => {
    expect(readDisplay('{"layout":"grid","pageSize":50}')).toEqual({
      layout: "grid",
      pageSize: 50,
    });
  });

  test("drops what it doesn't recognise, field by field", () => {
    // Open or collapsed totals were remembered too, before the Overview took them.
    expect(
      readDisplay('{"layout":"table","pageSize":15,"totalsOpen":false}'),
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
