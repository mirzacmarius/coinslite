import { describe, expect, test } from "bun:test";
import type { Id } from "../_generated/dataModel";
import {
  type LabelItem,
  type LabelWords,
  clampSkip,
  defaultLabelOptions,
  itemLink,
  labelCount,
  labelLayouts,
  labelPlace,
  labelSizes,
  labelText,
  labelsOf,
  labelsPerSheet,
  papers,
} from "./labelSheet";

const words: LabelWords = {
  locale: "en",
  country: (code) => ({ NO: "Norway", US: "United States" })[code] ?? code,
  money: (amount) => `kr ${(amount / 100).toFixed(2)}`,
  date: (date) => date,
  stampGrade: (grade) => ({ mnh: "Mint never hinged" })[grade] ?? grade,
  paid: "Paid",
  value: "Value",
};

const coin: LabelItem = {
  id: "item1" as Id<"items">,
  type: "coin",
  title: "2 øre 1918",
  country: "NO",
  year: 1918,
  denomination: "2 øre",
  mintMark: "none",
  gradingScale: "norwegian",
  grade: "1+",
  strike: "circulation",
  numistaNumber: 1234,
  quantity: 3,
  purchasePrice: 15_000,
  purchaseDate: "2024-03-05",
  marketValue: 30_000,
};

const options = { ...defaultLabelOptions, size: "large" as const };

describe("label sheets", () => {
  test.each(
    papers.flatMap((paper) => labelSizes.map((size) => [paper, size] as const)),
  )("%s %s labels all lie within the sheet", (paper, size) => {
    const layout = labelLayouts[paper][size];
    const last = labelPlace(layout, labelsPerSheet(layout) - 1);
    expect(last.sheet).toBe(0);
    expect(labelPlace(layout, 0)).toEqual({
      sheet: 0,
      x: layout.margin.left,
      y: layout.margin.top,
    });
    expect(last.x + layout.label.width).toBeLessThanOrEqual(layout.page.width);
    expect(last.y + layout.label.height).toBeLessThanOrEqual(
      layout.page.height,
    );
    // Labels never overlap.
    expect(layout.pitch.x).toBeGreaterThanOrEqual(layout.label.width);
    expect(layout.pitch.y).toBeGreaterThanOrEqual(layout.label.height);
  });

  test("the sheets hold as many labels as their templates", () => {
    expect(labelsPerSheet(labelLayouts.a4.small)).toBe(80);
    expect(labelsPerSheet(labelLayouts.a4.medium)).toBe(65);
    expect(labelsPerSheet(labelLayouts.a4.large)).toBe(21);
    expect(labelsPerSheet(labelLayouts.letter.small)).toBe(80);
    expect(labelsPerSheet(labelLayouts.letter.medium)).toBe(60);
    expect(labelsPerSheet(labelLayouts.letter.large)).toBe(30);
  });

  test("labels run row by row, then on to the next sheet", () => {
    const layout = labelLayouts.a4.large;
    expect(labelPlace(layout, 1).x).toBeCloseTo(layout.margin.left + 66);
    expect(labelPlace(layout, 3)).toEqual({
      sheet: 0,
      x: layout.margin.left,
      y: layout.margin.top + 38.1,
    });
    expect(labelPlace(layout, 21)).toEqual({
      sheet: 1,
      x: layout.margin.left,
      y: layout.margin.top,
    });
  });

  test("skipping used labels stays within the first sheet", () => {
    const layout = labelLayouts.letter.large;
    expect(clampSkip(layout, 5)).toBe(5);
    expect(clampSkip(layout, -2)).toBe(0);
    expect(clampSkip(layout, 2.7)).toBe(2);
    expect(clampSkip(layout, 30)).toBe(29);
    expect(clampSkip(layout, Number.NaN)).toBe(0);
  });
});

