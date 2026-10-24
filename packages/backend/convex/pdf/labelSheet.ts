"use node";

import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  type PDFPage,
  fill,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  setFillingColor,
} from "pdf-lib";
import qrcode from "qrcode-generator";
import {
  type LabelLayout,
  type LabelSize,
  type SheetLabel,
  labelPlace,
  labelsPerSheet,
} from "../collection/labelSheet";
import { pdfFonts } from "./fonts";
import { type Face, embedFace, wrap } from "./tableDocument";

/**
 * Printable label sheets: one page per sheet of the layout, each label with
 * its title and lines set in Geist and centred on its height, and a QR code
 * of the label's link at its left when it has one. A line too wide shrinks,
 * then wraps (not on small labels), then is cut short with an ellipsis;
 * lines that don't fit are left out from the last. A layout without a
 * template gets faint cut lines. Pure: it lays out what it's given and
 * returns the file.
 */
export type LabelSheetSpec = {
  /** The language of the text, as a BCP 47 tag ("nb"). */
  language: string;
  /** The document's title, in its properties. */
  title: string;
  layout: LabelLayout;
  size: LabelSize;
  labels: readonly SheetLabel[];
  /** Labels of the first sheet left empty, as already used. */
  skip: number;
};

/** Points to the millimetre. */
const mm = 72 / 25.4;
const ink = rgb(0.06, 0.09, 0.16);
const cutLine = rgb(0.8, 0.82, 0.86);
const leading = 1.2;
/** The share of a label's width its QR code may take. */
const qrShare = 0.4;
/** Modules of white around a QR code within its square, on top of the label's padding. */
const quietModules = 1;

/**
 * Type sizes in points, how many lines the title and each line under it may
 * wrap to, and the padding in millimetres, for each label size.
 */
const typography: Record<
  LabelSize,
  { title: number; text: number; min: number; wrapTo: number; pad: number }
> = {
  small: { title: 6.5, text: 5.5, min: 4.5, wrapTo: 1, pad: 1.2 },
  medium: { title: 8, text: 6.5, min: 5, wrapTo: 2, pad: 1.8 },
  large: { title: 10, text: 7.5, min: 6, wrapTo: 2, pad: 2.5 },
};

/** Lays out the labels on their sheets and returns the PDF file. */
export async function renderLabelSheet(
  spec: LabelSheetSpec,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const regular = await embedFace(document, pdfFonts.regular);
  const semiBold = await embedFace(document, pdfFonts.semiBold);
  document.setTitle(spec.title);
  document.setLanguage(spec.language);
  document.setCreator("CoinsLite");
  document.setProducer("CoinsLite");

  const { layout } = spec;
  const pageSize: [number, number] = [
    layout.page.width * mm,
    layout.page.height * mm,
  ];
  const pages = new Map<number, PDFPage>();
  const pageOf = (sheet: number) => {
    for (let next = pages.size; next <= sheet; next++) {
      const page = document.addPage(pageSize);
      if (!layout.template) drawCutLines(page, layout);
      pages.set(next, page);
    }
    return pages.get(sheet) as PDFPage;
  };
  spec.labels.forEach((label, index) => {
    const place = labelPlace(layout, index + spec.skip);
    drawLabel(pageOf(place.sheet), label, {
      layout,
      size: spec.size,
      left: place.x * mm,
      top: (layout.page.height - place.y) * mm,
      regular,
      semiBold,
    });
  });
  if (pages.size === 0) pageOf(0);
  return await document.save();
}

/** Faint lines around every label of a sheet to cut out. */
function drawCutLines(page: PDFPage, layout: LabelLayout) {
  for (let index = 0; index < labelsPerSheet(layout); index++) {
    const { x, y } = labelPlace(layout, index);
    page.drawRectangle({
      x: x * mm,
      y: (layout.page.height - y - layout.label.height) * mm,
      width: layout.label.width * mm,
      height: layout.label.height * mm,
      borderColor: cutLine,
      borderWidth: 0.3,
    });
  }
}

/** A line of a label as it will be set. */
type Line = { text: string; size: number; face: Face };

/** The text cut short, with an ellipsis, to fit `room` at `size` points. */
function ellipsize(face: Face, text: string, size: number, room: number) {
  let keep = text.length;
  const shortened = () => `${text.slice(0, keep).trimEnd()}…`;
  while (keep > 1 && face.width(shortened(), size) > room) keep--;
  return shortened();
}

