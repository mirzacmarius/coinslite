"use node";

import fontkit from "@pdf-lib/fontkit";
import {
  type PDFDocument as Document,
  PDFDocument,
  type PDFFont,
  type PDFPage,
  PageSizes,
  rgb,
} from "pdf-lib";
import { pdfFonts } from "./fonts";

/**
 * Printable reports: an A4 landscape document with a header block (title,
 * groups of facts, headline figures), one table that runs over as many pages
 * as it needs with its column headings repeated and a totals row at the end,
 * an optional closing note, and page numbers. Text is set in Geist, embedded
 * (only the characters used), so every language CoinsLite speaks prints
 * correctly. Pure: it lays out what it's given and returns the file.
 */

export type PdfColumn = {
  label: string;
  /** The column's share of the table's width, relative to the other columns. */
  width: number;
  /** Amounts and counts are right-aligned. */
  align?: "left" | "right";
};

/** Labelled values under a heading, such as the owner's contact details. */
export type PdfFacts = {
  heading: string;
  /** A value may hold line breaks, e.g. an address. */
  rows: readonly (readonly [label: string, value: string])[];
};

export type PdfTableDocument = {
  /** The language of the text, as a BCP 47 tag ("nb"). */
  language: string;
  title: string;
  /** A line under the title, e.g. when the document was made. */
  subtitle?: string;
  /** Who the document is about or for; stored in the file's properties. */
  author?: string;
  /** Groups of facts under the title, side by side. */
  facts: readonly PdfFacts[];
  /** Headline figures between the facts and the table. */
  summary?: {
    heading: string;
    figures: readonly { label: string; value: string }[];
  };
  table: {
    columns: readonly PdfColumn[];
    /** One cell per column. Long text wraps within its column. */
    rows: readonly (readonly string[])[];
    /** The last row, set apart: one cell per column. */
    totals?: readonly string[];
  };
  /** Paragraphs after the table. */
  closingNote?: { heading: string; paragraphs: readonly string[] };
  /** The page number at the bottom right of every page: "Page 2 of 5". */
  pageLabel: (page: number, pageCount: number) => string;
  /** Text at the bottom left of every page. */
  footer?: string;
};

const [pageHeight, pageWidth] = PageSizes.A4;
const margin = 36;
const contentWidth = pageWidth - 2 * margin;
/** The lowest point content may reach; the footer sits below it. */
const contentBottom = margin + 18;

const ink = rgb(0.06, 0.09, 0.16);
const muted = rgb(0.28, 0.33, 0.41);
const rule = rgb(0.89, 0.91, 0.94);
const headingFill = rgb(0.97, 0.98, 0.99);

const size = {
  title: 16,
  subtitle: 9,
  heading: 9,
  label: 8,
  text: 9,
  figure: 12,
  cell: 8.5,
  footer: 7.5,
};
const leading = 1.3;
const cellPadding = { x: 4, y: 3.5 };

const bytesOf = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

/** A font with what layout needs: text it can set, measured quickly. */
export type Face = {
  font: PDFFont;
  /** The text with characters the font lacks replaced: odd spaces by a no-break space. */
  clean: (text: string) => string;
  width: (text: string, size: number) => number;
};

export async function embedFace(
  document: Document,
  base64: string,
): Promise<Face> {
  const font = await document.embedFont(bytesOf(base64), { subset: true });
  const has = new Set(font.getCharacterSet());
  const widths = new Map<string, number>();
  const clean = (text: string) =>
    Array.from(text, (char) => {
      const code = char.codePointAt(0) ?? 0;
      if (has.has(code) || char === "\n") return char;
      // Narrow and thin spaces, as some languages group digits with.
      return /\s/.test(char) ? " " : char;
    }).join("");
  const width = (text: string, at: number) => {
    let total = 0;
    for (const char of text) {
      let unit = widths.get(char);
      if (unit === undefined) {
        unit = font.widthOfTextAtSize(char, 1);
        widths.set(char, unit);
      }
      total += unit;
    }
    return total * at;
  };
  return { font, clean, width };
}

/**
 * Where a word too wide for a line breaks: before an email address's "@" when
 * the domain then fits on one line, else at the last place that fits before a
 * "." or "@" or after a "-", else after the last character that fits.
 */
