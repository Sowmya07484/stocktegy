
import type {
  BacktestRequest,
  BacktestResponse,
  EquityPoint,
  MarketDataResponse,
  NewsEvidence,
  NewsResponse,
  OhlcvBar,
  Trade,
} from "@/types/backtest";
import { hashString, mulberry32 } from "./random";

/**
 * SAMPLE-ONLY data for UI previews.
 * Prices and headlines here are synthetic, NOT real market data.
 */

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function businessDays(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);

  while (current <= last) {
    const day = current.getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().slice(0, 10));
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export function sampleBars(
  ticker: string,
  start: string,
  end: string,
): OhlcvBar[] {
  const rand = mulberry32(hashString(ticker.toUpperCase()));
  let price = 500 + rand() * 2500;

  return businessDays(start, end).map((date) => {
    const open = price;
    const close = open * (1 + 0.0005 + 0.015 * gaussian(rand));
    const high =
      Math.max(open, close) * (1 + Math.abs(0.006 * gaussian(rand)));
    const low =
      Math.min(open, close) * (1 - Math.abs(0.006 * gaussian(rand)));

    price = close;

    const round2 = (value: number) => Math.round(value * 100) / 100;

    return {
      date,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume: Math.round(3_000_000 + rand() * 9_000_000),
    };
  });
}

function sma(values: number[], window: number): (number | null)[] {
  let sum = 0;

  return values.map((value, index) => {
    sum += value;

    if (index >= window) {
      sum -= values[index - window];
    }

    return index >= window - 1 ? sum / window : null;
  });
}

function rsi(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  let averageGain = 0;
  let averageLoss = 0;

  for (let index = 1; index < values.length; index++) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (index <= period) {
      averageGain += gain / period;
      averageLoss += loss / period;
    } else {
      averageGain =
        (averageGain * (period - 1) + gain) / period;
      averageLoss =
        (averageLoss * (period - 1) + loss) / period;
    }

    if (index >= period) {
      result[index] =
        averageLoss === 0
          ? 100
          : 100 - 100 / (1 + averageGain / averageLoss);
    }
  }

  return result;
}

function positions(req: BacktestRequest, closes: number[]): boolean[] {
  if (req.strategy === "buy_and_hold") {
    return closes.map(() => true);
  }

  if (req.strategy === "ma_crossover") {
    const params =
      req.params as BacktestRequest<"ma_crossover">["params"];

    const shortSma = sma(closes, params.short_window);
    const longSma = sma(closes, params.long_window);

    return closes.map(
      (_, index) =>
        shortSma[index] != null &&
        longSma[index] != null &&
        shortSma[index]! > longSma[index]!,
    );
  }

  const params =
    req.params as BacktestRequest<"rsi_mean_reversion">["params"];

  const values = rsi(closes, params.rsi_period);
  let inPosition = false;

  return closes.map((_, index) => {
    const value = values[index];

    if (value != null && !inPosition && value < params.oversold) {
      inPosition = true;
    } else if (
      value != null &&
      inPosition &&
      value >= params.recovery
    ) {
      inPosition = false;
    }

    return inPosition;
  });
}

const SAMPLE_HEADLINES: Omit<NewsEvidence, "published_at">[] = [
  {
    title: "Sample headline: quarterly results beat estimates",
    source: "Sample feed",
    url: null,
    sentiment_score: 0.62,
    sentiment_label: "positive",
  },
  {
    title: "Sample headline: input costs pressure margins",
    source: "Sample feed",
    url: null,
    sentiment_score: -0.48,
    sentiment_label: "negative",
  },
  {
    title: "Sample headline: company holds annual meeting",
    source: "Sample feed",
    url: null,
    sentiment_score: 0.04,
    sentiment_label: "neutral",
  },
  {
    title: "Sample headline: brokerage raises target price",
    source: "Sample feed",
    url: null,
    sentiment_score: 0.55,
    sentiment_label: "positive",
  },
  {
    title: "Sample headline: regulator opens sector review",
    source: "Sample feed",
    url: null,
    sentiment_score: -0.37,
    sentiment_label: "negative",
  },
  {
    title: "Sample headline: results in line with expectations",
    source: "Sample feed",
    url: null,
    sentiment_score: -0.06,
    sentiment_label: "neutral",
  },
];

