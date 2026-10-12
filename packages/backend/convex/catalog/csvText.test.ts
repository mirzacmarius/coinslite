import { describe, expect, test } from "bun:test";
import { formatCsvFile, formatCsvRecord, parseCsv } from "./csvText";

describe("parseCsv", () => {
  test("reads one record per line, skipping a leading byte order mark", () => {
    expect(parseCsv("﻿title,year\r\n2 øre,1918\r\n")).toEqual({
      records: [
        ["title", "year"],
        ["2 øre", "1918"],
      ],
    });
  });

  test("lines may end in CRLF or LF, and the last one in nothing", () => {
    expect(parseCsv("a,b\nc,d\r\ne,f")).toEqual({
      records: [
        ["a", "b"],
        ["c", "d"],
        ["e", "f"],
      ],
    });
  });

  test("a quoted field holds commas, doubled quotes and line breaks", () => {
    expect(
      parseCsv(
        'title,notes\r\n"Krone, 1875","Bought at ""Oslo Mynt""\r\nin 1990"\r\n',
      ),
    ).toEqual({
      records: [
        ["title", "notes"],
        ["Krone, 1875", 'Bought at "Oslo Mynt"\r\nin 1990'],
      ],
    });
  });

  test("empty fields count, quoted or not", () => {
    expect(parseCsv('a,,""\r\n,b,')).toEqual({
      records: [
        ["a", "", ""],
        ["", "b", ""],
      ],
    });
  });

  test("a quote left open is reported with the record it opened on", () => {
    expect(parseCsv('title\r\nok\r\n"never closed\r\nmore,rows\r\n')).toEqual({
      unclosedQuoteAt: 3,
    });
  });
});

describe("writing CSV", () => {
  test("a record quotes only the cells that need it and ends in CRLF", () => {
    expect(
      formatCsvRecord(["2 øre", "Krone, 1875", 'Say "hi"', "line\nbreak", ""]),
    ).toBe('2 øre,"Krone, 1875","Say ""hi""","line\nbreak",\r\n');
  });

  test("a file starts with a byte order mark", () => {
    expect(
      formatCsvFile([
        ["title", "year"],
        ["2 øre", "1918"],
      ]),
    ).toBe("﻿title,year\r\n2 øre,1918\r\n");
  });

  test("what is written reads back the same", () => {
    const records = [
      ["title", "notes", "price"],
      ["Krone, 1875", 'From "Oslo Mynt"\r\nsecond line', "1250.50"],
      ["", "only a note\n", ""],
      ["old Mac\rline", "", "-"],
    ];

    expect(parseCsv(formatCsvFile(records))).toEqual({ records });
  });
});
