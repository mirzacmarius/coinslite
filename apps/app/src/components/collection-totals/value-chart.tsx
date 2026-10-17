"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  type CollectionTotals,
  valueByDateAdded,
} from "@coinslite/backend/convex/items/totals";
import type { MonthValue } from "@coinslite/backend/convex/items/valueOverTime";
import { SegmentedControl } from "@coinslite/ui/segmented-control";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coinslite/ui/table";
import {
  type KeyboardEvent,
  type PointerEvent,
  useId,
  useMemo,
  useState,
} from "react";
import {
  ChartCard,
  Legend,
  type Series,
  seriesColors,
  useElementWidth,
  useMonthFormat,
} from "./chart-card";

/** A month's amounts, one per series drawn. */
type Point = { month: string } & Partial<Record<Series, number>>;

/** Plot heights (the compact one for the Overview) and the room around them, in pixels. */
const PLOT_HEIGHTS = { regular: 160, compact: 112 };
const TOP = 8;
const AXIS_HEIGHT = 22;
const SIDE = 6;
const LABEL_GAP = 8;
const heightOf = (plotHeight: number) => TOP + plotHeight + AXIS_HEIGHT;

/** Measures axis label text (11px in the page's font), to size the label column. */
function useLabelWidth() {
  return useMemo(() => {
    const context =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
    if (!context) return (text: string) => text.length * 7;
    context.font = `11px ${getComputedStyle(document.body).fontFamily}`;
    return (text: string) => context.measureText(text).width;
  }, []);
}

/** Round steps (1, 2, 2.5, 5 × a power of ten) from 0 past `max`, about four of them. */
function axisTicks(max: number) {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n >= rough) ??
    10 * power;
  const ticks = [0];
  while ((ticks.at(-1) ?? 0) < max) ticks.push(ticks.length * step);
  return ticks;
}

type Mode = "overTime" | "byDateAcquired";

/**
 * The Collection's value by month (spec 7), two ways: "over time", what it
 * was worth at the end of each month (Purchase price, the latest Market value
 * and, with gold or silver, the Metal value at that month's Spot price); or
 * "by date acquired", the cumulative Purchase price and Market value by the
 * month Items were acquired: their purchase date, or when they were added if
 * that is earlier or there is none. Hover, or focus and use the arrow keys,
 * to read a month. `overTime` is undefined while it loads. `compact`, for
 * the Overview, shows only "over time", in a shorter plot.
 */
