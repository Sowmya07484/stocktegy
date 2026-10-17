"use client";

import { useState } from "react";
import { ChartsCard } from "@/components/ChartsCard";
import { ControlPanel } from "@/components/ControlPanel";
import { EvidenceCard } from "@/components/EvidenceCard";
import { KpiGrid } from "@/components/KpiGrid";
import { TopNav } from "@/components/TopNav";
import { Scramble } from "@/components/motion/Scramble";
import { useBacktest, useMarketData } from "@/hooks/useBacktest";
import { USE_SAMPLE_DATA } from "@/lib/config";
import type { BacktestRequest, MaCrossoverParams, RsiMeanReversionParams } from "@/types/backtest";

function AmbientGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(113,52,235,0.30),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_40%_35%_at_90%_0%,rgba(22,204,197,0.10),transparent_70%)]" />
      <div className="absolute -top-48 -left-40 h-[520px] w-[520px] animate-float-slow rounded-full bg-violet/20 blur-[120px]" />
      <div className="absolute top-[45%] -right-40 h-[480px] w-[480px] animate-float-slower rounded-full bg-violet-deep/40 blur-[140px]" />
    </div>
  );
}

/** "RELIANCE.NS · SMA 20/50": the run's identity, used as the results heading. */
function runTitle(req: BacktestRequest) {
  if (req.strategy === "ma_crossover") {
    const p = req.params as MaCrossoverParams;
    return `${req.ticker} · SMA ${p.short_window}/${p.long_window}`;
  }
  if (req.strategy === "rsi_mean_reversion") {
    const p = req.params as RsiMeanReversionParams;
    return `${req.ticker} · RSI ${p.rsi_period} · ${p.oversold}→${p.recovery}`;
  }
  return `${req.ticker} · Buy & hold`;
}

export function Dashboard({ initialTicker }: { initialTicker?: string }) {
  const backtest = useBacktest();
  const market = useMarketData();
  const [lastRequest, setLastRequest] = useState<BacktestRequest | null>(null);
  const [runId, setRunId] = useState(0);

  const handleRun = (payload: BacktestRequest) => {
    setLastRequest(payload);
    setRunId((n) => n + 1);
    backtest.run(payload);
    market.run(payload.ticker, payload.start_date, payload.end_date);
  };

  const result = backtest.data;

  return (
    <div className="relative isolate min-h-screen">
      <AmbientGlow />
      <TopNav />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-10 pb-16 sm:px-6 lg:px-8 lg:pt-14">
        <header>
          <p className="eyebrow">Backtester</p>
          <h1 className="display mt-3 text-4xl text-white sm:text-5xl">
            <Scramble text="Run a backtest" delay={100} duration={520} />
          </h1>
        </header>

        <div className="animate-fade-in [animation-delay:120ms]">
          <ControlPanel onRun={handleRun} isLoading={backtest.isLoading} initialTicker={initialTicker} />
        </div>

        {backtest.error && (
          <div role="alert" className="flex animate-fade-in items-start gap-3 rounded-[20px] border border-loss/30 bg-loss/10 px-5 py-4 text-sm text-loss backdrop-blur-xl">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-semibold">Backtest failed</p>
              <p className="mt-0.5 text-loss/80">{backtest.error}</p>
            </div>
          </div>
        )}

        {result && lastRequest && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Results</p>
              {/* keyed per run: scrambles once when a run finishes, not on every parameter tweak */}
              <h2 className="display mt-2 text-3xl text-white sm:text-4xl">
                <Scramble key={runId} text={runTitle(lastRequest)} duration={520} />
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {USE_SAMPLE_DATA && (
                <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 font-medium text-warn">Sample data</span>
              )}
              <span className="text-muted tabular-nums">
                {lastRequest.start_date} → {lastRequest.end_date}
              </span>
            </div>
          </div>
        )}

        <KpiGrid metrics={result?.metrics ?? null} loading={backtest.isLoading} />

        <ChartsCard
          result={result}
          request={lastRequest}
          bars={market.data?.data ?? null}
          loading={backtest.isLoading}
          priceLoading={market.isLoading}
          priceError={market.error}
        />

        <EvidenceCard news={result?.news ?? null} trades={result?.trades ?? null} newsSupported={result ? result.news !== null : true} />

        {result && <p className="eyebrow pt-2 text-center">Historical simulation. Not financial advice.</p>}
      </main>
    </div>
  );
}
