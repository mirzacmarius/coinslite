"use client";

import { useI18n } from "@/locales/client";
import { useFormatters } from "@/locales/use-formatters";
import {
  type CollectionTotals,
  type MonthAmounts,
  valueByDateAdded,
} from "@coinslite/backend/convex/items/totals";
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
  seriesColors,
  useElementWidth,
  useMonthFormat,
} from "./chart-card";

const lines = ["purchasePrice", "marketValue"] as const;

/** Plot height and the room around it, in pixels. */
const PLOT_HEIGHT = 160;
const TOP = 8;
const AXIS_HEIGHT = 22;
const SIDE = 6;
const LABEL_GAP = 8;
const HEIGHT = TOP + PLOT_HEIGHT + AXIS_HEIGHT;

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

/**
 * Value by date added (spec 7): the cumulative Purchase price and Market value
 * of the Collection by the month Items were added. Hover, or focus and use the
 * arrow keys, to read a month.
 */
export function ValueByDateAddedChart({
  totals,
}: {
  totals: CollectionTotals;
}) {
  const t = useI18n();
  const format = useFormatters();
  const monthLabel = useMonthFormat();
  const series = useMemo(() => valueByDateAdded(totals), [totals]);
  const names = {
    purchasePrice: t("items.purchasePrice"),
    marketValue: t("items.marketValue"),
  };
  const money = (amount: number) => format.money(amount, totals.currency);
  const last = series.at(-1);

  return (
    <ChartCard
      title={t("collectionTotals.valueByDateAdded")}
      description={t("collectionTotals.valueByDateAddedDescription")}
      chart={
        <>
          <Legend
            shape="line"
            entries={lines.map((line) => ({
              series: line,
              label: names[line],
              value: last && money(last[line]),
            }))}
          />
          <LineChart
            series={series}
            names={names}
            money={money}
            compactMoney={(amount) =>
              format.money(Math.round(amount), totals.currency, {
                compact: true,
              })
            }
            monthLabel={monthLabel}
          />
        </>
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
            {series.map((point) => (
              <TableRow key={point.month}>
                <TableCell className="pl-4">
                  {monthLabel(point.month)}
                </TableCell>
                {lines.map((line) => (
                  <TableCell key={line} className="text-right last:pr-4">
                    {money(point[line])}
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
  series,
  names,
  money,
  compactMoney,
  monthLabel,
}: {
  series: MonthAmounts[];
  names: Record<(typeof lines)[number], string>;
  money: (amount: number) => string;
  compactMoney: (amount: number) => string;
  monthLabel: (month: string) => string;
}) {
  const t = useI18n();
  const hintId = useId();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const labelWidth = useLabelWidth();

  const ticks = axisTicks(
    Math.max(0, ...series.flatMap((point) => lines.map((line) => point[line]))),
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
  const y = (amount: number) => TOP + PLOT_HEIGHT * (1 - amount / top);
  const pathOf = (line: (typeof lines)[number]) =>
    series
      .map(
        (point, index) => `${index ? "L" : "M"}${x(index)},${y(point[line])}`,
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
          ...lines.map((line) => `${names[line]} ${money(at[line])}`),
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
      aria-label={t("collectionTotals.valueByDateAdded")}
      aria-describedby={hintId}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, lastIndex)}
      aria-valuenow={Math.max(0, shown)}
      aria-valuetext={readout(shown)}
      onKeyDown={onKeyDown}
      onFocus={() => setActive(lastIndex)}
      onBlur={() => setActive(null)}
      className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      style={{ height: HEIGHT }}
    >
      <p id={hintId} className="sr-only">
        {t("collectionTotals.monthKeys")}
      </p>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
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
                className="fill-muted-foreground text-[11px]"
              >
                {tickLabels[index]}
              </text>
            </g>
          ))}
          {series.length > 0 && (
            <>
              <text
                x={lastIndex === 0 ? x(0) : left}
                y={HEIGHT - 6}
                textAnchor={lastIndex === 0 ? "middle" : "start"}
                className="fill-muted-foreground text-[11px]"
              >
                {monthLabel(series[0]?.month ?? "")}
              </text>
              {lastIndex > 0 && (
                <text
                  x={width}
                  y={HEIGHT - 6}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
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
              y2={TOP + PLOT_HEIGHT}
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
                  cy={y(at[line])}
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
              <span className="font-medium">{money(point[line])}</span>
              <span className="text-muted-foreground">{names[line]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
