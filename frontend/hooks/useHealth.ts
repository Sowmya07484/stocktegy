"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type HealthState = "checking" | "online" | "offline";

export function useHealth(pollMs = 15_000) {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let controller = new AbortController();
    const check = () => {
      controller.abort();
      controller = new AbortController();
      api
        .health(controller.signal)
        .then(() => setState("online"))
        .catch((err) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) setState("offline");
        });
    };
    check();
    const id = setInterval(check, pollMs);
    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, [pollMs]);

  return state;
}
