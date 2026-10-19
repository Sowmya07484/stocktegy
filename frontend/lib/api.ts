
import type {
  BacktestRequest,
  BacktestResponse,
  HealthResponse,
  MarketDataResponse,
  NewsResponse,
} from "@/types/backtest";
import {
  fromBackendBacktest,
  fromBackendMarketData,
  fromBackendNews,
  type BackendBacktestResponse,
  type BackendMarketDataResponse,
  type BackendNewsResponse,
} from "./backendAdapter";

const API_BASE = "";
const DEFAULT_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("detail" in body)) {
    return fallback;
  }

  const { detail } = body as { detail: unknown };

  if (typeof detail === "string") return detail;

  if (detail && typeof detail === "object" && "message" in detail) {
    const d = detail as {
      message: string;
      available_strategies?: string[];
    };

    return d.available_strategies
      ? `${d.message} Available: ${d.available_strategies.join(", ")}`
      : d.message;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const field = d.loc?.filter((p) => p !== "body").join(".");
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join("; ");
  }

  return fallback;
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    ...rest
  } = init;

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(new DOMException("Timeout", "TimeoutError")),
    timeoutMs,
  );

  signal?.addEventListener(
    "abort",
    () => controller.abort(signal.reason),
    { once: true },
  );

  let res: Response;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...rest.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError(
        `Request timed out after ${timeoutMs / 1000}s`,
        408,
      );
    }

    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }

    throw new ApiError(
      "Cannot reach backend. Is FastAPI running on port 8000?",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const responseText = await res.text();
  let body: unknown = null;

  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = responseText;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, `${res.status} ${res.statusText}`),
      res.status,
      body,
    );
  }

  return body as T;
}

export const api = {
  health: (signal?: AbortSignal) =>
    request<HealthResponse>("/api/health", {
      signal,
      timeoutMs: 5_000,
    }),

  marketData: async (
    ticker: string,
    start: string,
    end: string,
    signal?: AbortSignal,
  ): Promise<MarketDataResponse> => {
    try {
      return fromBackendMarketData(
        await request<BackendMarketDataResponse>("/api/market-data", {
          method: "POST",
          body: JSON.stringify({
            ticker,
            start_date: start,
            end_date: end,
          }),
          signal,
        }),
      );
    } catch (err) {
      // the backend may not expose this endpoint; say so instead of a bare "Not Found"
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        throw new ApiError("Price data isn't available from the backend yet (no /api/market-data endpoint).", err.status);
      }
      throw err;
    }
  },

  news: (ticker: string, start: string, end: string, signal?: AbortSignal): Promise<NewsResponse> =>
    request<BackendNewsResponse>("/api/news", {
      method: "POST",
      body: JSON.stringify({ ticker, start_date: start, end_date: end }),
      signal,
      timeoutMs: 60_000, // the first call may wait for Laya to load its model
    }).then(fromBackendNews),

  runBacktest: async (
    payload: BacktestRequest,
    signal?: AbortSignal,
  ): Promise<BacktestResponse> =>
    fromBackendBacktest(
      await request<BackendBacktestResponse>("/api/backtest", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
      }),
    ),
};
