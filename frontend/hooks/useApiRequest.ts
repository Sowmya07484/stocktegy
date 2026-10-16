"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";

export type RequestStatus = "idle" | "loading" | "success" | "error";

/** Wraps an api.* call with loading/error state and cancels the previous call on re-run. */
export function useApiRequest<Args extends unknown[], T>(
  fn: (...args: [...Args, AbortSignal]) => Promise<T>,
) {
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: Args) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setStatus("loading");
    setError(null);
    try {
      const result = await fnRef.current(...args, controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
      setStatus("success");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof ApiError ? err.message : "Unexpected error");
      setStatus("error");
    }
  }, []);

  useEffect(() => () => inflight.current?.abort(), []);

  return { run, status, data, error, isLoading: status === "loading" };
}
