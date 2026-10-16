"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatDate, formatMonth, formatPct } from "@/lib/format";
import type { EquityPoint } from "@/types/backtest";
import { CHART, TooltipRow, TooltipShell, axisProps, formatInrAxis, monthTicks } from "./theme";

interface Props {
  data: EquityPoint[];
  initialCapital: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: EquityPoint }>;
  initialCapital: number;
}

function EquityTooltip({ active, payload, initialCapital }: TooltipProps) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const ret = ((p.equity - initialCapital) / initialCapital) * 100;
  return (
    <TooltipShell title={formatDate(p.date)}>
      <TooltipRow label="Equity" value={formatCurrency(p.equity)} />
      <TooltipRow label="Return" value={formatPct(ret)} valueClass={ret >= 0 ? "text-gain" : "text-loss"} />
      {p.drawdown_pct != null && <TooltipRow label="Drawdown" value={formatPct(-Math.abs(p.drawdown_pct), false)} />}
    </TooltipShell>
  );
}

export function EquityChart({ data, initialCapital }: Props) {
  const ticks = useMemo(() => monthTicks(data.map((d) => d.date)), [data]);
  // pad the range ourselves: with "auto" a flat curve (no trades) collapses to identical tick labels
  const domain = useMemo(() => {
    const vals = data.map((d) => d.equity).concat(initialCapital);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.08, hi * 0.02);
    return [lo - pad, hi + pad] as [number, number];
  }, [data, initialCapital]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.equity} stopOpacity={0.35} />
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
        <YAxis
          tickFormatter={formatInrAxis}
          domain={domain}
          width={72}
          {...axisProps}
        />
        <ReferenceLine
          y={initialCapital}
          stroke={CHART.reference}
          strokeDasharray="4 4"
          label={{ value: "Initial capital", position: "insideTopLeft", fill: CHART.axis, fontSize: 11 }}
        />
        <Tooltip
          cursor={{ stroke: "rgb(255 255 255 / 0.25)", strokeWidth: 1 }}
          content={(p) => <EquityTooltip {...(p as unknown as TooltipProps)} initialCapital={initialCapital} />}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={CHART.equity}
          strokeWidth={2}
          fill="url(#equityFill)"
          filter="url(#equityGlow)"
          dot={false}
          activeDot={{ r: 5, fill: CHART.equity, stroke: CHART.surface, strokeWidth: 2 }}
          isAnimationActive={data.length < 1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
