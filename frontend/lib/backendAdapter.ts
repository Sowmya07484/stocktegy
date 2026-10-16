// Translates the FastAPI backend's response shapes (app.py) into the types the UI renders.
// Keeping this in one place means a backend field rename only touches this file.

import type { BacktestResponse, EquityPoint, MarketDataResponse, NewsEvidence, OhlcvBar, Trade } from "@/types/backtest";

type Num = number | null;

/** POST /api/backtest response as returned by app.py */
export interface BackendBacktestResponse {
  ticker: string;
  strategy: BacktestResponse["strategy"];
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_equity: Num;
  net_profit: Num;
  return_percent: Num;
  buy_hold_return_percent: Num;
  max_drawdown_percent: Num; // backtesting.py reports this as a negative number
  win_rate_percent: Num; // null when there were no trades
  number_of_trades: number;
  sharpe_ratio?: Num; // not sent yet
  news?: NewsEvidence[]; // not sent yet
  equity_curve: { date: string; equity: Num }[];
  trades: {
    entry_date: string;
    exit_date: string | null;
    entry_price: Num;
    exit_price: Num;
    size: number;
    profit_loss: Num;
    return_percent: Num;
  }[];
}

/** POST /api/market-data response as returned by app.py */
export interface BackendMarketDataResponse {
  ticker: string;
  count: number;
  data: { date: string; open: Num; high: Num; low: Num; close: Num; volume: Num }[];
}

export function fromBackendBacktest(raw: BackendBacktestResponse | BacktestResponse): BacktestResponse {
  // already in UI shape (e.g. if the backend adopts it later)
  if ("metrics" in raw) return raw;

  let peak = -Infinity;
  const equity_curve: EquityPoint[] = raw.equity_curve
    .filter((p): p is { date: string; equity: number } => p.equity != null)
    .map((p) => {
      peak = Math.max(peak, p.equity);
      return { date: p.date, equity: p.equity, drawdown_pct: peak > 0 ? (p.equity / peak - 1) * 100 : 0 };
    });

  const trades: Trade[] = raw.trades.map((t) => ({
    entry_date: t.entry_date,
    exit_date: t.exit_date,
    side: t.size < 0 ? "short" : "long", // backtesting.py marks shorts with a negative size
    size: Math.abs(t.size),
    entry_price: t.entry_price ?? 0,
    exit_price: t.exit_price,
    pnl: t.profit_loss ?? 0,
    return_pct: t.return_percent ?? 0,
  }));

  return {
    ticker: raw.ticker,
    strategy: raw.strategy,
    metrics: {
      initial_capital: raw.initial_capital,
      final_value: raw.final_equity ?? equity_curve.at(-1)?.equity ?? raw.initial_capital,
      total_return_pct: raw.return_percent ?? 0,
      max_drawdown_pct: -Math.abs(raw.max_drawdown_percent ?? 0),
      sharpe_ratio: raw.sharpe_ratio ?? null,
      win_rate_pct: raw.win_rate_percent ?? null,
      num_trades: raw.number_of_trades,
      buy_hold_return_pct: raw.buy_hold_return_percent ?? null,
    },
    equity_curve,
    trades,
    news: Array.isArray(raw.news) ? raw.news : null,
  };
}

export function fromBackendMarketData(raw: BackendMarketDataResponse): MarketDataResponse {
  const data: OhlcvBar[] = raw.data
    .filter((b) => b.open != null && b.high != null && b.low != null && b.close != null)
    .map((b) => ({ date: b.date, open: b.open!, high: b.high!, low: b.low!, close: b.close!, volume: b.volume ?? 0 }));
  return { ticker: raw.ticker, data };
}