export function ValueChart({
  totals,
  overTime,
  compact = false,
}: {
  totals: CollectionTotals;
  overTime: MonthValue[] | undefined;
  compact?: boolean;
}) {
  const t = useI18n();
  const format = useFormatters();
  const monthLabel = useMonthFormat();
  const [chosenMode, setMode] = useState<Mode>("overTime");
  const mode: Mode = compact ? "overTime" : chosenMode;
  const plotHeight = PLOT_HEIGHTS[compact ? "compact" : "regular"];
  const series: Point[] | undefined = useMemo(() => {
    if (mode === "byDateAcquired") return valueByDateAdded(totals);
    return overTime?.map(({ metalValue, ...point }) =>
      metalValue === null ? point : { ...point, metalValue },
    );
  }, [mode, totals, overTime]);
  // Metal value is drawn only for a Collection that has some.
  const lines: Series[] = series?.some((point) => (point.metalValue ?? 0) > 0)
    ? ["purchasePrice", "marketValue", "metalValue"]
    : ["purchasePrice", "marketValue"];
  const names: Record<Series, string> = {
    purchasePrice: t("items.purchasePrice"),
    marketValue: t("items.marketValue"),
    metalValue: t("preciousMetal.metalValue"),
  };
  const money = (amount: number) => format.money(amount, totals.currency);
  const last = series?.at(-1);
  const title = t(
    mode === "overTime"
      ? "collectionTotals.valueOverTime"
      : "collectionTotals.valueByDateAcquired",
  );

  return (
    <ChartCard
      title={title}
      description={t(
        mode === "overTime"
          ? "collectionTotals.valueOverTimeDescription"
          : "collectionTotals.valueByDateAcquiredDescription",
      )}
      controls={
        !compact && (
          <SegmentedControl
            label={t("collectionTotals.valueMode")}
            options={[
              { value: "overTime", label: t("collectionTotals.overTime") },
              {
                value: "byDateAcquired",
                label: t("collectionTotals.byDateAcquired"),
              },
            ]}
            value={mode}
            onChange={setMode}
            className="shrink-0"
          />
        )
      }
      chart={
        series === undefined ? (
          <div
            className="animate-pulse rounded-md bg-muted"
            style={{ height: heightOf(plotHeight) + 20 }}
            aria-hidden="true"
          />
        ) : (
          <>
            <Legend
              shape="line"
              entries={lines.map((line) => ({
                series: line,
                label: names[line],
                value: last && money(last[line] ?? 0),
              }))}
            />
            <LineChart
              label={title}
              series={series}
              lines={lines}
              names={names}
              money={money}
              compactMoney={(amount) =>
                format.money(Math.round(amount), totals.currency, {
                  compact: true,
                })
              }
              monthLabel={monthLabel}
              plotHeight={plotHeight}
            />
          </>
        )
      }
      table={(titleId) => (
        <Table aria-labelledby={titleId}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">
                {t("collectionTotals.month")}
              </TableHead>
              {lines.map((line) => (
                <TableHead key={line} className="text-right last:pr-4">
                  {names[line]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {series?.map((point) => (
              <TableRow key={point.month}>
                <TableCell className="pl-4">
                  {monthLabel(point.month)}
                </TableCell>
                {lines.map((line) => (
                  <TableCell key={line} className="text-right last:pr-4">
                    {money(point[line] ?? 0)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    />
  );
}

function LineChart({
  label,
  series,
  lines,
  names,
  money,
  compactMoney,
  monthLabel,
  plotHeight,
}: {
  label: string;
  series: Point[];
  lines: Series[];
  names: Record<Series, string>;
  money: (amount: number) => string;
  compactMoney: (amount: number) => string;
  monthLabel: (month: string) => string;
  plotHeight: number;
}) {
  const t = useI18n();
  const hintId = useId();
  const height = heightOf(plotHeight);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const labelWidth = useLabelWidth();

  const ticks = axisTicks(
    Math.max(
      0,
      ...series.flatMap((point) => lines.map((line) => point[line] ?? 0)),
    ),
  );
  const tickLabels = ticks.map(compactMoney);
  const top = ticks.at(-1) ?? 1;
  const lastIndex = series.length - 1;
  // The y-axis labels get a column of their own, so lines never run over them.
  const left = Math.ceil(Math.max(...tickLabels.map(labelWidth))) + LABEL_GAP;
  const plotWidth = Math.max(0, width - left - 2 * SIDE);
  const x = (index: number) =>
    left +
    SIDE +
    (lastIndex === 0 ? plotWidth / 2 : (index * plotWidth) / lastIndex);
  const y = (amount: number) => TOP + plotHeight * (1 - amount / top);
  const pathOf = (line: Series) =>
    series
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${x(index)},${y(point[line] ?? 0)}`,
      )
      .join("");

  const point = active === null ? undefined : series[active];
  const shown = active ?? lastIndex;

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const position =
      event.clientX - event.currentTarget.getBoundingClientRect().left;
    const index =
      lastIndex === 0 || plotWidth === 0
        ? 0
        : Math.round(((position - left - SIDE) / plotWidth) * lastIndex);
    setActive(Math.min(lastIndex, Math.max(0, index)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: shown - 1,
      ArrowRight: shown + 1,
      Home: 0,
      End: lastIndex,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(Math.min(lastIndex, Math.max(0, next)));
  };

  const readout = (index: number) => {
    const at = series[index];
    return at
      ? [
          monthLabel(at.month),
          ...lines.map((line) => `${names[line]} ${money(at[line] ?? 0)}`),
        ].join(", ")
      : "";
  };

  // To keyboards and screen readers the chart is a slider over the months,
  // reading out each month's values.
  return (
    <div
      ref={ref}
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-describedby={hintId}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, lastIndex)}
      aria-valuenow={Math.max(0, shown)}
      aria-valuetext={readout(shown)}
      onKeyDown={onKeyDown}
      onFocus={() => setActive(lastIndex)}
      onBlur={() => setActive(null)}
      className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      style={{ height }}
    >
      <p id={hintId} className="sr-only">
        {t("collectionTotals.monthKeys")}
      </p>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          aria-hidden="true"
          className="block touch-pan-y overflow-visible"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((tick, index) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width}
                y1={y(tick)}
                y2={y(tick)}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={left - LABEL_GAP}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                {tickLabels[index]}
              </text>
            </g>
          ))}
          {series.length > 0 && (
            <>
              <text
                x={lastIndex === 0 ? x(0) : left}
                y={height - 6}
                textAnchor={lastIndex === 0 ? "middle" : "start"}
                className="fill-muted-foreground text-xs"
              >
                {monthLabel(series[0]?.month ?? "")}
              </text>
              {lastIndex > 0 && (
                <text
                  x={width}
                  y={height - 6}
                  textAnchor="end"
                  className="fill-muted-foreground text-xs"
                >
                  {monthLabel(series[lastIndex]?.month ?? "")}
                </text>
              )}
            </>
          )}
          {point && (
            <line
              x1={x(shown)}
              x2={x(shown)}
              y1={TOP}
              y2={TOP + plotHeight}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}
          {lines.map((line) => (
            <path
              key={line}
              d={pathOf(line)}
              fill="none"
              stroke={seriesColors[line]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {lines.map((line) => {
            const at = series[shown];
            return (
              at && (
                <circle
                  key={line}
                  cx={x(shown)}
                  cy={y(at[line] ?? 0)}
                  r={4}
                  fill={seriesColors[line]}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
              )
            );
          })}
        </svg>
      )}
      {point && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 flex min-w-36 flex-col gap-1 rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md"
          style={
            x(shown) > width / 2
              ? { right: width - x(shown) + 12 }
              : { left: x(shown) + 12 }
          }
        >
          <span className="text-muted-foreground">
            {monthLabel(point.month)}
          </span>
          {lines.map((line) => (
            <span key={line} className="flex items-center gap-2">
              <span
                className="h-0.5 w-3 shrink-0 rounded-full"
                style={{ background: seriesColors[line] }}
              />
              <span className="font-medium">{money(point[line] ?? 0)}</span>
              <span className="text-muted-foreground">{names[line]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
