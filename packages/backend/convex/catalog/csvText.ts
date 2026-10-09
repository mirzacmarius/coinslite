/**
 * Comma-separated values as RFC 4180 has them: a field may be quoted, with ""
 * for a quote inside, and may then hold commas and line breaks. Pure. Both the
 * Catalog CSV and the Collection CSV are read and written with it.
 */

export type ParsedCsv =
  | { records: string[][] }
  /** A quote opened on this record (1 = the first) and never closed. */
  | { unclosedQuoteAt: number };

/** The file's records. A leading byte order mark is ignored; lines end in CRLF or LF. */
export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let fieldIsQuoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endField = () => {
    record.push(field);
    field = "";
    fieldIsQuoted = false;
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (char === '"') quoted = false;
      else field += char;
      i += 1;
      continue;
    }
    if (char === '"' && field === "" && !fieldIsQuoted) {
      quoted = true;
      fieldIsQuoted = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\r" || char === "\n") {
      endRecord();
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else {
      field += char;
    }
    i += 1;
  }
  if (quoted) return { unclosedQuoteAt: records.length + 1 };
  if (field !== "" || fieldIsQuoted || record.length > 0) endRecord();
  return { records };
}

/** One record as a CSV line, CRLF-terminated, quoting only where needed. */
export function formatCsvRecord(cells: readonly string[]) {
  return `${cells
    .map((cell) =>
      /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell,
    )
    .join(",")}\r\n`;
}

/** The text spreadsheets take as a sign the file is UTF-8. */
export const byteOrderMark = "\uFEFF";

/** A whole file: the byte order mark, then one CRLF-terminated line per record. */
export function formatCsvFile(records: readonly (readonly string[])[]) {
  return byteOrderMark + records.map(formatCsvRecord).join("");
}
