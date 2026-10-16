// UI-only SAMPLE data so the dashboard can be built before the backend exists.
// Prices are a seeded random walk, NOT market data, and the results are NOT real backtests.

import type {
  BacktestRequest,
  BacktestResponse,
  EquityPoint,
  MarketDataResponse,
  NewsEvidence,
  OhlcvBar,
  Trade,
} from "@/types/backtest";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function businessDays(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function sampleBars(ticker: string, start: string, end: string): OhlcvBar[] {
  const rand = mulberry32(hashString(ticker.toUpperCase()));
  let price = 500 + rand() * 2500;
  return businessDays(start, end).map((date) => {
    const open = price;
    const close = open * (1 + 0.0005 + 0.015 * gaussian(rand));
    const high = Math.max(open, close) * (1 + Math.abs(0.006 * gaussian(rand)));
    const low = Math.min(open, close) * (1 - Math.abs(0.006 * gaussian(rand)));
    price = close;
    const r2 = (v: number) => Math.round(v * 100) / 100;
    return { date, open: r2(open), high: r2(high), low: r2(low), close: r2(close), volume: Math.round(3e6 + rand() * 9e6) };
  });
}

function sma(values: number[], w: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= w) sum -= values[i - w];
    return i >= w - 1 ? sum / w : null;
  });
}

function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    const g = Math.max(ch, 0);
    const l = Math.max(-ch, 0);
    if (i <= period) {
      gain += g / period;
      loss += l / period;
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
    }
    if (i >= period) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** Target position (in/out) for each bar, decided on that bar's close. */
function positions(req: BacktestRequest, closes: number[]): boolean[] {
  if (req.strategy === "buy_and_hold") return closes.map(() => true);
  if (req.strategy === "ma_crossover") {
    const p = req.params as BacktestRequest<"ma_crossover">["params"];
    const s = sma(closes, p.short_window);
    const l = sma(closes, p.long_window);
    return closes.map((_, i) => s[i] != null && l[i] != null && s[i]! > l[i]!);
  }
  const p = req.params as BacktestRequest<"rsi_mean_reversion">["params"];
  const r = rsi(closes, p.rsi_period);
  let inPos = false;
  return closes.map((_, i) => {
    const v = r[i];
    if (v != null && !inPos && v < p.oversold) inPos = true;
    else if (v != null && inPos && v > p.overbought) inPos = false;
    return inPos;
  });
}

const SAMPLE_HEADLINES: Omit<NewsEvidence, "published_at">[] = [
  { title: "Sample headline: quarterly results beat estimates", source: "Sample feed", url: null, sentiment_score: 0.62, sentiment_label: "positive" },
  { title: "Sample headline: input costs pressure margins", source: "Sample feed", url: null, sentiment_score: -0.48, sentiment_label: "negative" },
  { title: "Sample headline: company holds annual meeting", source: "Sample feed", url: null, sentiment_score: 0.04, sentiment_label: "neutral" },
  { title: "Sample headline: brokerage raises target price", source: "Sample feed", url: null, sentiment_score: 0.55, sentiment_label: "positive" },
  { title: "Sample headline: regulator opens sector review", source: "Sample feed", url: null, sentiment_score: -0.37, sentiment_label: "negative" },
  { title: "Sample headline: results in line with expectations", source: "Sample feed", url: null, sentiment_score: -0.06, sentiment_label: "neutral" },
];

export function runSampleBacktest(req: BacktestRequest): BacktestResponse {
  const bars = sampleBars(req.ticker, req.start_date, req.end_date);
  const closes = bars.map((b) => b.close);
  const want = positions(req, closes);

  let cash = req.initial_capital;
  let open: { date: string; price: number; size: number } | null = null;
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  let peak = req.initial_capital;

  const close = (i: number) => {
    if (!open) return;
    const exit = closes[i];
    cash += open.size * exit;
    trades.push({
      entry_date: open.date,
      exit_date: bars[i].date,
      side: "long",
      size: open.size,
      entry_price: open.price,
      exit_price: exit,
      pnl: Math.round((exit - open.price) * open.size * 100) / 100,
      return_pct: Math.round((exit / open.price - 1) * 10000) / 100,
    });
    open = null;
  };

  bars.forEach((b, i) => {
    if (want[i] && !open) {
      const size = Math.floor(cash / b.close);
      if (size > 0) {
        cash -= size * b.close;
        open = { date: b.date, price: b.close, size };
      }
    } else if (!want[i] && open) {
      close(i);
    }
    if (i === bars.length - 1) close(i); // liquidate on the last bar
    const value = cash + (open ? open.size * b.close : 0);
    peak = Math.max(peak, value);
    equity.push({ date: b.date, equity: Math.round(value * 100) / 100, drawdown_pct: Math.round((value / peak - 1) * 10000) / 100 });
  });

  const final = equity.at(-1)?.equity ?? req.initial_capital;
  const rets = equity.slice(1).map((e, i) => e.equity / equity[i].equity - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
  const wins = trades.filter((t) => t.pnl > 0).length;

  const news: NewsEvidence[] = bars.length
    ? SAMPLE_HEADLINES.map((h, k) => ({
        ...h,
        published_at: `${bars[Math.floor(((k + 0.5) / SAMPLE_HEADLINES.length) * bars.length)].date}T09:30:00`,
      }))
    : [];

  return {
    ticker: req.ticker,
    strategy: req.strategy,
    metrics: {
      initial_capital: req.initial_capital,
      final_value: final,
      total_return_pct: Math.round((final / req.initial_capital - 1) * 10000) / 100,
      max_drawdown_pct: Math.min(0, ...equity.map((e) => e.drawdown_pct ?? 0)),
      sharpe_ratio: sd > 0 ? Math.round((mean / sd) * Math.sqrt(252) * 100) / 100 : null,
      win_rate_pct: trades.length ? Math.round((wins / trades.length) * 1000) / 10 : null,
      num_trades: trades.length,
    },
    equity_curve: equity,
    trades,
    news,
  };
}

/** Mimics network latency so loading states are visible; honours abort like fetch does. */
function delay<T>(ms: number, value: () => T, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(value()), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export const sampleApi = {
  runBacktest: (req: BacktestRequest, signal?: AbortSignal) => delay(900, () => runSampleBacktest(req), signal),
  marketData: (ticker: string, start: string, end: string, signal?: AbortSignal) =>
    delay<MarketDataResponse>(400, () => ({ ticker, data: sampleBars(ticker, start, end) }), signal),
};
