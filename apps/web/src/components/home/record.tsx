import { CoinFace } from "@/components/coin-face";
import { likelyCurrency } from "@/i18n/currency";
import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import {
  formatCountry,
  formatDate,
  formatMoney,
  type Locale,
} from "@coinslite/i18n";
import type { ReactNode } from "react";

const chapters = ["catalog", "grade", "purchase", "photos", "value"] as const;

/** The example's money, per currency: round, plausible figures. */
const example = {
  paid: { NOK: 95_000, EUR: 8_800, USD: 9_500, RON: 43_000 },
  worth: { NOK: 125_000, EUR: 11_000, USD: 12_000, RON: 55_000 },
};

/**
 * One coin's record: chapters on the left, and the card on the right filling
 * in, field by field, as they pass (motion/setup.ts). Without motion the card
 * shows complete.
 */
export function Record({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary["record"];
}) {
  const currency = likelyCurrency[locale];
  const money = (minor: number, signed = false) =>
    formatMoney(minor, currency, locale, { signed });
  const paid = example.paid[currency];
  const worth = example.worth[currency];
  const card = t.card;
  // The Catalog's own title and series, which stay in the issuing country's
  // language (docs/translation-glossary.md).
  const title = "Morgan dollar 1921";
  const rows: {
    field: number;
    label: string;
    value: ReactNode;
    className?: string;
  }[] = [
    { field: 1, label: card.fields.catalog, value: card.values.catalog },
    { field: 2, label: card.fields.grade, value: card.values.grade },
    { field: 2, label: card.fields.strike, value: card.values.strike },
    { field: 3, label: card.fields.purchase, value: money(paid) },
    {
      field: 3,
      label: card.fields.source,
      value: format(card.values.source, {
        date: formatDate("2019-04-14", locale),
      }),
    },
    { field: 4, label: card.fields.photos, value: card.values.photos },
    { field: 5, label: card.fields.market, value: money(worth) },
    { field: 5, label: card.fields.metal, value: card.values.metal },
    {
      field: 5,
      label: card.fields.gain,
      value: money(worth - paid, true),
      className: "gain",
    },
  ];
  return (
    <section
      id="record"
      className="record"
      aria-labelledby="record-title"
      data-record
    >
      <div className="wrap grid-12">
        <div className="record__head">
          <h2 id="record-title" className="heading" data-split="lines">
            {t.title}
          </h2>
          <p className="lead muted mt-6 max-w-[36ch]" data-reveal>
            {t.lead}
          </p>
        </div>
        <div className="record__card-col">
          <div>
            <article
              className="record-card"
              data-record-card
              data-step="all"
              aria-label={`${t.example}: ${title}`}
            >
              <div className="record-card__head">
                <div>
                  <p className="label">{t.example}</p>
                  <p className="record-card__title mt-3">{title}</p>
                  <p className="muted mt-2 text-sm">
                    {formatCountry("US", locale)} · Morgan dollar
                  </p>
                </div>
                <div className="record-card__coins" aria-hidden="true">
                  <CoinFace date="1921" />
                  <CoinFace date="1921" side="reverse" />
                </div>
              </div>
              <dl className="record-card__rows">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="record-row"
                    data-field={row.field}
                  >
                    <dt>{row.label}</dt>
                    <dd>
                      <span
                        className={`record-row__value ${row.className ?? ""}`}
                      >
                        {row.value}
                      </span>
                      <span className="record-row__blank" aria-hidden="true" />
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>
        </div>
        <ol className="record__chapters">
          {chapters.map((key, index) => (
            <li key={key} className="chapter" data-chapter={index}>
              <span className="chapter__number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{t.chapters[key].title}</h3>
                <p>{t.chapters[key].text}</p>
                {/* On a phone, what this step writes on the card, under it. */}
                <dl className="chapter__fields">
                  {rows
                    .filter((row) => row.field === index + 1)
                    .map((row) => (
                      <div key={row.label} className="record-row">
                        <dt>{row.label}</dt>
                        <dd className={row.className}>{row.value}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