describe("what a label says", () => {
  test("facts the title already holds are left out, and the Grade and pieces follow", () => {
    expect(labelText(coin, options, words)).toEqual({
      title: "2 øre 1918",
      lines: ["Norway", "1+ · N# 1234 · ×3"],
    });
  });

  test("a small label leaves out the Numista number and the date, and keeps the amounts on one line", () => {
    const text = labelText(
      coin,
      { ...options, size: "small", purchase: true, marketValue: true },
      words,
    );
    expect(text.lines).toEqual([
      "Norway",
      "1+ · ×3",
      "Paid kr 150.00 · Value kr 300.00",
    ]);
  });

  test("the amounts come only when asked for, each on its own line, the date only on a large label", () => {
    const both = { ...options, purchase: true, marketValue: true };
    expect(labelText(coin, both, words).lines).toEqual([
      "Norway",
      "1+ · N# 1234 · ×3",
      "Paid kr 150.00 (2024-03-05)",
      "Value kr 300.00",
    ]);
    expect(labelText(coin, { ...both, size: "medium" }, words).lines[2]).toBe(
      "Paid kr 150.00",
    );
    expect(
      labelText(coin, { ...options, marketValue: true }, words).lines[2],
    ).toBe("Value kr 300.00");
  });

  test("a Sheldon Grade carries its Strike in the code; other scales name BU and Proof", () => {
    const slabbed = labelText(
      {
        ...coin,
        title: "Morgan dollar",
        country: "US",
        year: 1921,
        denomination: "1 dollar",
        gradingScale: "sheldon",
        grade: "65",
        strike: "proof",
        quantity: 1,
        numistaNumber: undefined,
      },
      options,
      words,
    );
    expect(slabbed.lines).toEqual(["United States · 1 dollar · 1921", "PF-65"]);
    const bu = labelText(
      { ...coin, gradingScale: "european", grade: "UNC", strike: "bu" },
      { ...options, perPiece: true },
      words,
    );
    expect(bu.lines[1]).toBe("UNC BU · N# 1234");
  });

  test("a European Grade is written as German and French collectors write it", () => {
    const krone = { ...coin, gradingScale: "european" as const, grade: "XF" };
    expect(
      labelText(krone, options, { ...words, locale: "de" }).lines[1],
    ).toStartWith("vz");
    expect(
      labelText(krone, options, { ...words, locale: "fr" }).lines[1],
    ).toStartWith("SUP");
    expect(labelText(krone, options, words).lines[1]).toStartWith("XF");
  });

  test("a stamp's Grade is in words, and an Item without facts has only its title", () => {
    const stamp = labelText(
      {
        id: "item2" as Id<"items">,
        type: "stamp",
        title: "Posthorn 20 øre",
        gradingScale: "stamp",
        grade: "mnh",
        quantity: 1,
      },
      options,
      words,
    );
    expect(stamp.lines).toEqual(["Mint never hinged"]);
    expect(
      labelText(
        {
          id: "item3" as Id<"items">,
          type: "coin",
          title: "Odd token",
          quantity: 1,
        },
        options,
        words,
      ),
    ).toEqual({ title: "Odd token", lines: [] });
  });
});

describe("the labels of a sheet", () => {
  test("counts one per Item, or one per piece", () => {
    const items = [coin, { ...coin, quantity: 1 }];
    expect(labelCount(items, false)).toBe(2);
    expect(labelCount(items, true)).toBe(4);
  });

  test("repeats a label per piece without the pieces mark", () => {
    const labels = labelsOf(
      [coin],
      { ...options, perPiece: true },
      words,
      null,
    );
    expect(labels).toHaveLength(3);
    expect(labels[0]?.lines[1]).toBe("1+ · N# 1234");
    expect(labels[0]?.link).toBeNull();
  });

  test("links to the Item on the larger labels when the app's address is known", () => {
    const appUrl = "https://app.example.com/";
    expect(labelsOf([coin], options, words, appUrl)[0]?.link).toBe(
      "https://app.example.com/collection/item1",
    );
    expect(
      labelsOf([coin], { ...options, size: "small" }, words, appUrl)[0]?.link,
    ).toBeNull();
    expect(
      labelsOf([coin], { ...options, qrCode: false }, words, appUrl)[0]?.link,
    ).toBeNull();
    expect(itemLink("https://app.example.com", "item9")).toBe(
      "https://app.example.com/collection/item9",
    );
  });
});