export function runSampleBacktest(
  req: BacktestRequest,
): BacktestResponse {
  const bars = sampleBars(
    req.ticker,
    req.start_date,
    req.end_date,
  );

  const closes = bars.map((bar) => bar.close);
  const desiredPositions = positions(req, closes);

  let cash = req.initial_capital;

  let openPosition: {
    date: string;
    price: number;
    size: number;
  } | null = null;

  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  let peak = req.initial_capital;

  const closePosition = (index: number) => {
    if (!openPosition) return;

    const exitPrice = closes[index];

    cash += openPosition.size * exitPrice;

    trades.push({
      entry_date: openPosition.date,
      exit_date: bars[index].date,
      side: "long",
      size: openPosition.size,
      entry_price: openPosition.price,
      exit_price: exitPrice,
      pnl:
        Math.round(
          (exitPrice - openPosition.price) *
            openPosition.size *
            100,
        ) / 100,
      return_pct:
        Math.round(
          (exitPrice / openPosition.price - 1) * 10_000,
        ) / 100,
    });

    openPosition = null;
  };

  bars.forEach((bar, index) => {
    if (desiredPositions[index] && !openPosition) {
      const size = Math.floor(cash / bar.close);

      if (size > 0) {
        cash -= size * bar.close;

        openPosition = {
          date: bar.date,
          price: bar.close,
          size,
        };
      }
    } else if (!desiredPositions[index] && openPosition) {
      closePosition(index);
    }

    if (index === bars.length - 1) {
      closePosition(index);
    }

    const value =
      cash + (openPosition ? openPosition.size * bar.close : 0);

    peak = Math.max(peak, value);

    equity.push({
      date: bar.date,
      equity: Math.round(value * 100) / 100,
      drawdown_pct:
        Math.round((value / peak - 1) * 10_000) / 100,
    });
  });

  const finalEquity =
    equity.at(-1)?.equity ?? req.initial_capital;

  const returns = equity
    .slice(1)
    .map(
      (point, index) =>
        point.equity / equity[index].equity - 1,
    );

  const mean =
    returns.reduce((sum, value) => sum + value, 0) /
    (returns.length || 1);

  const standardDeviation = Math.sqrt(
    returns.reduce(
      (sum, value) => sum + (value - mean) ** 2,
      0,
    ) / (returns.length || 1),
  );

  const wins = trades.filter((trade) => trade.pnl > 0).length;

  const totalReturn =
    req.initial_capital !== 0
      ? ((finalEquity / req.initial_capital) - 1) * 100
      : 0;

  const maxDrawdown = Math.min(
    0,
    ...equity.map((point) => point.drawdown_pct ?? 0),
  );

  const winRate =
    trades.length > 0 ? (wins / trades.length) * 100 : null;

  const buyHoldReturn =
    closes.length > 0 && closes[0] !== 0
      ? Math.round(
          (closes[closes.length - 1] / closes[0] - 1) * 10_000,
        ) / 100
      : null;

  const metrics = {
    initial_capital: req.initial_capital,
    final_value: finalEquity,
    total_return_pct: Math.round(totalReturn * 100) / 100,
    max_drawdown_pct: maxDrawdown,
    sharpe_ratio:
      standardDeviation > 0
        ? Math.round(
            (mean / standardDeviation) * Math.sqrt(252) * 100,
          ) / 100
        : null,
    win_rate_pct:
      winRate == null ? null : Math.round(winRate * 10) / 10,
    num_trades: trades.length,
    buy_hold_return_pct: buyHoldReturn,
  };

  const news = sampleNews(bars);

  return {
    ticker: req.ticker,
    strategy: req.strategy,
    metrics,
    equity_curve: equity,
    trades,
    news,
  };
}

function sampleNews(bars: { date: string }[]): NewsEvidence[] {
  return bars.length
    ? SAMPLE_HEADLINES.map((headline, index) => ({
        ...headline,
        published_at: `${
          bars[
            Math.floor(
              ((index + 0.5) / SAMPLE_HEADLINES.length) *
                bars.length,
            )
          ].date
        }T09:30:00`,
      }))
    : [];
}

function delay<T>(
  milliseconds: number,
  value: () => T,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(
      () => resolve(value()),
      milliseconds,
    );

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export const sampleApi = {
  runBacktest: (
    req: BacktestRequest,
    signal?: AbortSignal,
  ) => delay(900, () => runSampleBacktest(req), signal),

  news: (ticker: string, start: string, end: string, signal?: AbortSignal) =>
    delay<NewsResponse>(
      600,
      () => ({
        ticker,
        query: ticker,
        from: start,
        to: end,
        in_backtest_range: true,
        articles: sampleNews(sampleBars(ticker, start, end)),
        sentiment_error: null,
      }),
      signal,
    ),

  marketData: (
    ticker: string,
    start: string,
    end: string,
    signal?: AbortSignal,
  ) =>
    delay<MarketDataResponse>(
      400,
      () => ({
        ticker,
        data: sampleBars(ticker, start, end),
      }),
      signal,
    ),
};
