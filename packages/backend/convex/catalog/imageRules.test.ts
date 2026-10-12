import { describe, expect, test } from "bun:test";
import {
  ecbSpecimenLicence,
  fitWithin,
  fullImageBounds,
  withinBounds,
} from "./imageRules";

describe("the size a Catalog image is stored at", () => {
  test("scales a picture down to its longest side, keeping its shape", () => {
    expect(fitWithin({ width: 1600, height: 1200 }, 800)).toEqual({
      width: 800,
      height: 600,
    });
  });

  test("never scales a picture up", () => {
    expect(fitWithin({ width: 300, height: 200 }, 800)).toEqual({
      width: 300,
      height: 200,
    });
  });

  test("keeps both sides within their bounds, whichever way round the picture is", () => {
    const bounds = { longest: 340, shortest: 175 };
    expect(fitWithin({ width: 800, height: 407 }, bounds)).toEqual({
      width: 340,
      height: 173,
    });
    expect(fitWithin({ width: 400, height: 800 }, bounds)).toEqual({
      width: 170,
      height: 340,
    });
  });
});

describe("how large a full-size image may be", () => {
  test("800 px on its longest side, for most images", () => {
    expect(fullImageBounds({ width: 160, height: 82 }, "CC BY-SA 4.0")).toEqual(
      { longest: 800, shortest: 800 },
    );
    expect(fullImageBounds({}, "Public domain")).toEqual({
      longest: 800,
      shortest: 800,
    });
  });

  test("a euro banknote reproduced under the ECB's rules: no more than 72 dpi at its real size", () => {
    // 160 mm is 453.5 px at 72 dpi, 82 mm is 232.4 px.
    expect(
      fullImageBounds({ width: 160, height: 82 }, ecbSpecimenLicence),
    ).toEqual({ longest: 453, shortest: 232 });
    // 120 × 62 mm: 340.2 × 175.7 px.
    expect(
      fullImageBounds(
        { width: 120, height: 62 },
        "Reproduced under decision ECB/2013/10",
      ),
    ).toEqual({ longest: 340, shortest: 175 });
  });

  test("a reproduction under the ECB's rules needs the note's real size", () => {
    expect(fullImageBounds({ width: 160 }, ecbSpecimenLicence)).toBeNull();
    expect(fullImageBounds({}, ecbSpecimenLicence)).toBeNull();
  });

  test("an image fits when neither side is over its bound", () => {
    const bounds = { longest: 453, shortest: 232 };
    expect(withinBounds({ width: 453, height: 232 }, bounds)).toBe(true);
    expect(withinBounds({ width: 232, height: 453 }, bounds)).toBe(true);
    expect(withinBounds({ width: 454, height: 200 }, bounds)).toBe(false);
    expect(withinBounds({ width: 400, height: 233 }, bounds)).toBe(false);
  });
});
