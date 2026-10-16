"use client";

import { useState } from "react";
import { ChartsCard } from "@/components/ChartsCard";
import { ControlPanel } from "@/components/ControlPanel";
import { EvidenceCard } from "@/components/EvidenceCard";
import { KpiGrid } from "@/components/KpiGrid";
import { TopNav } from "@/components/TopNav";
import { useBacktest, useMarketData } from "@/hooks/useBacktest";
import { USE_SAMPLE_DATA } from "@/lib/config";
import { STRATEGIES } from "@/lib/strategies";
import type { BacktestRequest } from "@/types/backtest";

function AmbientGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      {/* top-of-page light wash so the hero never sits on flat black */}
      <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(99,102,241,0.28),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(ellipse_45%_40%_at_85%_5%,rgba(139,92,246,0.22),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(ellipse_40%_35%_at_10%_15%,rgba(79,70,229,0.18),transparent_70%)]" />
      <div className="absolute -top-48 -left-40 h-[560px] w-[560px] animate-float-slow rounded-full bg-indigo-600/25 blur-[120px]" />
      <div className="absolute top-24 -right-40 h-[520px] w-[520px] animate-float-slower rounded-full bg-purple-600/25 blur-[120px]" />
      <div className="absolute top-[40%] left-1/3 h-[420px] w-[420px] animate-float-slow rounded-full bg-teal-400/[0.07] blur-[120px] [animation-delay:-6s]" />
      <div className="absolute -bottom-40 right-1/4 h-[480px] w-[480px] animate-float-slower rounded-full bg-indigo-500/15 blur-[140px] [animation-delay:-12s]" />
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-purple-600/25 to-teal-400/10 blur-3xl" />
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1440 620" preserveAspectRatio="none" fill="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M-50 ${520 - i * 18} C 360 ${380 - i * 40}, 760 ${640 - i * 30}, 1490 ${220 + i * 36}`}
            stroke="url(#heroLine)"
            strokeWidth="1"
          />
        ))}
        <defs>
          <linearGradient id="heroLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      {/* faint grid, masked to fade out */}
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
    </div>
  );
}

export default function DashboardPage() {
  const backtest = useBacktest();
  const market = useMarketData();
  const [lastRequest, setLastRequest] = useState<BacktestRequest | null>(null);

  const handleRun = (payload: BacktestRequest) => {
    setLastRequest(payload);
    backtest.run(payload);
    market.run(payload.ticker, payload.start_date, payload.end_date);
  };

  const result = backtest.data;

  return (
    <div className="relative isolate min-h-screen">
      <AmbientGlow />
      <TopNav />
      <HeroBackdrop />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16">
        <section className="max-w-3xl animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-from to-brand-to" />
            AI-powered strategy backtesting
          </span>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Backtest smarter with <span className="text-highlight">news-aware evidence</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            Simulate trading strategies on historical NSE data and see the Laya sentiment signals behind every move.
          </p>
        </section>

        <div className="animate-fade-in [animation-delay:120ms]">
          <ControlPanel onRun={handleRun} isLoading={backtest.isLoading} />
        </div>

        {USE_SAMPLE_DATA && (
          <div role="note" className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/[0.07] px-5 py-3.5 text-sm text-amber-100/90 backdrop-blur-xl">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-warn" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>
              <span className="font-semibold text-warn">Sample data mode.</span> Results below are generated in the browser from
              synthetic prices for layout only. They are not real backtest results, and the FastAPI backend is not called.
            </p>
          </div>
        )}

        {backtest.error && (
          <div role="alert" className="flex animate-fade-in items-start gap-3 rounded-2xl border border-loss/30 bg-loss/10 px-5 py-4 text-sm text-loss backdrop-blur-xl">
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

        {result && (
          <div key={lastRequest?.ticker} className="flex animate-fade-in flex-wrap items-center gap-2 text-sm">
            <span className="font-mono font-semibold text-fg">{result.ticker}</span>
            <span className="rounded-full border border-line bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">{STRATEGIES[result.strategy]?.label ?? result.strategy}</span>
            {USE_SAMPLE_DATA && (
              <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn">Sample data</span>
            )}
            {lastRequest && (
              <span className="font-mono text-xs text-muted">
                {lastRequest.start_date} → {lastRequest.end_date}
              </span>
            )}
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

        <EvidenceCard news={result?.news ?? null} trades={result?.trades ?? null} />
      </main>
    </div>
  );
}
