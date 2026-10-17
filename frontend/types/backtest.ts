
export type StrategyId =
  | "ma_crossover"
  | "rsi_mean_reversion"
  | "buy_and_hold";

export interface MaCrossoverParams {
  short_window: number;
  long_window: number;
}

export interface RsiMeanReversionParams {
  rsi_period: number;
  oversold: number;
  recovery: number;
}

export type BuyAndHoldParams = Record<string, never>;

export interface StrategyParamsMap {
  ma_crossover: MaCrossoverParams;
  rsi_mean_reversion: RsiMeanReversionParams;
  buy_and_hold: BuyAndHoldParams;
}

export interface BacktestRequest<S extends StrategyId = StrategyId> {
  ticker: string;
  start_date: string;
  end_date: string;
  strategy: S;
  initial_capital: number;
  params: StrategyParamsMap[S];
}

export interface BacktestMetrics {
  initial_capital: number;
  final_value: number;
  total_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number | null;
  win_rate_pct: number | null;
  num_trades: number;
  buy_hold_return_pct?: number | null;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown_pct?: number;
}

export interface Trade {
  entry_date: string;
  exit_date: string | null;
  side: "long" | "short";
  size: number;
  entry_price: number;
  exit_price: number | null;
  pnl: number;
  return_pct: number;
  /** still open on the end date, so closed at the last close rather than by an exit signal */
  closed_at_end?: boolean;
}

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface NewsEvidence {
  title: string;
  source: string;
  url: string | null;
  published_at: string;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  summary?: string;
}

export interface BacktestResponse {
  ticker: string;
  strategy: StrategyId;
  metrics: BacktestMetrics;
  equity_curve: EquityPoint[];
  trades: Trade[];
  news: NewsEvidence[];
}

export interface ApiTrade {
  entry_date: string;
  exit_date: string | null;
  entry_price: number;
  exit_price: number | null;
  size: number;
  profit_loss: number;
  return_percent: number;
}

export interface ApiBacktestResponse {
  ticker: string;
  strategy: StrategyId;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_equity: number;
  net_profit: number;
  return_percent: number;
  buy_hold_return_percent: number;
  max_drawdown_percent: number;
  win_rate_percent: number;
  number_of_trades: number;
  equity_curve: EquityPoint[];
  trades: ApiTrade[];
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