/**
 * The text as lines no wider than `room`: one line at `at` points, or
 * smaller down to `min`; when it may take more lines, wrapped at `at`
 * instead; and cut short with an ellipsis as the last resort.
 */
function fitText(
  face: Face,
  value: string,
  {
    at,
    min,
    room,
    maxLines,
  }: { at: number; min: number; room: number; maxLines: number },
): Line[] {
  const text = face.clean(value);
  let size = at;
  while (size > min && face.width(text, size) > room)
    size = Math.max(min, size - 0.25);
  if (face.width(text, size) <= room) return [{ text, size, face }];
  if (maxLines <= 1)
    return [{ text: ellipsize(face, text, size, room), size, face }];
  const lines = wrap(face, text, at, room);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const rest = lines.slice(maxLines - 1).join(" ");
    shown[maxLines - 1] = ellipsize(face, rest, at, room);
  }
  return shown.map((line) => ({ text: line, size: at, face }));
}

/**
 * One label: its title and as many of its lines as fit, centred on its
 * height, with its QR code at the left when it has a link.
 */
function drawLabel(
  page: PDFPage,
  label: SheetLabel,
  {
    layout,
    size,
    left,
    top,
    regular,
    semiBold,
  }: {
    layout: LabelLayout;
    size: LabelSize;
    /** The label's left edge and top edge, in points from the page's bottom-left. */
    left: number;
    top: number;
    regular: Face;
    semiBold: Face;
  },
) {
  const type = typography[size];
  const pad = type.pad * mm;
  const width = layout.label.width * mm;
  const height = layout.label.height * mm;
  const inner = height - 2 * pad;
  const qrSide = label.link ? Math.min(inner, width * qrShare) : 0;
  const textLeft = left + pad + (qrSide > 0 ? qrSide + 1.5 * mm : 0);
  const room = left + width - pad - textLeft;
  if (room <= 0) return;
  const fit = { min: type.min, room };
  const lines = [
    ...fitText(semiBold, label.title, {
      ...fit,
      at: type.title,
      maxLines: type.wrapTo,
    }),
    ...label.lines.flatMap((line) =>
      fitText(regular, line, { ...fit, at: type.text, maxLines: type.wrapTo }),
    ),
  ];
  const shown: Line[] = [];
  let used = 0;
  for (const line of lines) {
    const lineHeight = line.size * leading;
    // Half a point of give: a last line's descenders may touch the padding.
    if (used + lineHeight > inner + 0.5) break;
    shown.push(line);
    used += lineHeight;
  }
  const middle = top - height / 2;
  let y = middle + used / 2;
  for (const line of shown) {
    page.drawText(line.text, {
      x: textLeft,
      y: y - line.size,
      size: line.size,
      font: line.face.font,
      color: ink,
    });
    y -= line.size * leading;
  }
  if (label.link && qrSide > 0)
    drawQrCode(page, label.link, left + pad, middle - qrSide / 2, qrSide);
}

/**
 * The link as a QR code (error correction M) within a square of `side`
 * points whose bottom-left corner is (x, y), with a quiet zone inside the
 * square. Its dark modules are drawn as one rectangle per run in a row, so
 * a sheet of codes stays a small file.
 */
function drawQrCode(
  page: PDFPage,
  link: string,
  x: number,
  y: number,
  side: number,
) {
  const code = qrcode(0, "M");
  code.addData(link);
  code.make();
  const count = code.getModuleCount();
  const unit = side / (count + 2 * quietModules);
  const originX = x + quietModules * unit;
  const originTop = y + side - quietModules * unit;
  const operators = [pushGraphicsState(), setFillingColor(ink)];
  for (let row = 0; row < count; row++) {
    const rowBottom = originTop - (row + 1) * unit;
    for (let column = 0; column < count; ) {
      if (!code.isDark(row, column)) {
        column++;
        continue;
      }
      let end = column;
      while (end < count && code.isDark(row, end)) end++;
      // A hair taller than its row, so rows don't show seams when rendered.
      operators.push(
        rectangle(
          originX + column * unit,
          rowBottom,
          (end - column) * unit,
          unit * 1.03,
        ),
      );
      column = end;
    }
  }
  operators.push(fill(), popGraphicsState());
  page.pushOperators(...operators);
}
