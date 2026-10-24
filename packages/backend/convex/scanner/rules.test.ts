import { describe, expect, test } from "bun:test";
import {
  type ScanCandidate,
  type ScanReading,
  factsFrom,
  gradeFrom,
  readingFrom,
  rankCandidates,
  readingSchema,
  suggestionFrom,
} from "./rules";

const today = "2026-10-24";

/** A reading with nothing read, to fill in. */
const nothing: ScanReading = {
  itemType: null,
  title: null,
  country: null,
  year: null,
  denomination: null,
  series: null,
  ruler: null,
  material: null,
  mintMark: null,
  diameter: null,
  serialNumber: null,
  signatures: null,
  printer: null,
  inscriptions: null,
  grade: null,
};

const krone: ScanReading = {
  ...nothing,
  itemType: "coin",
  title: "1 krone 1997",
  country: "NO",
  year: 1997,
  denomination: "1 krone",
  ruler: "Harald V",
  material: "cupronickel",
  diameter: 21,
  grade: { scale: "norwegian", value: "1+" },
};

const note: ScanReading = {
  ...nothing,
  itemType: "banknote",
  title: "100 kroner 2017",
  country: "NO",
  year: 2017,
  denomination: "100 krone",
  series: "Series VIII",
  serialNumber: "AB 1234567",
  signatures: "Øystein Olsen, Ida Wolden Bache",
  printer: "Oberthur Fiduciaire",
  grade: { scale: "norwegian", value: "0" },
};

describe("reading the vision model's answer", () => {
  test("takes a banknote, with what's printed on it and the Grade", () => {
    expect(readingFrom(JSON.parse(JSON.stringify(note)))).toEqual(note);
  });

  test("takes photos of neither a coin nor a banknote", () => {
    expect(readingFrom(nothing)).toEqual(nothing);
  });

  test("turns away another Item type, or fields of another shape", () => {
    expect(readingFrom({ ...note, itemType: "stamp" })).toBeNull();
    expect(readingFrom({ ...note, serialNumber: 1234567 })).toBeNull();
    expect(readingFrom({ ...note, year: "2017" })).toBeNull();
    expect(readingFrom("a banknote")).toBeNull();
  });

  test("leaves out a Grade of another shape, keeping the rest", () => {
    expect(readingFrom({ ...krone, grade: "1+" })).toEqual({
      ...krone,
      grade: null,
    });
    expect(readingFrom({ ...krone, grade: { scale: "norwegian" } })).toEqual({
      ...krone,
      grade: null,
    });
  });

  test("asks for every field, a Grade on the scales Items start on", () => {
    expect(new Set<string>(readingSchema.required)).toEqual(
      new Set(Object.keys(nothing)),
    );
    const grade = readingSchema.properties.grade.anyOf[0];
    expect(grade.properties.scale.enum).toEqual([
      "norwegian",
      "sheldon",
      "european",
      "international",
    ]);
    expect(grade.properties.value.enum).toContain("0/01");
    expect(grade.properties.value.enum).toContain("65");
    expect(grade.properties.value.enum).toContain("AU");
    expect(grade.properties.value.enum).not.toContain("mnh");
  });
});

describe("the facts a scan suggests", () => {
  test("are a banknote's own: no metal, mint mark or size", () => {
    expect(
      factsFrom(
        { ...note, material: "silver", mintMark: "KB", diameter: 21 },
        today,
      ),
    ).toEqual({
      country: "NO",
      year: 2017,
      denomination: "100 krone",
      series: "Series VIII",
      serialNumber: "AB 1234567",
      signatures: "Øystein Olsen, Ida Wolden Bache",
      printer: "Oberthur Fiduciaire",
    });
  });

  test("are a coin's own: nothing printed on banknotes", () => {
    expect(
      factsFrom(
        { ...krone, serialNumber: "AB 1234567", printer: "Royal Mint" },
        today,
      ),
    ).toEqual({
      country: "NO",
      year: 1997,
      denomination: "1 krone",
      ruler: "Harald V",
      material: "cupronickel",
      diameter: 21,
    });
  });

  test("leave out text longer than the Item takes", () => {
    expect(
      factsFrom({ ...note, serialNumber: "A".repeat(101) }, today).serialNumber,
    ).toBeUndefined();
  });
});

