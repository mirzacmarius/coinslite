import { describe, expect, test } from "vitest";
import {
  checkColumns,
  defaultColumns,
  itemValues,
  reportTotals,
} from "./rules";

const allColumns = [
  "purchasePrice",
  "marketValue",
  "metalValue",
  "insuredValue",
] as const;

describe("an Item's values", () => {
  test("Purchase price and Market value count every piece; the Metal value already does", () => {
    expect(
      itemValues(
        { quantity: 3, purchasePrice: 150_00, marketValue: 200_00 },
        1_234_56,
        allColumns,
      ),
    ).toEqual({
      purchasePrice: 450_00,
      marketValue: 600_00,
      metalValue: 1_234_56,
      insuredValue: 1_234_56,
    });
  });

  test("the Insured value is the highest of the chosen values", () => {
    const coin = { quantity: 2, purchasePrice: 900_00, marketValue: 700_00 };

    expect(itemValues(coin, 500_00, allColumns).insuredValue).toBe(1_800_00);
    expect(
      itemValues(coin, 500_00, ["marketValue", "metalValue", "insuredValue"]),
    ).toEqual({
      marketValue: 1_400_00,
      metalValue: 500_00,
      insuredValue: 1_400_00,
    });
    expect(
      itemValues(coin, 500_00, ["metalValue", "insuredValue"]).insuredValue,
    ).toBe(500_00);
  });

  test("a value the Item doesn't have is left out, and so is an Insured value with nothing to go on", () => {
    expect(itemValues({ quantity: 1 }, undefined, allColumns)).toEqual({});
    expect(
      itemValues({ quantity: 4, purchasePrice: 25_00 }, undefined, [
        "marketValue",
        "metalValue",
        "insuredValue",
      ]),
    ).toEqual({});
    expect(
      itemValues({ quantity: 4, marketValue: 25_00 }, undefined, allColumns),
    ).toEqual({ marketValue: 100_00, insuredValue: 100_00 });
  });

  test("columns that aren't chosen stay out", () => {
    expect(
      itemValues(
        { quantity: 1, purchasePrice: 10_00, marketValue: 20_00 },
        5_00,
        ["purchasePrice"],
      ),
    ).toEqual({ purchasePrice: 10_00 });
  });
});

describe("the chosen columns", () => {
  test("a new report shows Market value, Metal value and Insured value", () => {
    expect(defaultColumns).toEqual([
      "marketValue",
      "metalValue",
      "insuredValue",
    ]);
  });

  test("come back in report order, each once", () => {
    expect(
      checkColumns([
        "insuredValue",
        "metalValue",
        "purchasePrice",
        "metalValue",
      ]),
    ).toEqual(["purchasePrice", "metalValue", "insuredValue"]);
  });

  test("must keep at least one of Purchase price, Market value or Metal value", () => {
    expect(() => checkColumns([])).toThrow("BASE_VALUE_REQUIRED");
    expect(() => checkColumns(["insuredValue"])).toThrow("BASE_VALUE_REQUIRED");
    for (const base of [
      "purchasePrice",
      "marketValue",
      "metalValue",
    ] as const) {
      expect(checkColumns([base])).toEqual([base]);
    }
  });
});

describe("the totals", () => {
  test("add up the rows' values per chosen column, and count Items and pieces", () => {
    const rows = [
      { quantity: 3, values: { marketValue: 600_00, insuredValue: 600_00 } },
      {
        quantity: 2,
        values: {
          marketValue: 12_000_00,
          metalValue: 13_889_12,
          insuredValue: 13_889_12,
        },
      },
      { quantity: 1, values: {} },
    ];

    expect(
      reportTotals(rows, ["marketValue", "metalValue", "insuredValue"]),
    ).toEqual({
      items: 3,
      pieces: 6,
      values: {
        marketValue: 12_600_00,
        metalValue: 13_889_12,
        insuredValue: 14_489_12,
      },
    });
  });

  test("are 0 for a chosen column no Item has a value in, and absent for the rest", () => {
    expect(
      reportTotals(
        [{ quantity: 5, values: {} }],
        ["purchasePrice", "insuredValue"],
      ),
    ).toEqual({
      items: 1,
      pieces: 5,
      values: { purchasePrice: 0, insuredValue: 0 },
    });
    expect(reportTotals([], ["metalValue"])).toEqual({
      items: 0,
      pieces: 0,
      values: { metalValue: 0 },
    });
  });
});
