"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMonth, formatPrice } from "@/lib/format";
import type { OhlcvBar, Trade } from "@/types/backtest";
import { CHART, CandleSwatch, LineSwatch, MarkerSwatch, TooltipRow, TooltipShell, axisProps, monthTicks } from "./theme";

interface Props {
  /** may start before `from`: those bars only warm up the SMAs and aren't plotted */
  bars: OhlcvBar[];
  from: string;
  trades: Trade[];
  shortWindow: number | null;
  longWindow: number | null;
}

interface Row extends OhlcvBar {
  range: [number, number];
  smaShort: number | null;
  smaLong: number | null;
  buy: number | null;
  sell: number | null;
}

function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

const dayKey = (iso: string) => iso.slice(0, 10);

interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Row;
}

function Candle({ x = 0, y = 0, width = 0, height = 0, payload }: CandleShapeProps) {
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const up = close >= open;
  const color = up ? CHART.up : CHART.down;
  const span = high - low;
  const pxPerUnit = span > 0 ? height / span : 0;
  const yOf = (v: number) => y + (high - v) * pxPerUnit;
  const bodyTop = yOf(Math.max(open, close));
  const bodyH = Math.max(1, Math.abs(yOf(open) - yOf(close)));
  const bodyW = Math.max(2, Math.min(10, width * 0.7));
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect
        x={cx - bodyW / 2}
        y={bodyTop}
        width={bodyW}
        height={bodyH}
        rx={1}
        fill={up ? CHART.surface : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
}

// Rendered as a Line's dots so rows without a signal draw nothing (Scatter plots nulls at the domain edge).
const Marker = (kind: "buy" | "sell") =>
  function MarkerDot({ cx, cy, value, index }: { cx?: number; cy?: number; value?: number | null; index?: number }) {
    if (value == null || cx == null || cy == null) return <g key={index} />;
    const d = kind === "buy" ? `M${cx} ${cy + 6}l6 10h-12z` : `M${cx} ${cy - 6}l-6 -10h12z`;
    return <path key={index} d={d} fill={kind === "buy" ? CHART.up : CHART.down} stroke={CHART.surface} strokeWidth={2} />;
  };

const BuyDot = Marker("buy");
const SellDot = Marker("sell");

interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: Row }>;
}

function PriceTooltip({ active, payload, shortWindow, longWindow }: TooltipProps & { shortWindow: number | null; longWindow: number | null }) {
  const r = payload?.[0]?.payload;
  if (!active || !r) return null;
  const up = r.close >= r.open;
  return (
    <TooltipShell title={formatDate(r.date)}>
      <TooltipRow label="Open" value={formatPrice(r.open)} />
      <TooltipRow label="High" value={formatPrice(r.high)} />
      <TooltipRow label="Low" value={formatPrice(r.low)} />
      <TooltipRow label="Close" value={formatPrice(r.close)} valueClass={up ? "text-gain" : "text-loss"} swatch={<CandleSwatch up={up} />} />
      <div className="my-0.5 border-t border-white/10" />
      {shortWindow != null && <TooltipRow label={`SMA ${shortWindow}`} value={formatPrice(r.smaShort)} swatch={<LineSwatch color={CHART.smaShort} />} />}
      {longWindow != null && <TooltipRow label={`SMA ${longWindow}`} value={formatPrice(r.smaLong)} swatch={<LineSwatch color={CHART.smaLong} dashed />} />}
      <TooltipRow label="Volume" value={r.volume.toLocaleString("en-IN")} />
      {r.buy != null && <TooltipRow label="Signal" value="BUY" valueClass="text-gain" swatch={<MarkerSwatch kind="buy" />} />}
      {r.sell != null && <TooltipRow label="Signal" value="SELL" valueClass="text-loss" swatch={<MarkerSwatch kind="sell" />} />}
    </TooltipShell>
  );
}

export function PriceLegend({ shortWindow, longWindow }: { shortWindow: number | null; longWindow: number | null }) {
  const item = "flex items-center gap-1.5";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      <span className={item}><CandleSwatch up /> Up</span>
      <span className={item}><CandleSwatch up={false} /> Down</span>
      {shortWindow != null && <span className={item}><LineSwatch color={CHART.smaShort} /> SMA {shortWindow}</span>}
      {longWindow != null && <span className={item}><LineSwatch color={CHART.smaLong} dashed /> SMA {longWindow}</span>}
      <span className={item}><MarkerSwatch kind="buy" /> Buy</span>
      <span className={item}><MarkerSwatch kind="sell" /> Sell</span>
    </div>
  );
}

export function PriceChart({ bars: allBars, from, trades, shortWindow, longWindow }: Props) {
  const { rows, domain, bars } = useMemo(() => {
    // SMAs over the full history, then drop the warm-up bars
    const all = allBars.map((b) => b.close);
    const none = all.map(() => null);
    const sAll = shortWindow != null ? sma(all, shortWindow) : none;
    const lAll = longWindow != null ? sma(all, longWindow) : none;
    const first = Math.max(0, allBars.findIndex((b) => b.date.slice(0, 10) >= from));
    const bars = allBars.slice(first);
    const s = sAll.slice(first);
    const l = lAll.slice(first);
    const entries = new Set(trades.map((t) => dayKey(t.entry_date)));
    const exits = new Set(trades.filter((t) => t.exit_date).map((t) => dayKey(t.exit_date!)));
    let lo = Infinity;
    let hi = -Infinity;
    const rows: Row[] = bars.map((b, i) => {
      lo = Math.min(lo, b.low);
      hi = Math.max(hi, b.high);
      const k = dayKey(b.date);
      return {
        ...b,
        range: [b.low, b.high],
        smaShort: s[i],
        smaLong: l[i],
        buy: entries.has(k) ? b.low : null,
        sell: exits.has(k) ? b.high : null,
      };
    });
    const pad = (hi - lo) * 0.08 || 1;
    return { rows, bars, domain: [Math.floor(lo - pad), Math.ceil(hi + pad)] as [number, number] };
  }, [allBars, from, trades, shortWindow, longWindow]);
  const ticks = useMemo(() => monthTicks(bars.map((b) => b.date)), [bars]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 4 }} barCategoryGap="20%">
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="date" ticks={ticks} tickFormatter={formatMonth} interval="preserveStartEnd" minTickGap={24} {...axisProps} />
        <YAxis domain={domain} tickFormatter={(v: number) => v.toLocaleString("en-IN")} width={64} {...axisProps} />
        <Tooltip
          cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
          content={(p) => <PriceTooltip {...(p as unknown as TooltipProps)} shortWindow={shortWindow} longWindow={longWindow} />}
        />
        <Bar dataKey="range" shape={(p: unknown) => <Candle {...(p as CandleShapeProps)} />} isAnimationActive={false} />
        {shortWindow != null && <Line type="monotone" dataKey="smaShort" stroke={CHART.smaShort} strokeWidth={2} dot={false} activeDot={false} connectNulls isAnimationActive={false} />}
        {longWindow != null && <Line type="monotone" dataKey="smaLong" stroke={CHART.smaLong} strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={false} connectNulls isAnimationActive={false} />}
        <Line dataKey="buy" stroke="none" dot={BuyDot} activeDot={false} isAnimationActive={false} legendType="none" />
        <Line dataKey="sell" stroke="none" dot={SellDot} activeDot={false} isAnimationActive={false} legendType="none" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
