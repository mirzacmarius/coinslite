import type { Dictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import type { PremiumCurrency } from "@coinslite/backend/convex/billing/rules";
import { type Locale, formatCountry, formatMoney } from "@coinslite/i18n";
import { ItemTypeIcon } from "@coinslite/ui/item-type-icon";

type SampleItem = {
  type: "coin" | "banknote" | "stamp";
  /** As the Catalog titles it, in the issuing country's language. */
  title: string;
  country: string;
  grade?: string;
  /** Market value in minor units, per currency. */
  value: Record<PremiumCurrency, number>;
};

/** A made-up Collection for the home page; values are round, plausible figures. */
const sampleItems: SampleItem[] = [
  {
    type: "coin",
    title: "Krugerrand 1 oz 2023",
    country: "ZA",
    grade: "UNC",
    value: { NOK: 3_800_000, EUR: 330_000, USD: 380_000, RON: 1_650_000 },
  },
  {
    type: "coin",
    title: "1 dollar 1921",
    country: "US",
    grade: "MS-63",
    value: { NOK: 120_000, EUR: 10_500, USD: 12_000, RON: 52_000 },
  },
  {
    type: "coin",
    title: "2 øre 1918",
    country: "NO",
    grade: "1+",
    value: { NOK: 25_000, EUR: 2_200, USD: 2_400, RON: 11_000 },
  },
  {
    type: "banknote",
    title: "100 kroner 1962",
    country: "NO",
    grade: "1",
    value: { NOK: 60_000, EUR: 5_200, USD: 6_000, RON: 26_000 },
  },
  {
    type: "stamp",
    title: "Penny Black 1840",
    country: "GB",
    value: { NOK: 300_000, EUR: 26_000, USD: 30_000, RON: 130_000 },
  },
];

/** The example's purchases: a little under today's Market values. */
const purchaseShare = 0.85;

/** A glimpse of the app: an example Collection list with its totals. */
export function CollectionPreview({
  locale,
  currency,
  t,
}: {
  locale: Locale;
  currency: PremiumCurrency;
  t: Dictionary["preview"];
}) {
  const money = (minor: number, signed = false) =>
    formatMoney(minor, currency, locale, { signed });
  const total = sampleItems.reduce(
    (sum, item) => sum + item.value[currency],
    0,
  );
  const gain = Math.round((total * (1 - purchaseShare)) / 100) * 100;
  return (
    <figure
      aria-label={t.label}
      className="overflow-hidden rounded-lg border bg-card shadow-sm"
    >
      <div className="flex h-11 items-center justify-between border-b px-4 text-[13px]">
        <span className="font-medium">{t.title}</span>
        <span className="text-xs text-muted-foreground">
          {format(t.items, { count: sampleItems.length })}
        </span>
      </div>
      <ul className="divide-y">
        {sampleItems.map((item) => (
          <li
            key={item.title}
            className="flex min-h-12 items-center gap-3 px-4 py-2 text-[13px]"
          >
            <ItemTypeIcon type={item.type} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{item.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {t.types[item.type]} · {formatCountry(item.country, locale)}
              </div>
            </div>
            {item.grade && (
              <span className="hidden h-6 items-center rounded-md border px-1.5 text-xs text-muted-foreground sm:inline-flex">
                {item.grade}
              </span>
            )}
            <span className="w-24 text-right tabular-nums">
              {money(item.value[currency])}
            </span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 border-t bg-muted/40 text-[13px]">
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <dt className="text-xs text-muted-foreground">{t.marketValue}</dt>
          <dd className="font-semibold tabular-nums">{money(total)}</dd>
        </div>
        <div className="flex flex-col gap-0.5 border-l px-4 py-3">
          <dt className="text-xs text-muted-foreground">{t.gainLoss}</dt>
          <dd className="font-semibold tabular-nums text-success">
            {money(gain, true)}
          </dd>
        </div>
      </dl>
    </figure>
  );
}
