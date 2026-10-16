"use client";

import { useEffect, useMemo, useState } from "react";
import { PARAMS_LOCKED } from "@/lib/config";
import { STRATEGIES, STRATEGY_LIST, type StrategyDef } from "@/lib/strategies";
import type { BacktestRequest, StrategyId, StrategyParamsMap } from "@/types/backtest";
import { Slider, Spinner } from "./ui";

interface Props {
  onRun: (payload: BacktestRequest) => void;
  isLoading: boolean;
  initialTicker?: string;
}

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-ink/70 px-3.5 text-sm text-fg outline-none transition-all duration-300 ease-in-out placeholder:text-slate-600 hover:border-violet/50 hover:shadow-[0_0_20px_rgba(113,52,235,0.15)] focus:border-violet focus:shadow-[0_0_24px_rgba(113,52,235,0.2)] focus:ring-1 focus:ring-violet/50 disabled:opacity-50 disabled:hover:border-line disabled:hover:shadow-none";
const labelCls = "mb-1.5 block text-xs font-medium text-muted";

/** Mounted only while a run is in flight, so it starts from zero on every run. */
function ElapsedTimer() {
  const [start] = useState(() => performance.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs tabular-nums text-white/70">{((now - start) / 1000).toFixed(1)}s</span>;
}

export function ControlPanel({ onRun, isLoading, initialTicker }: Props) {
  const [ticker, setTicker] = useState(initialTicker ?? "RELIANCE.NS");
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [capital, setCapital] = useState(100_000);
  const [strategy, setStrategy] = useState<StrategyId>("ma_crossover");
  const [params, setParams] = useState<StrategyParamsMap[StrategyId]>(STRATEGIES.ma_crossover.defaults);

  const def = STRATEGIES[strategy] as StrategyDef;

  const validationError = useMemo(() => {
    if (!ticker.trim()) return "Ticker is required";
    if (!startDate || !endDate) return "Select a date range";
    if (startDate >= endDate) return "Start date must be before end date";
    if (!Number.isFinite(capital) || capital <= 0) return "Initial capital must be positive";
    return def.validate(params);
  }, [ticker, startDate, endDate, capital, def, params]);

  const handleStrategyChange = (id: StrategyId) => {
    setStrategy(id);
    setParams(STRATEGIES[id].defaults);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError || isLoading) return;
    onRun({
      ticker: ticker.trim().toUpperCase(),
      start_date: startDate,
      end_date: endDate,
      strategy,
      initial_capital: capital,
      params,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-[24px] border border-line bg-panel/85 p-5 shadow-[0_20px_60px_-20px_rgb(113_52_235/0.45)] backdrop-blur-xl transition-all duration-300 ease-in-out hover:border-white/15 hover:shadow-[0_24px_80px_-20px_rgb(113_52_235/0.6)] sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label htmlFor="ticker" className={labelCls}>Ticker</label>
          <div className="relative">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              id="ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="RELIANCE.NS"
              className={`${inputCls} pl-10 font-mono uppercase`}
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="start" className={labelCls}>Start date</label>
          <input id="start" type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} disabled={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="end" className={labelCls}>End date</label>
          <input id="end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} disabled={isLoading} />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="capital" className={labelCls}>Initial capital (₹)</label>
          <input
            id="capital"
            type="number"
            min={1000}
            step={1000}
            value={Number.isNaN(capital) ? "" : capital}
            onChange={(e) => setCapital(e.target.valueAsNumber)}
            className={`${inputCls} font-mono tabular-nums`}
            disabled={isLoading}
          />
        </div>

        <div className="lg:col-span-3">
          <label htmlFor="strategy" className={labelCls}>Strategy</label>
          <select
            id="strategy"
            value={strategy}
            onChange={(e) => handleStrategyChange(e.target.value as StrategyId)}
            className={inputCls}
            disabled={isLoading}
          >
            {STRATEGY_LIST.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 border-t border-line pt-5 lg:flex-row lg:items-end">
        <div className={`grid flex-1 grid-cols-1 gap-5 ${def.params.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {def.params.length === 0 && (
            <div className="rounded-xl border border-line bg-ink/40 px-4 py-4 text-sm text-muted sm:col-span-2">
              No parameters. This baseline buys on the first trading day and holds to the end date.
            </div>
          )}
          {def.params.map((p) => {
            const value = (params as unknown as Record<string, number>)[p.key];
            return (
              <div
                key={p.key}
                className="rounded-xl border border-line bg-ink/40 px-4 pt-3 pb-4 transition-all duration-300 ease-in-out hover:border-violet/50 hover:bg-ink/60 hover:shadow-[0_0_20px_rgba(113,52,235,0.15)]"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <label htmlFor={p.key} className="text-xs font-medium text-muted">{p.label}</label>
                  <span
                    className="rounded-md border border-violet/30 bg-violet/10 px-2 py-0.5 font-mono text-xs tabular-nums text-white transition-all duration-300"
                  >
                    {value}{p.unit ?? ""}
                  </span>
                </div>
                <Slider
                  id={p.key}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={value}
                  onChange={(v) => setParams({ ...params, [p.key]: v } as typeof params)}
                  disabled={isLoading || PARAMS_LOCKED}
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 lg:w-64">
          <button
            type="submit"
            disabled={!!validationError || isLoading}
            aria-busy={isLoading}
            className={`group relative flex h-11 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-gradient-to-r from-violet via-[#9b6bff] to-violet bg-[length:200%_100%] bg-left px-5 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgb(113_52_235/0.9)] transition-all duration-300 ease-in-out enabled:hover:bg-right enabled:hover:animate-glow-pulse enabled:active:scale-95 disabled:cursor-not-allowed ${
              isLoading ? "animate-glow-pulse" : "disabled:opacity-40 disabled:shadow-none"
            }`}
          >
            {/* light sweep on hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 opacity-0 blur-md transition-all duration-700 ease-out group-enabled:group-hover:left-[120%] group-enabled:group-hover:opacity-100"
            />
            {isLoading ? (
              <>
                <Spinner />
                <span className="text-shimmer">Simulating Strategy…</span>
                <ElapsedTimer />
                {/* indeterminate progress sweep along the bottom edge */}
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/10">
                  <span className="block h-full w-1/4 animate-indeterminate bg-gradient-to-r from-transparent via-white to-transparent" />
                </span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run Backtest
              </>
            )}
          </button>
        </div>
      </div>

      <p className={`mt-3 min-h-4 text-xs ${validationError ? "text-warn" : "text-muted"}`}>
        {validationError ?? def.description}
        {!validationError && PARAMS_LOCKED && def.params.length > 0 && (
          <span className="ml-2 inline-flex items-center rounded-full border border-line bg-white/5 px-2 py-0.5 text-[11px] text-muted">
            Parameters fixed by the backend for now (defaults shown)
          </span>
        )}
        {!validationError && !def.backendReady && (
          <span className="ml-2 inline-flex items-center rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[11px] text-warn">
            Backend support pending
          </span>
        )}
      </p>
    </form>
  );
}
