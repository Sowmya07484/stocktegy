import type { BacktestRequest, BacktestResponse, HealthResponse, MarketDataResponse } from "@/types/backtest";
import {
  fromBackendBacktest,
  fromBackendMarketData,
  type BackendBacktestResponse,
  type BackendMarketDataResponse,
} from "./backendAdapter";

// Requests go to this origin (e.g. POST /api/backtest) and next.config.ts forwards them
// to NEXT_PUBLIC_API_BASE_URL, so the backend URL is configured in one place.
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

// FastAPI returns { detail: string } for HTTPException and { detail: [{loc, msg}] } for 422s.
function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("detail" in body)) return fallback;
  const { detail } = body as { detail: unknown };
  if (typeof detail === "string") return detail;
  // e.g. {"message": "Unsupported strategy.", "available_strategies": [...]}
  if (detail && typeof detail === "object" && "message" in detail) {
    const d = detail as { message: string; available_strategies?: string[] };
    return d.available_strategies ? `${d.message} Available: ${d.available_strategies.join(", ")}` : d.message;
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
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timeout", "TimeoutError")), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(signal.reason), { once: true });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(rest.body ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError(`Request timed out after ${timeoutMs / 1000}s`, 408);
    }
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach backend. Is FastAPI running on port 8000?", 0);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, `${res.status} ${res.statusText}`), res.status, body);
  }
  return body as T;
}

export const api = {
  health: (signal?: AbortSignal) =>
    request<HealthResponse>("/api/health", { signal, timeoutMs: 5_000 }),

  marketData: async (ticker: string, start: string, end: string, signal?: AbortSignal): Promise<MarketDataResponse> =>
    fromBackendMarketData(
      await request<BackendMarketDataResponse>("/api/market-data", {
        method: "POST",
        body: JSON.stringify({ ticker, start_date: start, end_date: end }),
        signal,
      }),
    ),

  runBacktest: async (payload: BacktestRequest, signal?: AbortSignal): Promise<BacktestResponse> =>
    fromBackendBacktest(
      await request<BackendBacktestResponse>("/api/backtest", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
      }),
    ),
};
