// Chart tokens. Line pair validated with dataviz validate_palette.js (dark, surface #121222):
// all six checks pass. Candle green/red fail CVD (ΔE 4.6), so up = hollow, down = filled.
export const CHART = {
  surface: "#121222",
  grid: "rgb(255 255 255 / 0.06)",
  axis: "#64748b",
  equity: "#a855f7",
  smaShort: "#8b5cf6",
  smaLong: "#d97706",
  up: "#34d399",
  down: "#fb7185",
  reference: "rgb(148 163 184 / 0.5)",
} as const;

export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

/** First trading day of each month, so month labels never repeat. */
export function monthTicks(dates: string[]): string[] {
  const out: string[] = [];
  let prev = "";
  for (const d of dates) {
    const m = d.slice(0, 7);
    if (m !== prev) out.push(d);
    prev = m;
  }
  return out;
}

/** ₹ axis labels in lakh/crore with enough precision that adjacent ticks differ. */
export function formatInrAxis(v: number): string {
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}

export function TooltipShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-44 rounded-xl border border-white/15 bg-[#0d0d1a]/95 px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-md">
      <p className="mb-1.5 font-medium text-slate-300">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function TooltipRow({
  label,
  value,
  swatch,
  valueClass = "text-fg",
}: {
  label: string;
  value: string;
  swatch?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted">
        {swatch}
        {label}
      </span>
      <span className={`font-mono tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

export const LineSwatch = ({ color, dashed }: { color: string; dashed?: boolean }) => (
  <svg width="14" height="6" aria-hidden>
    <line x1="0" y1="3" x2="14" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "3 2" : undefined} />
  </svg>
);

export const CandleSwatch = ({ up }: { up: boolean }) => (
  <svg width="8" height="12" aria-hidden>
    <rect
      x="1"
      y="1"
      width="6"
      height="10"
      rx="1"
      fill={up ? "transparent" : CHART.down}
      stroke={up ? CHART.up : CHART.down}
      strokeWidth="1.5"
    />
  </svg>
);

export const MarkerSwatch = ({ kind }: { kind: "buy" | "sell" }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
    <path
      d={kind === "buy" ? "M5 1l4 7H1z" : "M5 9L1 2h8z"}
      fill={kind === "buy" ? CHART.up : CHART.down}
      stroke={CHART.surface}
      strokeWidth="1"
    />
  </svg>
);
