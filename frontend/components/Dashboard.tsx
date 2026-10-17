
"use client";

import { useEffect, useState } from "react";
import { ChartsCard } from "@/components/ChartsCard";
import { ControlPanel } from "@/components/ControlPanel";
import { EvidenceCard } from "@/components/EvidenceCard";
import { KpiGrid } from "@/components/KpiGrid";
import { TopNav } from "@/components/TopNav";
import { Scramble } from "@/components/motion/Scramble";
import { useBacktest, useMarketData } from "@/hooks/useBacktest";
import { USE_SAMPLE_DATA } from "@/lib/config";
import { api, type NewsArticle } from "@/lib/api";
import type {
  BacktestRequest,
  MaCrossoverParams,
  RsiMeanReversionParams,
  NewsEvidence,
} from "@/types/backtest";

function AmbientGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(113,52,235,0.30),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_40%_35%_at_90%_0%,rgba(22,204,197,0.10),transparent_70%)]" />
      <div className="absolute -top-48 -left-40 h-[520px] w-[520px] animate-float-slow rounded-full bg-violet/20 blur-[120px]" />
      <div className="absolute top-[45%] -right-40 h-[480px] w-[480px] animate-float-slower rounded-full bg-violet-deep/40 blur-[140px]" />
    </div>
  );
}

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

/**
 * Fetch candles from before start_date so SMA overlays are valid on day one.
 */
function warmupStart(req: BacktestRequest): string {
  if (req.strategy !== "ma_crossover") return req.start_date;

  const days =
    Math.floor((req.params as MaCrossoverParams).long_window * 1.5) + 10;

  const date = new Date(`${req.start_date}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

/** Convert the live news API response to the fields EvidenceCard expects. */
function toNewsEvidence(article: NewsArticle): NewsEvidence {
  const probabilities = article.probabilities;
  const positive = probabilities?.positive ?? 0;
  const negative = probabilities?.negative ?? 0;

  return {
    title: article.title,
    url: article.url,
    source: article.source,
    published_at: article.published_at ?? "",
    summary: article.description,
    sentiment_label:
      article.sentiment === "positive" ||
      article.sentiment === "negative" ||
      article.sentiment === "neutral"
        ? article.sentiment
        : "neutral",
    sentiment_score: positive - negative,
  };
}

export function Dashboard({ initialTicker }: { initialTicker?: string }) {
  const backtest = useBacktest();
  const market = useMarketData();

  const [lastRequest, setLastRequest] = useState<BacktestRequest | null>(null);
  const [runId, setRunId] = useState(0);
  const [liveNews, setLiveNews] = useState<NewsEvidence[] | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);

  const handleRun = (payload: BacktestRequest) => {
    setLastRequest(payload);
    setRunId((previous) => previous + 1);
    setLiveNews(null);
    setNewsError(null);

    backtest.run(payload);
    market.run(payload.ticker, warmupStart(payload), payload.end_date);
  };

  const result = backtest.data;

  useEffect(() => {
    if (!lastRequest || USE_SAMPLE_DATA) return;

    const controller = new AbortController();

    async function loadNews() {
      setNewsLoading(true);
      setNewsError(null);

      try {
        const response = await api.news(
          lastRequest!.ticker,
          10,
          true,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setLiveNews(response.articles.map(toNewsEvidence));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setNewsError(
            error instanceof Error
              ? error.message
              : "Could not load news.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setNewsLoading(false);
        }
      }
    }

    void loadNews();

    return () => controller.abort();
  }, [lastRequest, runId]);

  // Sample mode uses sample news; real mode uses the live news endpoint.
  const displayedNews = USE_SAMPLE_DATA
    ? result?.news ?? null
    : liveNews;

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
          <ControlPanel
            onRun={handleRun}
            isLoading={backtest.isLoading}
            initialTicker={initialTicker}
          />
        </div>

        {backtest.error && (
          <div
            role="alert"
            className="flex animate-fade-in items-start gap-3 rounded-[20px] border border-loss/30 bg-loss/10 px-5 py-4 text-sm text-loss backdrop-blur-xl"
          >
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
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
              <h2 className="display mt-2 text-3xl text-white sm:text-4xl">
                <Scramble
                  key={runId}
                  text={runTitle(lastRequest)}
                  duration={520}
                />
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {USE_SAMPLE_DATA && (
                <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 font-medium text-warn">
                  Sample data
                </span>
              )}

              <span className="text-muted tabular-nums">
                {lastRequest.start_date} → {lastRequest.end_date}
              </span>
            </div>
          </div>
        )}

        <KpiGrid
          metrics={result?.metrics ?? null}
          loading={backtest.isLoading}
        />

        <ChartsCard
          result={result}
          request={lastRequest}
          bars={market.data?.data ?? null}
          loading={backtest.isLoading}
          priceLoading={market.isLoading}
          priceError={market.error}
        />

        {newsError && (
          <p role="status" className="text-sm text-warn">
            News could not be loaded: {newsError}
          </p>
        )}

        {newsLoading && (
          <p role="status" className="text-sm text-muted">
            Fetching news and analysing sentiment…
          </p>
        )}

        <EvidenceCard
          news={displayedNews}
          trades={result?.trades ?? null}
          newsSupported={true}
        />

        {result && (
          <p className="eyebrow pt-2 text-center">
            Historical simulation. Not financial advice.
          </p>
        )}
      </main>
    </div>
  );
}
