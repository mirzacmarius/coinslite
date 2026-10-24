import { describe, expect, test } from "bun:test";
import {
  dateOrderOf,
  meansCurrency,
  readAmount,
  readDate,
  readGrade,
  readMaterial,
  readNumistaNumber,
  readYear,
} from "./importValues";

describe("readAmount", () => {
  test("reads plain and grouped amounts, either way round", () => {
    expect(readAmount("1250.50")).toEqual({ amount: 125050 });
    expect(readAmount("1.250,50")).toEqual({ amount: 125050 });
    expect(readAmount("1,250.50")).toEqual({ amount: 125050 });
  });

  test("keeps the currency written before or after the amount", () => {
    expect(readAmount("€12.50")).toEqual({ amount: 1250, currency: "€" });
    expect(readAmount("12,50 €")).toEqual({ amount: 1250, currency: "€" });
    expect(readAmount("kr 1 250")).toEqual({ amount: 125000, currency: "KR" });
    expect(readAmount("12.50 USD")).toEqual({ amount: 1250, currency: "USD" });
  });

  test("isn't an amount with text around it or two currencies", () => {
    expect(readAmount("about 12")).toBeUndefined();
    expect(readAmount("€ 12 $")).toBeUndefined();
    expect(readAmount("-5")).toBeUndefined();
  });
});

describe("meansCurrency", () => {
  test("takes a code in any case, or a symbol that can stand for the currency", () => {
    expect(meansCurrency("eur", "EUR")).toBe(true);
    expect(meansCurrency("€", "EUR")).toBe(true);
    expect(meansCurrency("KR", "SEK")).toBe(true);
    expect(meansCurrency("KR", "EUR")).toBe(false);
    expect(meansCurrency("€", "GBP")).toBe(false);
  });
});

describe("readDate", () => {
  test("reads ISO dates, also with a time, and year-first dates", () => {
    expect(readDate("2024-03-05", "dmy")).toBe("2024-03-05");
    expect(readDate("2024-03-05 14:22:01", "dmy")).toBe("2024-03-05");
    expect(readDate("2024-03-05T14:22:01Z", "mdy")).toBe("2024-03-05");
    expect(readDate("2024/3/5", "mdy")).toBe("2024-03-05");
  });

  test("reads dotted dates day first, slashed ones in the order given", () => {
    expect(readDate("5.3.2024", "mdy")).toBe("2024-03-05");
    expect(readDate("05/03/2024", "dmy")).toBe("2024-03-05");
    expect(readDate("05/03/2024", "mdy")).toBe("2024-05-03");
  });

  test("leaves anything else as written, for the rules to refuse", () => {
    expect(readDate("March 2024", "dmy")).toBe("March 2024");
  });
});

describe("dateOrderOf", () => {
  test("tells the order from a day or month above 12", () => {
    expect(dateOrderOf(["05/03/2024", "25/03/2024"])).toBe("dmy");
    expect(dateOrderOf(["03/25/2024"])).toBe("mdy");
    expect(dateOrderOf(["05/03/2024", "2024-01-01"])).toBeNull();
  });
});

describe("readYear and readNumistaNumber", () => {
  test("reads whole years, and no year for undated pieces", () => {
    expect(readYear("1875")).toBe(1875);
    expect(readYear("-44")).toBe(-44);
    expect(readYear("ND")).toBeUndefined();
    expect(readYear("o.J.")).toBeUndefined();
    expect(readYear("ninety")).toBeNull();
  });

  test("reads a Numista number with or without N#", () => {
    expect(readNumistaNumber("N# 1234")).toBe(1234);
    expect(readNumistaNumber("n#1234")).toBe(1234);
    expect(readNumistaNumber("1234")).toBe(1234);
    expect(readNumistaNumber("KM# 12")).toBeNull();
  });
});

