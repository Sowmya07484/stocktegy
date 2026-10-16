"use client";

import { api } from "@/lib/api";
import { USE_SAMPLE_DATA } from "@/lib/config";
import { sampleApi } from "@/lib/sampleData";
import type { BacktestRequest } from "@/types/backtest";
import { useApiRequest } from "./useApiRequest";

export type { RequestStatus } from "./useApiRequest";

const source = USE_SAMPLE_DATA ? sampleApi : api;

export const useBacktest = () =>
  useApiRequest((payload: BacktestRequest, signal: AbortSignal) => source.runBacktest(payload, signal));

export const useMarketData = () =>
  useApiRequest((ticker: string, start: string, end: string, signal: AbortSignal) =>
    source.marketData(ticker, start, end, signal),
  );