describe("the Grade a scan suggests", () => {
  test("is on the scale the Item starts on", () => {
    expect(gradeFrom(krone, "NO")).toEqual({ scale: "norwegian", value: "1+" });
    expect(
      gradeFrom({ ...krone, grade: { scale: "sheldon", value: "45" } }, "US"),
    ).toEqual({ scale: "sheldon", value: "45" });
    expect(
      gradeFrom({ ...krone, grade: { scale: "european", value: "VF" } }, "DE"),
    ).toEqual({ scale: "european", value: "VF" });
    expect(
      gradeFrom(
        { ...note, grade: { scale: "international", value: "AU" } },
        "SE",
      ),
    ).toEqual({ scale: "international", value: "AU" });
  });

  test("isn't suggested on another scale, or as a code its scale hasn't", () => {
    // A Swedish coin starts on the European scale.
    expect(gradeFrom(krone, "SE")).toBeUndefined();
    expect(
      gradeFrom({ ...krone, grade: { scale: "european", value: "AU" } }, "DE"),
    ).toBeUndefined();
    expect(
      gradeFrom({ ...krone, grade: { scale: "sheldon", value: "57" } }, "US"),
    ).toBeUndefined();
    expect(gradeFrom({ ...krone, grade: null }, "NO")).toBeUndefined();
  });
});

describe("what a scan suggests", () => {
  const entry: ScanCandidate = {
    key: "no-note-100-viii",
    title: "100 kroner, series VIII",
    country: "NO",
    denomination: "100 kroner",
    series: "Series VIII",
    yearFrom: 2017,
    yearTo: 2024,
  };

  test("with a Catalog entry, adds what the entry can't say and the Grade", () => {
    expect(suggestionFrom(note, entry, today)).toEqual({
      itemType: "banknote",
      title: "100 kroner, series VIII",
      entry: { key: "no-note-100-viii", title: "100 kroner, series VIII" },
      facts: {
        year: 2017,
        serialNumber: "AB 1234567",
        signatures: "Øystein Olsen, Ida Wolden Bache",
      },
      grade: { scale: "norwegian", value: "0" },
    });
  });

  test("keeps the year read on an entry still issued, not on a one-year one", () => {
    const current = { ...entry, yearTo: undefined };
    expect(
      suggestionFrom({ ...note, year: 2019 }, current, today)?.facts.year,
    ).toBe(2019);
    const oneYear = { ...entry, yearFrom: 2017, yearTo: 2017 };
    expect(suggestionFrom(note, oneYear, today)?.facts.year).toBeUndefined();
  });

  test("takes the Grade's scale from the entry's country", () => {
    const euro = { ...entry, country: undefined };
    expect(suggestionFrom(note, euro, today)?.grade).toBeUndefined();
    expect(
      suggestionFrom(
        { ...note, grade: { scale: "international", value: "VF" } },
        euro,
        today,
      )?.grade,
    ).toEqual({ scale: "international", value: "VF" });
  });

  test("without an entry, is every fact read", () => {
    expect(suggestionFrom(krone, null, today)).toEqual({
      itemType: "coin",
      title: "1 krone 1997",
      facts: factsFrom(krone, today),
      grade: { scale: "norwegian", value: "1+" },
    });
  });

  test("is nothing for photos of neither a coin nor a banknote", () => {
    expect(suggestionFrom({ ...note, itemType: null }, null, today)).toBeNull();
  });
});

describe("the Catalog entries a banknote might be", () => {
  test("agree with its denomination and series, and hold its year", () => {
    const series = (key: string, yearFrom: number, yearTo?: number) => ({
      key,
      title: key,
      country: "NO",
      denomination: "100 kroner",
      series: `Series ${key}`,
      yearFrom,
      yearTo,
    });
    const entries = [
      series("VII", 1994, 2016),
      series("VIII", 2017),
      { ...series("VIII", 2017), key: "200", denomination: "200 kroner" },
      { ...series("VIII", 2017), key: "SE", country: "SE" },
    ];
    expect(rankCandidates(note, entries).map(({ key }) => key)).toEqual([
      "VIII",
      "200",
    ]);
    // Series VIII is still issued: a note printed later is one of its.
    expect(
      rankCandidates({ ...note, year: 2023 }, entries).map(({ key }) => key),
    ).toEqual(["VIII", "200"]);
  });
});
