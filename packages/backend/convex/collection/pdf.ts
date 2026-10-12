"use node";

import { formattersFor } from "@coinslite/i18n";
import { type GradingScale, type Strike, gradeCode } from "../items/grades";
import { calendarDate } from "../pdf/dates";
import {
  type PdfColumn,
  type PdfFacts,
  renderTableDocument,
} from "../pdf/tableDocument";
import { type ExportLabels, exportLabels } from "./exportLabels";
import type { PdfContents } from "./exports";
import { collectionPdfMessages } from "./pdfMessages";
import { defaultSort, withoutAlbum } from "./view";
import { countryName } from "./viewRules";

/** A Grade as the PDF prints it: "PF-65", "1−", or a stamp's Grade in words. */
function gradeText(
  labels: ExportLabels,
  scale: GradingScale | undefined,
  grade: string | undefined,
  strike?: Strike,
) {
  if (!scale || grade === undefined) return "";
  return (
    gradeCode(scale, grade, strike) ??
    labels.stampGrades[grade as keyof ExportLabels["stampGrades"]] ??
    ""
  );
}

/**
 * Which part of the Collection the view covers, one line per search or
 * filter as the Collection page names them, or the whole Collection.
 */
function scopeLines({ view, albumName, ownCountry, locale }: PdfContents) {
  const messages = collectionPdfMessages[locale];
  const labels = exportLabels[locale];
  const lines: string[] = [];
  const add = (name: string, value: string) =>
    lines.push(messages.filter(name, value));
  const search = view.search?.trim();
  if (search) add(messages.search, messages.quote(search));
  if (view.bullionOnly) add(labels.columns.type, messages.bullionCoins);
  else if (view.type) add(labels.columns.type, labels.types[view.type]);
  if (view.origin && ownCountry !== null)
    add(
      messages.origin,
      view.origin === "own"
        ? messages.origins.own(countryName(ownCountry, locale))
        : messages.origins.foreign,
    );
  if (view.country)
    add(labels.columns.country, countryName(view.country, locale));
  if (view.denomination) add(labels.columns.denomination, view.denomination);
  if (view.grade)
    add(
      labels.columns.grade,
      gradeText(labels, view.grade.gradingScale, view.grade.grade),
    );
  if (view.album)
    add(
      messages.album,
      view.album === withoutAlbum
        ? messages.withoutAlbum
        : (albumName ?? messages.unknownAlbum),
    );
  return lines.length > 0 ? lines : [messages.wholeCollection];
}

/**
 * Lays out a Collection view (spec 7) as an A4 landscape PDF in the contents'
 * language, with times in `timeZone`: the scope, sort, owner and totals, one
 * row per Item in the view's order with its amounts × Quantity and Gain/loss,
 * a totals row and a note about the values.
 */
export async function collectionPdf(
  contents: PdfContents,
  { timeZone, generatedAt }: { timeZone: string; generatedAt: number },
) {
  const { locale, currency, owner, totals } = contents;
  const messages = collectionPdfMessages[locale];
  const labels = exportLabels[locale];
  const format = formattersFor(locale, { timeZone });
  const money = (amount: number | undefined) =>
    amount === undefined ? "" : format.money(amount, currency);
  /** A Gain/loss with its sign, as the Collection page shows it: "+kr 150.00". */
  const signed = (amount: number | undefined) =>
    amount === undefined
      ? ""
      : format.money(amount, currency, { signed: true });
  const totalGainLoss =
    totals.gainLoss.items > 0 ? signed(totals.gainLoss.amount) : undefined;
  const ownerName = owner.name ?? owner.email;

  const facts: PdfFacts[] = [
    {
      heading: messages.view,
      rows: [
        [messages.scope, scopeLines(contents).join("\n")],
        [messages.sortedBy, messages.sorts[contents.view.sort ?? defaultSort]],
        [messages.currency, currency],
      ],
    },
    {
      heading: messages.owner,
      rows: (
        [
          [messages.name, owner.name],
          [messages.email, owner.email],
        ] as const
      ).flatMap(([label, value]) => (value ? [[label, value] as const] : [])),
    },
  ];

  const columns: PdfColumn[] = [
    { label: labels.columns.type, width: 8 },
    { label: labels.columns.title, width: 20 },
    { label: labels.columns.year, width: 5 },
    { label: labels.columns.denomination, width: 10 },
    { label: labels.columns.grade, width: 9 },
    { label: labels.columns.quantity, width: 7, align: "right" },
    { label: labels.columns.purchaseDate, width: 9 },
    { label: labels.columns.purchasePrice, width: 12, align: "right" },
    { label: labels.columns.marketValue, width: 12, align: "right" },
    { label: messages.gainLoss, width: 12, align: "right" },
  ];
  const rows = contents.rows.map((row) => [
    labels.types[row.type],
    row.title,
    row.year === undefined ? "" : String(row.year),
    row.denomination ?? "",
    gradeText(labels, row.gradingScale, row.grade, row.strike),
    format.number(row.quantity),
    row.purchaseDate ? format.date(row.purchaseDate) : "",
    money(row.purchasePrice),
    money(row.marketValue),
    signed(row.gainLoss),
  ]);
  const totalsRow = [
    messages.total,
    "",
    "",
    "",
    "",
    format.number(totals.pieces),
    "",
    money(totals.purchasePrice),
    money(totals.marketValue),
    totalGainLoss ?? "",
  ];

  const pdf = await renderTableDocument({
    language: locale,
    title: messages.title,
    subtitle: messages.generated(format.dateTime(generatedAt)),
    author: ownerName,
    facts,
    summary: {
      heading: messages.totals,
      figures: [
        { label: messages.items, value: format.number(totals.items) },
        { label: messages.pieces, value: format.number(totals.pieces) },
        {
          label: labels.columns.purchasePrice,
          value: money(totals.purchasePrice),
        },
        { label: labels.columns.marketValue, value: money(totals.marketValue) },
        { label: messages.gainLoss, value: totalGainLoss ?? "–" },
      ],
    },
    table: { columns, rows, totals: totalsRow },
    closingNote: {
      heading: messages.aboutValues,
      paragraphs: [
        messages.notes.perItem(currency),
        messages.notes.gainLoss,
        messages.notes.ownerStated,
      ],
    },
    pageLabel: messages.page,
    footer: [messages.title, ownerName, format.date(generatedAt)]
      .filter(Boolean)
      .join(" · "),
  });
  return {
    fileName: `${messages.fileName}-${calendarDate(generatedAt, timeZone)}.pdf`,
    pdf,
  };
}
