// Shared contract with the FastAPI backend. Keep field names in sync with the Pydantic models.

export type StrategyId = "ma_crossover" | "rsi_mean_reversion" | "buy_and_hold";

export interface MaCrossoverParams {
  short_window: number;
  long_window: number;
}

export interface RsiMeanReversionParams {
  rsi_period: number;
  oversold: number; // enter long when RSI drops below this
  recovery: number; // exit once RSI recovers to this level (backend default 50)
}

export type BuyAndHoldParams = Record<string, never>;

export interface StrategyParamsMap {
  ma_crossover: MaCrossoverParams;
  rsi_mean_reversion: RsiMeanReversionParams;
  buy_and_hold: BuyAndHoldParams;
}

export interface BacktestRequest<S extends StrategyId = StrategyId> {
  ticker: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  strategy: S;
  initial_capital: number;
  /** Not in the minimal backend contract yet; FastAPI should accept it as optional. */
  params: StrategyParamsMap[S];
}

/** All percentage fields are in percent units (12.5 means 12.5%), not fractions. */
export interface BacktestMetrics {
  initial_capital: number;
  final_value: number;
  total_return_pct: number;
  max_drawdown_pct: number; // negative number, e.g. -18.4
  sharpe_ratio: number | null;
  win_rate_pct: number | null; // null when there were no closed trades
  num_trades: number;
  /** Return of simply holding the stock over the same window. */
  buy_hold_return_pct?: number | null;
}

export interface EquityPoint {
  date: string; // ISO date
  equity: number;
  drawdown_pct?: number;
}

export interface Trade {
  entry_date: string;
  exit_date: string | null; // null if still open at end of backtest
  side: "long" | "short";
  size: number;
  entry_price: number;
  exit_price: number | null;
  pnl: number;
  return_pct: number;
}

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface NewsEvidence {
  title: string;
  source: string;
  url: string | null;
  published_at: string; // ISO datetime
  sentiment_score: number; // -1 .. 1
  sentiment_label: SentimentLabel;
  summary?: string;
}

export interface BacktestResponse {
  ticker: string;
  strategy: StrategyId;
  metrics: BacktestMetrics;
  equity_curve: EquityPoint[];
  trades: Trade[];
  /** null when the backend doesn't provide news evidence (the News tab is then hidden). */
  news: NewsEvidence[] | null;
}

export interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataResponse {
  ticker: string;
  data: OhlcvBar[];
}

export interface HealthResponse {
  status: string;
}
