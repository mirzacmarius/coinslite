import { describe, expect, test } from "bun:test";
import { gradeCode, gradingScales, localGradeCodes } from "./grades";

describe("gradeCode", () => {
  test("writes the European scale as German and French collectors do", () => {
    expect(gradeCode("european", "XF", undefined, "de")).toBe("vz");
    expect(gradeCode("european", "VF", undefined, "fr")).toBe("TTB");
    expect(gradeCode("european", "UNC", "bu", "de")).toBe("unz");
    expect(gradeCode("european", "G", undefined, "fr")).toBe("AB");
  });

  test("keeps the international codes in the other languages and on the other scales", () => {
    expect(gradeCode("european", "XF", undefined, "nb")).toBe("XF");
    expect(gradeCode("european", "XF")).toBe("XF");
    expect(gradeCode("international", "XF", undefined, "de")).toBe("XF");
    expect(gradeCode("sheldon", "45", undefined, "fr")).toBe("EF-45");
    expect(gradeCode("norwegian", "1-", undefined, "de")).toBe("1−");
  });

  test("has a code for every European Grade, each once, in each language that writes its own", () => {
    for (const codes of Object.values(localGradeCodes)) {
      expect(Object.keys(codes).sort()).toEqual(
        [...gradingScales.european.grades].sort(),
      );
      expect(new Set(Object.values(codes)).size).toBe(
        gradingScales.european.grades.length,
      );
    }
  });
});