describe("readGrade", () => {
  test("reads a Grade on the scale the Item starts on", () => {
    expect(readGrade("coin", "NO", undefined, "1+")).toEqual({
      gradingScale: "norwegian",
      grade: "1+",
    });
    expect(readGrade("coin", "US", undefined, "MS-65")).toEqual({
      gradingScale: "sheldon",
      grade: "65",
    });
  });

  test("tries the other scales for the type when that one doesn't read it", () => {
    expect(readGrade("coin", "NO", undefined, "XF")).toEqual({
      gradingScale: "european",
      grade: "XF",
    });
    expect(readGrade("coin", "SE", undefined, "Extremely fine")).toEqual({
      gradingScale: "european",
      grade: "XF",
    });
    expect(readGrade("banknote", "DE", undefined, "AU")).toEqual({
      gradingScale: "international",
      grade: "AU",
    });
  });

  test("reads a proof's letters as its Strike and the designation as a note", () => {
    expect(readGrade("coin", "US", undefined, "PR69DCAM")).toEqual({
      gradingScale: "sheldon",
      grade: "69",
      strike: "proof",
      gradeNote: "DCAM",
    });
    expect(readGrade("coin", "GB", undefined, "BU")).toEqual({
      gradingScale: "european",
      grade: "UNC",
      strike: "bu",
    });
    expect(readGrade("coin", "GB", undefined, "Proof")).toEqual({
      strike: "proof",
    });
  });

  test("keeps a Grade no scale reads as the note", () => {
    expect(readGrade("coin", "DE", undefined, "AU")).toEqual({
      gradeNote: "AU",
    });
    expect(readGrade("coin", "DE", "european", "1+")).toEqual({
      gradeNote: "1+",
    });
  });

  test("reads German and French Grades, by their codes or in words", () => {
    expect(readGrade("coin", "DE", undefined, "vz")).toEqual({
      gradingScale: "european",
      grade: "XF",
    });
    expect(readGrade("coin", "DE", undefined, "sehr schön")).toEqual({
      gradingScale: "european",
      grade: "VF",
    });
    expect(readGrade("coin", "FR", undefined, "TTB")).toEqual({
      gradingScale: "european",
      grade: "VF",
    });
    expect(readGrade("coin", "FR", undefined, "FDC")).toEqual({
      gradingScale: "european",
      grade: "UNC",
    });
    expect(readGrade("coin", "DE", "european", "unz")).toEqual({
      gradingScale: "european",
      grade: "UNC",
    });
    expect(readGrade("banknote", "FR", undefined, "SPL")).toEqual({
      gradingScale: "international",
      grade: "AU",
    });
  });

  test("reads a step between Grades as its Grade, keeping it as written in the note", () => {
    expect(readGrade("coin", "DE", undefined, "ss+")).toEqual({
      gradingScale: "european",
      grade: "VF",
      gradeNote: "ss+",
    });
    expect(readGrade("coin", "FR", undefined, "TTB+")).toEqual({
      gradingScale: "european",
      grade: "VF",
      gradeNote: "TTB+",
    });
    expect(readGrade("coin", "DE", undefined, "-vz")).toEqual({
      gradingScale: "european",
      grade: "XF",
      gradeNote: "-vz",
    });
    expect(readGrade("coin", "DE", undefined, "ss-vz")).toEqual({
      gradeNote: "ss-vz",
    });
  });

  test("reads stamp Grades by their usual marks", () => {
    expect(readGrade("stamp", "NO", undefined, "**")).toEqual({
      gradingScale: "stamp",
      grade: "mnh",
    });
  });
});

describe("readMaterial", () => {
  test("reads the material and keeps what follows as its note", () => {
    expect(readMaterial("Silver · 0.800 fine")).toEqual({
      material: "silver",
      materialNote: "0.800 fine",
    });
    expect(readMaterial("Silver (.925)")).toEqual({
      material: "silver",
      materialNote: "(.925)",
    });
    expect(readMaterial("Copper-nickel")).toEqual({ material: "cupronickel" });
    expect(readMaterial("Billon")).toEqual({ materialNote: "Billon" });
  });
});
