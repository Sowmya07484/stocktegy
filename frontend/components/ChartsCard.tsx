"use client";

import { useState } from "react";
import type { BacktestRequest, BacktestResponse, MaCrossoverParams, OhlcvBar } from "@/types/backtest";
import { EquityChart, EquityLegend } from "./charts/EquityChart";
import { PriceChart, PriceLegend } from "./charts/PriceChart";
import { Card, CardHeader, EmptyState, Segmented, Spinner } from "./ui";

type View = "equity" | "price";

interface Props {
  result: BacktestResponse | null;
  request: BacktestRequest | null;
  bars: OhlcvBar[] | null;
  loading: boolean;
  priceLoading: boolean;
  priceError: string | null;
}

export function ChartsCard({ result, request, bars, loading, priceLoading, priceError }: Props) {
  const [view, setView] = useState<View>("equity");
  // SMA overlays only make sense for the MA crossover strategy
  const ma = request?.strategy === "ma_crossover" ? (request.params as MaCrossoverParams) : null;
  const shortWindow = ma?.short_window ?? null;
  const longWindow = ma?.long_window ?? null;

  const body = () => {
    if (loading) {
      return (
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="skeleton h-full w-full rounded-xl" />
          <div className="flex items-center justify-center gap-3 text-sm">
            <Spinner className="h-4 w-4" /> <span className="text-shimmer font-medium">Simulating Strategy…</span>
          </div>
        </div>
      );
    }
    if (view === "equity") {
      if (!result) return <EmptyState>Run a backtest to plot the equity curve.</EmptyState>;
      if (!result.equity_curve.length) return <EmptyState>The backtest returned no equity points.</EmptyState>;
      return (
        <EquityChart
          data={result.equity_curve}
          initialCapital={result.metrics.initial_capital}
          // the benchmark would duplicate the strategy line for buy & hold itself
          bars={result.strategy === "buy_and_hold" ? null : bars}
        />
      );
    }
    if (priceLoading) {
      return (
        <div className="flex h-full items-center justify-center gap-3 text-sm text-muted">
          <Spinner className="h-5 w-5" /> <span className="text-shimmer font-medium">Loading market data…</span>
        </div>
      );
    }
    if (priceError) return <EmptyState><span className="text-loss">Market data failed: {priceError}</span></EmptyState>;
    if (!bars?.length) return <EmptyState>Run a backtest to load OHLCV candles.</EmptyState>;
    return <PriceChart bars={bars} trades={result?.trades ?? []} shortWindow={shortWindow} longWindow={longWindow} />;
  };

  return (
    <Card>
      <CardHeader
        title={view === "equity" ? "Equity curve" : `${request?.ticker ?? "Price"} · candles & signals`}
        subtitle={view === "equity" ? "Portfolio equity (₹) by date, against buying and holding the same stock" : ma ? "Daily OHLC with strategy moving averages and trade entries/exits" : "Daily OHLC with trade entries/exits"}
        right={
          <Segmented<View>
            ariaLabel="Chart view"
            value={view}
            onChange={setView}
            options={[
              { value: "equity", label: "Equity" },
              { value: "price", label: "Price & signals" },
            ]}
          />
        }
      />
      {view === "equity" && result?.equity_curve.length && !loading ? (
        <div className="px-5 pt-4 sm:px-6">
          <EquityLegend showBenchmark={!!bars?.length && result.strategy !== "buy_and_hold"} />
        </div>
      ) : null}
      {view === "price" && bars?.length && !priceLoading ? (
        <div className="px-5 pt-4 sm:px-6">
          <PriceLegend shortWindow={shortWindow} longWindow={longWindow} />
        </div>
      ) : null}
      {/* body() returns a new element per state/tab, so each mount replays the fade-in */}
      <div className="h-[340px] px-2 pt-4 pb-3 sm:h-[420px] sm:px-4">
        <div key={`${view}-${loading}-${priceLoading}`} className="h-full animate-fade-in">{body()}</div>
      </div>
    </Card>
  );
}
