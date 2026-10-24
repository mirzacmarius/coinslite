import { describe, expect, test } from "bun:test";
import {
  defaultLabelOptions,
  labelLayouts,
} from "@coinslite/backend/convex/collection/labelSheet";
import { labelMeasure, readLabelOptions, sheetsFor } from "./label-options";

const { skip: _, ...defaults } = defaultLabelOptions;
const number = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("en", options).format(value);

describe("the label choices kept on the device", () => {
  test("are the defaults when nothing or something unreadable is stored", () => {
    expect(readLabelOptions(null)).toEqual(defaults);
    expect(readLabelOptions("not json")).toEqual(defaults);
    expect(readLabelOptions("42")).toEqual(defaults);
  });

  test("keep each valid choice and drop the rest", () => {
    expect(
      readLabelOptions(
        JSON.stringify({
          size: "large",
          paper: "tabloid",
          purchase: true,
          marketValue: "yes",
          qrCode: false,
          perPiece: true,
          skip: 7,
        }),
      ),
    ).toEqual({
      size: "large",
      paper: "a4",
      purchase: true,
      marketValue: false,
      qrCode: false,
      perPiece: true,
    });
  });
});

describe("a sheet as the dialog describes it", () => {
  test("counts the sheets after the used labels", () => {
    const layout = labelLayouts.a4.large;
    expect(sheetsFor(layout, 0, 0)).toBe(0);
    expect(sheetsFor(layout, 0, 21)).toBe(1);
    expect(sheetsFor(layout, 1, 21)).toBe(2);
    expect(sheetsFor(layout, 20, 1)).toBe(1);
  });

  test("measures A4 labels in millimetres and Letter ones in inches", () => {
    expect(labelMeasure(labelLayouts.a4.small, "a4", number)).toBe(
      "44.45 × 12.7 mm",
    );
    expect(labelMeasure(labelLayouts.letter.small, "letter", number)).toBe(
      "1.75″ × 0.5″",
    );
    expect(labelMeasure(labelLayouts.letter.large, "letter", number)).toBe(
      "2.625″ × 1″",
    );
  });
});
