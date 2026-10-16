"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { benchmarkByDate } from "../charts/EquityChart";
import { CountUp } from "../motion/CountUp";
import { LetterReveal } from "../motion/LetterReveal";
import { Reveal } from "../motion/Reveal";
import { Scramble } from "../motion/Scramble";
import { formatNumber, formatPct } from "@/lib/format";
import { runSampleBacktest, sampleBars } from "@/lib/sampleData";
import { STRATEGIES, STRATEGY_LIST } from "@/lib/strategies";
import type { StrategyId } from "@/types/backtest";
import { RingNode, SectionIntro } from "./shared";

const TICKER = "RELIANCE.NS";
const START = "2025-01-01";
const END = "2025-12-31";
const CAPITAL = 100_000;
// RSI(14) never reaches 30 on this sample series, so the showcase uses the shorter RSI(7)
const PARAMS: Partial<Record<StrategyId, object>> = { rsi_mean_reversion: { rsi_period: 7, oversold: 30, overbought: 70 } };

const BLURB: Record<StrategyId, string> = {
  ma_crossover: "Goes long when the 20-day average crosses above the 50-day, and steps aside when it crosses back.",
  rsi_mean_reversion: "Buys when RSI(7) drops below 30 and sells once it recovers above 70.",
  buy_and_hold: "The baseline: buy on the first day and hold to the end. Every other strategy has to beat this.",
};

function Sparkline({ strategy, benchmark }: { strategy: number[]; benchmark: number[] }) {
  const all = strategy.concat(benchmark);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pts = (vals: number[]) =>
    vals.map((v, i) => `${((i / (vals.length - 1)) * 400).toFixed(1)},${(190 - ((v - lo) / (hi - lo || 1)) * 170).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="none" fill="none" aria-hidden>
      <polyline points={pts(benchmark)} stroke="rgb(255 255 255 / 0.5)" strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      <polyline points={pts(strategy)} stroke="#16ccc5" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** S4: one sample run per strategy, cycled with prev/next. Stats count up on enter and on every change. */
export function SampleResult() {
  const [idx, setIdx] = useState(0);
  const def = STRATEGY_LIST[idx];

  // deterministic sample data (seeded by ticker), so server and client render the same numbers
  const runs = useMemo(() => {
    const bars = sampleBars(TICKER, START, END);
    const bh = benchmarkByDate(bars, CAPITAL);
    return STRATEGY_LIST.map((s) => {
      const r = runSampleBacktest({ ticker: TICKER, start_date: START, end_date: END, strategy: s.id, initial_capital: CAPITAL, params: (PARAMS[s.id] ?? s.defaults) as typeof s.defaults });
      return { ...r, bh: r.equity_curve.map((e) => bh.get(e.date) ?? CAPITAL) };
    });
  }, []);
  const run = runs[idx];
  const m = run.metrics;
  const title = def.id === "buy_and_hold" ? "Buy & hold baseline" : `${STRATEGIES[def.id].label} vs buy & hold`;

  const step = (d: number) => setIdx((i) => (i + d + STRATEGY_LIST.length) % STRATEGY_LIST.length);

  return (
    <section id="sample" aria-labelledby="sample-title" className="rounded-t-[40px] bg-ink px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <SectionIntro id="sample-title" eyebrow="Sample result" title="What a run looks like" />

        <Reveal y={80} delay={150} className="mt-14">
          <div className="grid gap-8 rounded-[32px] border border-line bg-panel p-5 sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div className="relative min-h-[260px] rounded-[28px] rounded-bl-[64px] bg-gradient-to-br from-violet-2 via-violet-deep to-[#0f2d33] p-6 sm:p-8">
              <RingNode className="top-12 -right-[5px]" />
              <RingNode className="-bottom-[5px] left-16" />
              <div key={def.id} className="h-full min-h-[220px] animate-draw-in">
                <Sparkline strategy={run.equity_curve.map((e) => e.equity)} benchmark={run.bh} />
              </div>
              <div className="absolute top-5 left-6 flex gap-4 text-[11px] text-white/70">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 bg-teal" /> Strategy</span>
                {def.id !== "buy_and_hold" && (
                  <span className="flex items-center gap-1.5"><span className="h-0 w-3.5 border-t border-dashed border-white/60" /> Buy &amp; hold</span>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-sm font-semibold text-violet-deep">R</span>
                <div>
                  <p className="text-sm text-white">{TICKER}</p>
                  <p className="text-xs text-muted">Jan – Dec 2025 · ₹1,00,000</p>
                </div>
                <span className="ml-auto rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 text-[11px] text-warn">Sample data</span>
              </div>

              <h3 className="display mt-7 text-3xl text-white sm:text-[34px]">
                <Scramble key={def.id} text={title} duration={520} />
              </h3>
              <p className="mt-3 min-h-[3.2em] text-sm leading-relaxed text-muted">
                <LetterReveal key={def.id} text={BLURB[def.id]} delay={150} spread={500} />
              </p>

              <dl className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { label: "Return", value: m.total_return_pct, fmt: (n: number) => formatPct(n) },
                  { label: "Max drawdown", value: m.max_drawdown_pct, fmt: (n: number) => formatPct(n, false) },
                  { label: "Sharpe", value: m.sharpe_ratio ?? 0, fmt: (n: number) => (m.sharpe_ratio == null ? "—" : formatNumber(n)) },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="text-xs text-muted">{s.label}</dt>
                    <dd className="display mt-1 text-3xl text-white tabular-nums sm:text-4xl">
                      <CountUp key={`${def.id}-${s.label}`} value={s.value} format={s.fmt} />
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto flex items-center gap-3 pt-8">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous strategy"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition-all duration-300 ease-out hover:bg-white/25 active:scale-95"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next strategy"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-violet-deep transition-all duration-300 ease-out hover:bg-white/85 active:scale-95"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="text-xs text-muted tabular-nums">
                  {idx + 1} / {STRATEGY_LIST.length}
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal y={16} delay={500} className="mt-10 flex justify-center">
          <Link
            href="/dashboard"
            className="rounded-full bg-cta-violet px-6 py-3 text-sm font-medium text-white ring-1 ring-white/10 transition-all duration-300 ease-out hover:bg-violet hover:shadow-[0_0_28px_rgba(113,52,235,0.6)] active:scale-[0.97]"
          >
            Run it on your own stock
          </Link>
        </Reveal>
        <p className="eyebrow mt-6 text-center">Sample figures from synthetic prices, not market data</p>
      </div>
    </section>
  );
}
