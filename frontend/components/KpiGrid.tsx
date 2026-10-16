import { formatCurrency, formatNumber, formatPct } from "@/lib/format";
import type { BacktestMetrics } from "@/types/backtest";

type Tone = "gain" | "loss" | "neutral";

const toneText: Record<Tone, string> = {
  gain: "text-gain",
  loss: "text-loss",
  neutral: "text-fg",
};

const toneChip: Record<Tone, string> = {
  gain: "border-gain/30 bg-gain/10 text-gain",
  loss: "border-loss/30 bg-loss/10 text-loss",
  neutral: "border-line bg-white/5 text-muted",
};

const toneOf = (v: number | null | undefined): Tone =>
  v == null ? "neutral" : v > 0 ? "gain" : v < 0 ? "loss" : "neutral";

const Arrow = ({ tone }: { tone: Tone }) =>
  tone === "neutral" ? null : (
    <svg viewBox="0 0 12 12" className={`h-3 w-3 ${tone === "loss" ? "rotate-180" : ""}`} fill="currentColor" aria-hidden>
      <path d="M6 2l4 6H2z" />
    </svg>
  );

interface KpiCardProps {
  label: string;
  value: string;
  chip?: string;
  chipTone?: Tone;
  sub?: string;
  valueTone?: Tone;
  loading?: boolean;
  icon: React.ReactNode;
  className?: string;
}

function KpiCard({
  label,
  value,
  chip,
  chipTone = "neutral",
  sub,
  valueTone = "neutral",
  loading,
  icon,
  index = 0,
  className = "",
}: KpiCardProps & { index?: number }) {
  return (
    <div className={`${className} group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121222]/80 p-5 backdrop-blur-xl transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-indigo-500/50 hover:bg-[#17172c]/80 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]`}>
      <div className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full bg-brand-to/10 blur-2xl transition-all duration-500 ease-in-out group-hover:scale-125 group-hover:bg-brand-to/25" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel-raised text-brand-to transition-all duration-300 group-hover:border-brand-to/40 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.35)]">
          {icon}
        </span>
      </div>
      {loading ? (
        <>
          <div className="skeleton mt-4 h-8 w-32 rounded-md" />
          <div className="skeleton mt-3 h-5 w-24 rounded-full" />
        </>
      ) : (
        // keyed on value so a new result replays the staggered fade-in
        <div key={value} className="animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
          <p className={`mt-3 font-mono text-[28px] leading-tight font-semibold tracking-tight tabular-nums ${toneText[valueTone]}`}>{value}</p>
          <div className="mt-2 flex h-5 items-center gap-2">
            {chip && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${toneChip[chipTone]}`}>
                <Arrow tone={chipTone} />
                {chip}
              </span>
            )}
            {sub && <span className="text-xs text-muted">{sub}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const svg = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const icons = {
  coins: svg(<><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7M15 11.5c3.4.1 6 1.4 6 3v3c0 1.7-2.7 3-6 3-2 0-3.8-.5-4.9-1.3" /></>),
  wallet: svg(<><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M16 13h2M3 10h18" /></>),
  pnl: svg(<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />),
  trend: svg(<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />),
  drop: svg(<path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />),
  target: svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>),
  trades: svg(<path d="M4 6h16M4 12h16M4 18h10" />),
};

interface Props {
  metrics: BacktestMetrics | null;
  loading: boolean;
}

type CardSpec = Omit<KpiCardProps, "loading">;

function buildCards(m: BacktestMetrics | null): CardSpec[] {
  const pnl = m ? m.final_value - m.initial_capital : null;
  const winTone: Tone = m?.win_rate_pct == null ? "neutral" : m.win_rate_pct >= 50 ? "gain" : "loss";
  return [
    { label: "Initial Capital", icon: icons.coins, value: m ? formatCurrency(m.initial_capital) : "—", sub: m ? "Starting cash" : undefined },
    {
      label: "Final Equity",
      icon: icons.wallet,
      // first on 2-col screens so the 7 cards tile without a gap
      className: "sm:col-span-2 sm:-order-1 xl:order-none",
      value: m ? formatCurrency(m.final_value) : "—",
      valueTone: toneOf(pnl),
      chip: m ? `Sharpe ${formatNumber(m.sharpe_ratio)}` : undefined,
      sub: m ? "Portfolio value at end date" : undefined,
    },
    {
      label: "Net Profit / Loss",
      icon: icons.pnl,
      value: pnl == null ? "—" : `${pnl > 0 ? "+" : pnl < 0 ? "−" : ""}${formatCurrency(Math.abs(pnl))}`,
      valueTone: toneOf(pnl),
    },
    { label: "Total Return", icon: icons.trend, value: m ? formatPct(m.total_return_pct) : "—", valueTone: toneOf(m?.total_return_pct) },
    {
      label: "Max Drawdown",
      icon: icons.drop,
      value: m ? formatPct(-Math.abs(m.max_drawdown_pct), false) : "—",
      valueTone: m && m.max_drawdown_pct !== 0 ? "loss" : "neutral",
      sub: m ? "Peak to trough" : undefined,
    },
    {
      label: "Win Rate",
      icon: icons.target,
      value: m ? formatPct(m.win_rate_pct, false) : "—",
      valueTone: winTone,
      sub: m && m.win_rate_pct == null ? "No closed trades" : undefined,
    },
    { label: "Number of Trades", icon: icons.trades, value: m ? String(m.num_trades) : "—", sub: m ? "Round trips" : undefined },
  ];
}

export function KpiGrid({ metrics, loading }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {buildCards(metrics).map((c, i) => (
        <KpiCard key={c.label} {...c} loading={loading} index={i} />
      ))}
    </div>
  );
}
