import type { StrategyId, StrategyParamsMap } from "@/types/backtest";

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface StrategyDef<S extends StrategyId = StrategyId> {
  id: S;
  label: string;
  description: string;
  /** Flip to true once the FastAPI backend implements this strategy. */
  backendReady: boolean;
  params: ParamSpec[];
  defaults: StrategyParamsMap[S];
  validate: (p: StrategyParamsMap[S]) => string | null;
}

// Add a new strategy here + in types/backtest.ts once the backend supports it.
export const STRATEGIES: { [S in StrategyId]: StrategyDef<S> } = {
  ma_crossover: {
    id: "ma_crossover",
    label: "Moving Average Crossover",
    description: "Long when the short SMA crosses above the long SMA; exit on cross below.",
    backendReady: true,
    params: [
      { key: "short_window", label: "Short window", min: 5, max: 100, step: 1, unit: "d" },
      { key: "long_window", label: "Long window", min: 10, max: 250, step: 1, unit: "d" },
    ],
    defaults: { short_window: 20, long_window: 50 },
    validate: (p) =>
      p.short_window >= p.long_window ? "Short window must be less than long window" : null,
  },
  rsi_mean_reversion: {
    id: "rsi_mean_reversion",
    label: "RSI Mean Reversion",
    description: "Buy when RSI falls below the oversold level; sell once it recovers to the exit level.",
    backendReady: true,
    params: [
      { key: "rsi_period", label: "RSI period", min: 2, max: 50, step: 1, unit: "d" },
      { key: "oversold", label: "Oversold (buy below)", min: 5, max: 50, step: 1 },
      { key: "recovery", label: "Exit (RSI recovers to)", min: 30, max: 90, step: 1 },
    ],
    defaults: { rsi_period: 14, oversold: 30, recovery: 50 },
    validate: (p) => (p.oversold >= p.recovery ? "Oversold level must be below the exit level" : null),
  },
  buy_and_hold: {
    id: "buy_and_hold",
    label: "Buy & Hold",
    description: "Baseline: buy on the first day and hold until the end date.",
    backendReady: true,
    params: [],
    defaults: {},
    validate: () => null,
  },
};

export const STRATEGY_LIST: StrategyDef[] = Object.values(STRATEGIES) as StrategyDef[];
