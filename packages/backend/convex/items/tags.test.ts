import { describe, expect, test } from "bun:test";
import {
  checkTags,
  cleanTag,
  splitTags,
  tagKey,
  tagLimits,
  withTag,
  withoutTag,
} from "./tags";

describe("tags", () => {
  test("differ only in capitals, accents or spacing are one tag", () => {
    expect(tagKey("  For   Sale ")).toBe(tagKey("for sale"));
    expect(tagKey("Ærfuglen ÉTÉ")).toBe(tagKey("ærfuglen ete"));
    expect(tagKey("For sale")).not.toBe(tagKey("Sold"));
  });

  test("are stored trimmed, with single spaces and no commas or semicolons", () => {
    expect(cleanTag("  Out  for grading ")).toBe("Out for grading");
    expect(cleanTag("PCGS,NGC")).toBe("PCGS NGC");
    expect(cleanTag("Box 3; tray 2")).toBe("Box 3 tray 2");
  });

  test("come back whole from a CSV cell", () => {
    const tags = checkTags(["Box 3; tray 2", "For sale"]) ?? [];
    expect(splitTags(tags.join(", "))).toEqual(tags);
  });

  test("are parted at commas and semicolons where typed in one text", () => {
    expect(splitTags("For sale, Inherited;; Out for grading ,")).toEqual([
      "For sale",
      "Inherited",
      "Out for grading",
    ]);
  });
});

describe("checkTags", () => {
  test("keeps each tag once, as first written, in the order given", () => {
    expect(checkTags([" For sale", "Inherited", "for SALE", ""])).toEqual([
      "For sale",
      "Inherited",
    ]);
  });

  test("stores none as no tags", () => {
    expect(checkTags([])).toBeUndefined();
    expect(checkTags(["  ", ","])).toBeUndefined();
    expect(checkTags(undefined)).toBeUndefined();
  });

  test("refuses too long a tag or too many", () => {
    expect(() => checkTags(["x".repeat(tagLimits.length + 1)])).toThrow();
    expect(checkTags(["x".repeat(tagLimits.length)])).toHaveLength(1);
    const many = Array.from(
      { length: tagLimits.perItem + 1 },
      (_, n) => `t${n}`,
    );
    expect(() => checkTags(many)).toThrow();
    expect(checkTags(many.slice(1))).toHaveLength(tagLimits.perItem);
  });
});

describe("withTag and withoutTag", () => {
  test("add a tag at the end, unless the Item has it or no room", () => {
    expect(withTag(undefined, "For sale")).toEqual(["For sale"]);
    expect(withTag(["Inherited"], "For sale")).toEqual([
      "Inherited",
      "For sale",
    ]);
    expect(withTag(["for sale"], "For sale")).toBeNull();
    const full = Array.from({ length: tagLimits.perItem }, (_, n) => `t${n}`);
    expect(withTag(full, "For sale")).toBeNull();
  });

  test("take a tag off whatever its capitals, leaving none as no tags", () => {
    expect(withoutTag(["Inherited", "For sale"], "FOR SALE")).toEqual([
      "Inherited",
    ]);
    expect(withoutTag(["For sale"], "for sale")).toBeUndefined();
    expect(withoutTag(["Inherited"], "For sale")).toBeNull();
    expect(withoutTag(undefined, "For sale")).toBeNull();
  });
});
