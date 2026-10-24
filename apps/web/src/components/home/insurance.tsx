import { likelyCurrency } from "@/i18n/currency";
import type { Dictionary } from "@/i18n/dictionary";
import type { PremiumCurrency } from "@coinslite/backend/convex/billing/rules";
import {
  type GradingScale,
  gradeCode,
} from "@coinslite/backend/convex/items/grades";
import { formatMoney, type Locale } from "@coinslite/i18n";

type Money = Record<PremiumCurrency, number>;

/**
 * The example report's rows: values per piece, in minor units. Grades are
 * written as the PDF writes them in each language (a European Grade as
 * German and French collectors do).
 */
const rows: {
  title: string;
  grade: { scale: GradingScale; value: string };
  quantity: number;
  market: Money;
  metal: Money | null;
}[] = [
  {
    title: "Krugerrand 1 oz 2023",
    grade: { scale: "european", value: "UNC" },
    quantity: 1,
    market: { NOK: 3_800_000, EUR: 330_000, USD: 380_000, RON: 1_650_000 },
    metal: { NOK: 3_650_000, EUR: 317_000, USD: 365_000, RON: 1_585_000 },
  },
  {
    title: "Morgan dollar 1921",
    grade: { scale: "sheldon", value: "63" },
    quantity: 1,
    market: { NOK: 125_000, EUR: 11_000, USD: 12_000, RON: 55_000 },
    metal: { NOK: 30_000, EUR: 2_700, USD: 3_000, RON: 13_000 },
  },
  {
    title: "Peace dollar 1922",
    grade: { scale: "sheldon", value: "62" },
    quantity: 3,
    market: { NOK: 45_000, EUR: 4_000, USD: 4_500, RON: 20_000 },
    metal: { NOK: 30_000, EUR: 2_700, USD: 3_000, RON: 13_000 },
  },
  {
    title: "100 kroner 1962",
    grade: { scale: "norwegian", value: "1" },
    quantity: 1,
    market: { NOK: 60_000, EUR: 5_200, USD: 6_000, RON: 26_000 },
    metal: null,
  },
  {
    title: "Penny Black 1840",
    grade: { scale: "stamp", value: "used" },
    quantity: 1,
    market: { NOK: 300_000, EUR: 26_000, USD: 30_000, RON: 130_000 },
    metal: null,
  },
];

/**
 * The Insurance report, sold by showing it: a sheet set like the PDF, with
 * the highest of each Item's values as its Insured value.
 */
export function Insurance({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary["insurance"];
}) {
  const currency = likelyCurrency[locale];
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const lines = rows.map((row) => {
    const market = row.market[currency] * row.quantity;
    const metal = row.metal ? row.metal[currency] * row.quantity : null;
    return { ...row, market, metal, insured: Math.max(market, metal ?? 0) };
  });
  const total = (pick: (line: (typeof lines)[number]) => number) =>
    lines.reduce((sum, line) => sum + pick(line), 0);
  const columns = t.sheet.columns;
  return (
    <section
      id="insurance"
      className="insurance"
      aria-labelledby="insurance-title"
    >
      <div className="wrap grid-12">
        <div className="insurance__sheet" data-reveal>
          <div className="sheet-frame">
            <div className="sheet-stack">
              <figure
                className="sheet"
                aria-label={`${t.sheet.title} (${t.sheet.example})`}
              >
                <div className="sheet__head">
                  <div>
                    <p className="sheet__title">{t.sheet.title}</p>
                    <p className="muted mt-1">{t.sheet.owner}</p>
                  </div>
                  <p className="label">{t.sheet.example}</p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{columns.item}</th>
                      <th scope="col">{columns.grade}</th>
                      <th scope="col">{columns.quantity}</th>
                      <th scope="col">{columns.market}</th>
                      <th scope="col">{columns.metal}</th>
                      <th scope="col">{columns.insured}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.title}>
                        <th scope="row" className="font-normal">
                          {line.title}
                        </th>
                        <td>
                          {gradeCode(
                            line.grade.scale,
                            line.grade.value,
                            undefined,
                            locale,
                          ) ?? t.sheet.used}
                        </td>
                        <td>{line.quantity}</td>
                        <td>{money(line.market)}</td>
                        <td>{line.metal === null ? "" : money(line.metal)}</td>
                        <td>{money(line.insured)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>{t.sheet.total}</td>
                      <td />
                      <td>{total((line) => line.quantity)}</td>
                      <td>{money(total((line) => line.market))}</td>
                      <td>{money(total((line) => line.metal ?? 0))}</td>
                      <td>{money(total((line) => line.insured))}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className="sheet__note">{t.sheet.note}</p>
              </figure>
            </div>
          </div>
        </div>
        <div className="insurance__text">
          <p className="premium-mark" data-reveal>
            {t.premium}
          </p>
          <h2 id="insurance-title" className="heading mt-6" data-split="lines">
            {t.title}
          </h2>
          <p className="lead muted mt-6" data-reveal>
            {t.text}
          </p>
        </div>
      </div>
    </section>
  );
}