function breakPoint(face: Face, word: string, at: number, maxWidth: number) {
  const fits = (text: string) => face.width(text, at) <= maxWidth;
  const sign = word.lastIndexOf("@");
  if (sign > 0 && fits(word.slice(0, sign)) && fits(word.slice(sign)))
    return sign;
  for (let cut = word.length - 1; cut > 0; cut--) {
    const soft =
      word[cut] === "." || word[cut] === "@" || word[cut - 1] === "-";
    if (soft && fits(word.slice(0, cut))) return cut;
  }
  let cut = word.length - 1;
  while (cut > 1 && !fits(word.slice(0, cut))) cut--;
  return cut;
}

/**
 * Breaks text into lines no wider than `maxWidth`: at spaces (not no-break
 * spaces, so "1 234 kr" stays whole), at explicit line breaks, and inside a
 * word only when the word alone is too wide.
 */
export function wrap(face: Face, text: string, at: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of face.clean(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/ +/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (face.width(candidate, at) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      while (line.length > 1 && face.width(line, at) > maxWidth) {
        const cut = breakPoint(face, line, at, maxWidth);
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Lays out a table document and returns the PDF file. */
export async function renderTableDocument(
  spec: PdfTableDocument,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const regular = await embedFace(document, pdfFonts.regular);
  const semiBold = await embedFace(document, pdfFonts.semiBold);
  document.setTitle(spec.title);
  document.setLanguage(spec.language);
  document.setCreator("CoinsLite");
  document.setProducer("CoinsLite");
  if (spec.author) document.setAuthor(spec.author);

  let page: PDFPage = document.addPage([pageWidth, pageHeight]);
  /** Where the next line's top goes, measured from the bottom of the page. */
  let y = pageHeight - margin;
  const newPage = () => {
    page = document.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };
  const text = (
    value: string,
    x: number,
    top: number,
    face: Face,
    at: number,
    color = ink,
  ) => {
    // Text sits on its baseline; place it so the line's top is at `top`.
    page.drawText(face.clean(value), {
      x,
      y: top - at,
      size: at,
      font: face.font,
      color,
    });
  };

  // Title
  text(spec.title, margin, y, semiBold, size.title);
  y -= size.title * leading;
  if (spec.subtitle) {
    text(spec.subtitle, margin, y, regular, size.subtitle, muted);
    y -= size.subtitle * leading;
  }
  y -= 14;

  // Facts, up to three groups side by side
  const groupGap = 24;
  for (let first = 0; first < spec.facts.length; first += 3) {
    const groups = spec.facts.slice(first, first + 3);
    const groupWidth = (contentWidth - groupGap * 2) / 3;
    const labelWidth = groupWidth * 0.34;
    const valueWidth = groupWidth - labelWidth - 8;
    const heights = groups.map((group, index) => {
      const x = margin + index * (groupWidth + groupGap);
      let top = y;
      text(group.heading, x, top, semiBold, size.heading);
      top -= size.heading * leading + 4;
      for (const [label, value] of group.rows) {
        const labelLines = wrap(regular, label, size.label, labelWidth);
        const valueLines = wrap(regular, value, size.text, valueWidth);
        labelLines.forEach((line, n) => {
          text(
            line,
            x,
            top - n * size.text * leading,
            regular,
            size.label,
            muted,
          );
        });
        valueLines.forEach((line, n) => {
          text(
            line,
            x + labelWidth + 8,
            top - n * size.text * leading,
            regular,
            size.text,
          );
        });
        top -=
          Math.max(labelLines.length, valueLines.length) * size.text * leading +
          3;
      }
      return y - top;
    });
    y -= Math.max(...heights) + 14;
  }

  // Summary figures
  if (spec.summary) {
    text(spec.summary.heading, margin, y, semiBold, size.heading);
    y -= size.heading * leading + 6;
    const perRow = 6;
    const figureWidth = contentWidth / perRow;
    spec.summary.figures.forEach((figure, index) => {
      const column = index % perRow;
      if (index > 0 && column === 0) y -= 36;
      const x = margin + column * figureWidth;
      text(figure.label, x, y, regular, size.label, muted);
      text(
        figure.value,
        x,
        y - size.label * leading - 2,
        semiBold,
        size.figure,
      );
    });
    y -= 36 + 8;
  }

  // Table
  const { columns, rows, totals } = spec.table;
  const share = columns.reduce((sum, column) => sum + column.width, 0);
  /** Each column's place across the page. */
  const slots = columns.map((column, index) => ({
    left: columns
      .slice(0, index)
      .reduce(
        (sum, other) => sum + (other.width / share) * contentWidth,
        margin,
      ),
    width: (column.width / share) * contentWidth,
    right: column.align === "right",
  }));
  const lineHeight = size.cell * leading;
  /** A cell's lines, at the cell size or, for headings, smaller until no word breaks. */
  type Cell = { lines: string[]; at: number; slot: (typeof slots)[number] };
  const layoutRow = (
    cells: readonly string[],
    face: Face,
    { keepWords = false } = {},
  ): Cell[] =>
    slots.map((slot, index) => {
      const cell = cells[index] ?? "";
      const room = slot.width - 2 * cellPadding.x;
      const widestWord = Math.max(
        0,
        ...face
          .clean(cell)
          .split(/\s+/)
          .map((word) => face.width(word, 1)),
      );
      const at =
        keepWords && widestWord * size.cell > room
          ? Math.max(6, room / widestWord)
          : size.cell;
      return { lines: wrap(face, cell, at, room), at, slot };
    });
  const heightOf = (cells: Cell[]) =>
    Math.max(...cells.map((cell) => cell.lines.length * cell.at * leading)) +
    2 * cellPadding.y;
  const drawCells = (cells: Cell[], face: Face, color = ink) => {
    for (const { lines, at, slot } of cells) {
      lines.forEach((cellLine, n) => {
        const x = slot.right
          ? slot.left + slot.width - cellPadding.x - face.width(cellLine, at)
          : slot.left + cellPadding.x;
        text(
          cellLine,
          x,
          y - cellPadding.y - n * at * leading,
          face,
          at,
          color,
        );
      });
    }
  };
  const line = (at: number, thickness: number, color = rule) =>
    page.drawLine({
      start: { x: margin, y: at },
      end: { x: margin + contentWidth, y: at },
      thickness,
      color,
    });
  const headingLines = layoutRow(
    columns.map((column) => column.label),
    semiBold,
    { keepWords: true },
  );
  const headingHeight = heightOf(headingLines);
  const drawHeadings = () => {
    page.drawRectangle({
      x: margin,
      y: y - headingHeight,
      width: contentWidth,
      height: headingHeight,
      color: headingFill,
    });
    drawCells(headingLines, semiBold, muted);
    y -= headingHeight;
    line(y, 0.75);
  };
  /** Starts a new page, headings and all, unless `height` still fits on this one. */
  const room = (height: number) => {
    if (y - height >= contentBottom) return;
    newPage();
    drawHeadings();
  };

  if (y - headingHeight - lineHeight * 2 < contentBottom) newPage();
  drawHeadings();
  for (const row of rows) {
    const lines = layoutRow(row, regular);
    const height = heightOf(lines);
    room(height);
    drawCells(lines, regular);
    y -= height;
    line(y, 0.5);
  }
  if (totals) {
    const lines = layoutRow(totals, semiBold);
    const height = heightOf(lines);
    room(height);
    line(y, 1, muted);
    drawCells(lines, semiBold);
    y -= height;
  }

  // Closing note
  if (spec.closingNote) {
    const noteWidth = Math.min(contentWidth, 560);
    const paragraphs = spec.closingNote.paragraphs.map((paragraph) =>
      wrap(regular, paragraph, size.text, noteWidth),
    );
    const height =
      size.heading * leading +
      4 +
      paragraphs.reduce(
        (sum, lines) => sum + lines.length * size.text * leading + 4,
        0,
      );
    y -= 18;
    if (y - height < contentBottom) newPage();
    text(spec.closingNote.heading, margin, y, semiBold, size.heading);
    y -= size.heading * leading + 4;
    for (const lines of paragraphs) {
      for (const noteLine of lines) {
        text(noteLine, margin, y, regular, size.text, muted);
        y -= size.text * leading;
      }
      y -= 4;
    }
  }

  // Page numbers and footer
  const pages = document.getPages();
  pages.forEach((each, index) => {
    page = each;
    const label = spec.pageLabel(index + 1, pages.length);
    const top = margin - 4;
    text(
      label,
      margin + contentWidth - regular.width(regular.clean(label), size.footer),
      top,
      regular,
      size.footer,
      muted,
    );
    if (spec.footer)
      text(spec.footer, margin, top, regular, size.footer, muted);
  });

  return await document.save();
}
