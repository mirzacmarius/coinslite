"use client";

import { useCurrentLocale, useI18n } from "@/locales/client";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import { cn } from "@coinslite/ui/utils";
import { type ReactNode, useCallback, useId, useMemo, useState } from "react";

/**
 * The colour of each money series, the same in every chart. Checked for
 * colour-blind separation and 3:1 contrast on the card surface in both
 * themes; set as CSS variables by `seriesColorVariables` on a parent.
 */
export const seriesColors = {
  purchasePrice: "var(--series-purchase)",
  marketValue: "var(--series-market)",
  metalValue: "var(--series-metal)",
} as const;

export type Series = keyof typeof seriesColors;

export const seriesColorVariables =
  "[--series-purchase:#096c9a] [--series-market:#c76c05] [--series-metal:#673ab6] dark:[--series-purchase:#1897d6] dark:[--series-market:#d9700f] dark:[--series-metal:#9e74e8]";

/** The legend: each series' colour beside its name, as a line or a bar swatch. */
export function Legend({
  entries,
  shape,
}: {
  entries: { series: Series; label: string; value?: string }[];
  shape: "line" | "bar";
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {entries.map(({ series, label, value }) => (
        <li key={series} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0",
              shape === "line"
                ? "h-0.5 w-3 rounded-full"
                : "size-2.5 rounded-sm",
            )}
            style={{ background: seriesColors[series] }}
          />
          {label}
          {value && (
            <span className="font-medium text-foreground">{value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * A chart in a card: title, description, and a switch to the same numbers as
 * a table, for anyone who'd rather read them than compare shapes.
 */
export function ChartCard({
  title,
  description,
  controls,
  chart,
  table,
}: {
  title: string;
  description: string;
  /** More choices before the chart/table switch, e.g. what the chart shows. */
  controls?: ReactNode;
  chart: ReactNode;
  table: (titleId: string) => ReactNode;
}) {
  const t = useI18n();
  const titleId = useId();
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col rounded-xl bg-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b px-4 py-2">
        <div className="flex min-w-0 flex-1 basis-56 flex-col">
          <h3 id={titleId} className="text-ui font-medium">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {controls}
        <SegmentedControl
          label={t("collectionTotals.view")}
          options={[
            { value: "chart", label: t("collectionTotals.chart") },
            { value: "table", label: t("collectionTotals.table") },
          ]}
          value={view}
          onChange={setView}
          className="shrink-0"
        />
      </div>
      {view === "chart" ? (
        <div className="flex flex-col gap-3 p-4">{chart}</div>
      ) : (
        // Scrolls on its own when long, so it needs to take focus for keyboards.
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region
        <div className="max-h-72 overflow-y-auto" tabIndex={0}>
          {table(titleId)}
        </div>
      )}
    </section>
  );
}

/** The width of an element, kept up to date as it resizes; 0 until measured. */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Formats "YYYY-MM" as a short month and year in the active language. */
export function useMonthFormat() {
  const locale = useCurrentLocale();
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return (month: string) => format.format(new Date(`${month}-01T00:00:00Z`));
  }, [locale]);
}
