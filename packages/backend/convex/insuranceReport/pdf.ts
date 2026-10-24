"use node";

import { type Locale, formattersFor } from "@coinslite/i18n";
import { type ItemType, gradeCode } from "../items/grades";
import { calendarDate } from "../pdf/dates";
import {
  type PdfColumn,
  type PdfFacts,
  renderTableDocument,
} from "../pdf/tableDocument";
import { type ReportMessages, reportMessages } from "./messages";
import type { ReportColumn } from "./rules";
import type { ReportContents } from "./validators";

/** How the report lists Items: coins, then banknotes, then stamps. */
const typeOrder: readonly ItemType[] = ["coin", "banknote", "stamp"];

type Row = ReportContents["rows"][number];

/** A Grade as the report prints it: "PF-65", "1−", "vz", or a stamp's Grade in words. */
function gradeText(row: Row, messages: ReportMessages, locale: Locale) {
  if (!row.gradingScale || !row.grade) return "";
  if (row.gradingScale === "stamp")
    return (
      messages.stampGrades[row.grade as keyof ReportMessages["stampGrades"]] ??
      ""
    );
  return gradeCode(row.gradingScale, row.grade, row.strike, locale) ?? "";
}

/**
 * Lays out an Insurance report (spec 10) as an A4 landscape PDF in `locale`,
 * with times in `timeZone`: the report's scope and counts, the owner's contact
 * details, the Spot prices used (when Metal value or Insured value is shown),
 * a summary of totals, one row per Item with a totals row, and a closing note.
 */
export async function insuranceReportPdf(
  report: ReportContents,
  {
    locale,
    timeZone,
    generatedAt,
  }: { locale: Locale; timeZone: string; generatedAt: number },
) {
  const messages = reportMessages[locale];
  const format = formattersFor(locale, { timeZone });
  const money = (amount: number) => format.money(amount, report.currency);
  const shows = (column: ReportColumn) => report.columns.includes(column);
  const { owner, totals } = report;

  const facts: PdfFacts[] = [
    {
      heading: messages.report,
      rows: [
        [
          messages.scope,
          report.scope.kind === "collection"
            ? messages.wholeCollection
            : [
                ...(report.scope.albums.length > 0
                  ? [messages.albums(report.scope.albums.join(", "))]
                  : []),
                ...(report.scope.withoutAlbum ? [messages.withoutAlbum] : []),
              ].join("\n"),
        ],
        [messages.items, format.number(totals.items)],
        [messages.pieces, format.number(totals.pieces)],
        [messages.currency, report.currency],
      ],
    },
    {
      heading: messages.owner,
      rows: (
        [
          [messages.name, owner.name],
          [messages.email, owner.email],
          [messages.phone, owner.phone],
          [
            messages.address,
            [
              owner.streetAddress,
              [owner.postalCode, owner.city].filter(Boolean).join(" "),
              owner.country && format.country(owner.country),
            ]
              .filter(Boolean)
              .join("\n"),
          ],
        ] as const
      ).flatMap(([label, value]) => (value ? [[label, value] as const] : [])),
    },
  ];
  if (shows("metalValue") || shows("insuredValue")) {
    const prices = report.spotPrices;
    facts.push({
      heading: messages.spotPrices,
      rows: prices
        ? [
            [
              messages.gold,
              messages.spotPrice(
                money(prices.gold.perGram),
                money(prices.gold.perOunce),
              ),
            ],
            [
              messages.silver,
              messages.spotPrice(
                money(prices.silver.perGram),
                money(prices.silver.perOunce),
              ),
            ],
            [messages.quotedAt, format.dateTime(prices.quotedAt)],
            ...(prices.stale ? [["", messages.stale] as const] : []),
          ]
        : [["", messages.noSpotPrices]],
    });
  }

  const columns: PdfColumn[] = [
    { label: messages.type, width: 8 },
    { label: messages.itemTitle, width: 23 },
    { label: messages.year, width: 5 },
    { label: messages.denomination, width: 11 },
    { label: messages.grade, width: 11 },
    { label: messages.quantity, width: 9, align: "right" },
    ...report.columns.map((column) => ({
      label: messages.columns[column],
      width: 13,
      align: "right" as const,
    })),
  ];
  const collator = new Intl.Collator(locale, { numeric: true });
  const rows = [...report.rows]
    .sort(
      (a, b) =>
        typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) ||
        collator.compare(a.title, b.title) ||
        (a.year ?? 0) - (b.year ?? 0),
    )
    .map((row) => [
      messages.itemTypes[row.type],
      row.title,
      row.year === undefined ? "" : String(row.year),
      row.denomination ?? "",
      gradeText(row, messages, locale),
      format.number(row.quantity),
      ...report.columns.map((column) => {
        const value = row.values[column];
        return value === undefined ? "" : money(value);
      }),
    ]);
  const totalsRow = [
    messages.total,
    "",
    "",
    "",
    "",
    format.number(totals.pieces),
    ...report.columns.map((column) => money(totals.values[column] ?? 0)),
  ];

  const pdf = await renderTableDocument({
    language: locale,
    title: messages.title,
    subtitle: messages.generated(format.dateTime(generatedAt)),
    author: owner.name ?? owner.email,
    facts,
    summary: {
      heading: messages.summary,
      figures: report.columns.map((column) => ({
        label: messages.columns[column],
        value: money(totals.values[column] ?? 0),
      })),
    },
    table: { columns, rows, totals: totalsRow },
    closingNote: {
      heading: messages.aboutValues,
      paragraphs: [
        messages.notes.perItem(report.currency),
        ...(shows("purchasePrice") || shows("marketValue")
          ? [messages.notes.ownerStated]
          : []),
        ...(shows("metalValue") ? [messages.notes.metalValue] : []),
        ...(shows("insuredValue") ? [messages.notes.insuredValue] : []),
      ],
    },
    pageLabel: messages.page,
    footer: [
      messages.title,
      owner.name ?? owner.email,
      format.date(generatedAt),
    ]
      .filter(Boolean)
      .join(" · "),
  });
  return {
    fileName: `${messages.fileName}-${calendarDate(generatedAt, timeZone)}.pdf`,
    pdf,
  };
}
