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
      <span className="inline-flex items-center gap-2 rounded-full border border-warn/30 bg-warn/10 px-3 py-1 text-xs text-warn">
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
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.text}
    </span>
  );
}
