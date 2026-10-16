"use client";

import { useHealth } from "@/hooks/useHealth";
import { USE_SAMPLE_DATA } from "@/lib/config";

const STYLES = {
  checking: { dot: "bg-warn animate-pulse", text: "Connecting" },
  online: { dot: "bg-gain shadow-[0_0_8px_var(--color-gain)]", text: "API online" },
  offline: { dot: "bg-loss", text: "API offline" },
} as const;

export function HealthBadge() {
  if (USE_SAMPLE_DATA) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-xs text-warn ring-1 ring-warn/40">
        <span className="h-2 w-2 rounded-full bg-warn" />
        Sample data · API not connected
      </span>
    );
  }
  return <LiveHealthBadge />;
}

function LiveHealthBadge() {
  const state = useHealth();
  const s = STYLES[state];
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-xs text-white/85 ring-1 ring-white/15">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.text}
    </span>
  );
}
