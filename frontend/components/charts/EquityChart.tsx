"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatDate, formatMonth, formatPct } from "@/lib/format";
import type { EquityPoint, OhlcvBar } from "@/types/backtest";
import { CHART, LineSwatch, TooltipRow, TooltipShell, axisProps, formatInrAxis, monthTicks } from "./theme";

interface Props {
  data: EquityPoint[];
  initialCapital: number;
  /** Price bars for the same window; used to draw a buy & hold benchmark. */
  bars?: OhlcvBar[] | null;
}

interface Row extends EquityPoint {
  benchmark: number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: Row }>;
  initialCapital: number;
}

function EquityTooltip({ active, payload, initialCapital }: TooltipProps) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const ret = ((p.equity - initialCapital) / initialCapital) * 100;
  return (
    <TooltipShell title={formatDate(p.date)}>
      <TooltipRow label="Strategy" value={formatCurrency(p.equity)} swatch={<LineSwatch color={CHART.equity} />} />
      {p.benchmark != null && (
        <TooltipRow label="Buy & hold" value={formatCurrency(p.benchmark)} swatch={<LineSwatch color={CHART.benchmark} dashed />} />
      )}
      <TooltipRow label="Return" value={formatPct(ret)} valueClass={ret >= 0 ? "text-gain" : "text-loss"} />
      {p.drawdown_pct != null && <TooltipRow label="Drawdown" value={formatPct(-Math.abs(p.drawdown_pct), false)} />}
    </TooltipShell>
  );
}

export function EquityLegend({ showBenchmark }: { showBenchmark: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      <span className="flex items-center gap-1.5"><LineSwatch color={CHART.equity} /> Strategy</span>
      {showBenchmark && <span className="flex items-center gap-1.5"><LineSwatch color={CHART.benchmark} dashed /> Buy &amp; hold</span>}
    </div>
  );
}

/** Buy & hold equity on each bar: all capital in at the first close. */
export function benchmarkByDate(bars: OhlcvBar[] | null | undefined, capital: number): Map<string, number> {
  const out = new Map<string, number>();
  if (!bars?.length) return out;
  const first = bars[0].close;
  for (const b of bars) out.set(b.date.slice(0, 10), (capital * b.close) / first);
  return out;
}

export function EquityChart({ data, initialCapital, bars }: Props) {
  const rows = useMemo<Row[]>(() => {
    const bh = benchmarkByDate(bars, initialCapital);
    return data.map((d) => ({ ...d, benchmark: bh.get(d.date.slice(0, 10)) ?? null }));
  }, [data, bars, initialCapital]);
  const hasBenchmark = rows.some((r) => r.benchmark != null);

  const ticks = useMemo(() => monthTicks(data.map((d) => d.date)), [data]);
  // pad the range ourselves: with "auto" a flat curve (no trades) collapses to identical tick labels
  const domain = useMemo(() => {
    const vals = rows.flatMap((r) => (r.benchmark != null ? [r.equity, r.benchmark] : [r.equity])).concat(initialCapital);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.08, hi * 0.02);
    return [lo - pad, hi + pad] as [number, number];
  }, [rows, initialCapital]);

  return (
    // draw-in: the whole plot is revealed left to right once, instead of Recharts' own animation
    <div className="h-full animate-draw-in">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.equity} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART.equity} stopOpacity={0} />
            </linearGradient>
            <filter id="equityGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="date" ticks={ticks} tickFormatter={formatMonth} interval="preserveStartEnd" minTickGap={24} {...axisProps} />
          <YAxis tickFormatter={formatInrAxis} domain={domain} width={72} {...axisProps} />
          <ReferenceLine
            y={initialCapital}
            stroke={CHART.reference}
            strokeDasharray="2 4"
            label={{ value: "Initial capital", position: "insideTopLeft", fill: CHART.axis, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: "rgb(255 255 255 / 0.25)", strokeWidth: 1 }}
            content={(p) => <EquityTooltip {...(p as unknown as TooltipProps)} initialCapital={initialCapital} />}
          />
          {hasBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke={CHART.benchmark}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="equity"
            stroke={CHART.equity}
            strokeWidth={2}
            fill="url(#equityFill)"
            filter="url(#equityGlow)"
            dot={false}
            activeDot={{ r: 5, fill: CHART.equity, stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
