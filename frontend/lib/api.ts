import type {
  BacktestRequest,
  BacktestResponse,
  HealthResponse,
  MarketDataResponse,
} from "@/types/backtest";

// Empty string = same origin, routed to FastAPI by the rewrite in next.config.ts.
// Set NEXT_PUBLIC_API_URL to call the backend directly (requires CORS on FastAPI).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
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

  marketData: (ticker: string, start: string, end: string, signal?: AbortSignal) => {
    const qs = new URLSearchParams({ ticker, start, end });
    return request<MarketDataResponse>(`/api/market-data?${qs}`, { signal });
  },

  runBacktest: (payload: BacktestRequest, signal?: AbortSignal) =>
    request<BacktestResponse>("/api/backtest", {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    }),
};
