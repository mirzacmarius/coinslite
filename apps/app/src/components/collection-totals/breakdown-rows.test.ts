import { describe, expect, test } from "bun:test";
import { breakdownRows, otherGroups } from "./breakdown-rows";

const group = (key: string, items: number, marketValue: number) => ({
  key,
  items,
  marketValue,
});

describe("the rows of a breakdown", () => {
  test("keep the largest groups, fold the rest into Other, and the Items without the fact last", () => {
    const rows = breakdownRows(
      [
        group("NO", 10, 1000),
        group("US", 5, 500),
        group("SE", 4, 250),
        group("DK", 3, 100),
        group("", 7, 0),
      ],
      2,
    );
    expect(rows).toEqual([
      { key: "NO", items: 10, marketValue: 1000, share: 1 },
      { key: "US", items: 5, marketValue: 500, share: 0.5 },
      { key: otherGroups, items: 7, marketValue: 350, others: 2, share: 0.35 },
      { key: "", items: 7, marketValue: 0, share: 0 },
    ]);
  });

  test("a lone leftover stays itself rather than becoming Other", () => {
    const rows = breakdownRows(
      [group("NO", 2, 200), group("US", 1, 100), group("SE", 1, 50)],
      2,
    );
    expect(rows.map((row) => row.key)).toEqual(["NO", "US", "SE"]);
  });

  test("measure by Items when no group has a Market value", () => {
    const rows = breakdownRows([group("1880", 4, 0), group("1920", 1, 0)]);
    expect(rows.map((row) => row.share)).toEqual([1, 0.25]);
  });

  test("are none for no groups", () => {
    expect(breakdownRows([])).toEqual([]);
  });
});
