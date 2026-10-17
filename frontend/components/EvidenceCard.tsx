"use client";

import { useMemo, useState } from "react";
import { formatDate, formatDateTime, formatPct, formatPrice } from "@/lib/format";
import type { NewsEvidence, SentimentLabel, Trade } from "@/types/backtest";
import { Card, CardHeader, EmptyState, Segmented } from "./ui";

type Tab = "news" | "trades";
type SentimentFilter = "all" | SentimentLabel;

const SENTIMENT_STYLE: Record<SentimentLabel, { chip: string; bar: string; icon: string }> = {
  positive: { chip: "border-gain/30 bg-gain/10 text-gain", bar: "bg-gain", icon: "▲" },
  neutral: { chip: "border-white/15 bg-white/5 text-slate-300", bar: "bg-slate-400", icon: "●" },
  negative: { chip: "border-loss/30 bg-loss/10 text-loss", bar: "bg-loss", icon: "▼" },
};

function SentimentTag({ label, score }: { label: SentimentLabel; score: number }) {
  const s = SENTIMENT_STYLE[label];
  // score is -1..1; bar grows from the centre
  const pct = Math.min(1, Math.abs(score)) * 50;
  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-flex w-[84px] items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${s.chip}`}>
        <span aria-hidden className="text-[8px]">{s.icon}</span>
        {label}
      </span>
      <div className="relative hidden h-1.5 w-16 rounded-full bg-white/10 sm:block" aria-hidden>
        <div className="absolute top-0 left-1/2 h-full w-px bg-white/25" />
        <div
          className={`absolute top-0 h-full rounded-full ${s.bar}`}
          style={score >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted tabular-nums">{score >= 0 ? "+" : ""}{score.toFixed(2)}</span>
    </div>
  );
}

const th = "px-4 py-3 text-left text-[11px] font-medium tracking-wider text-muted uppercase whitespace-nowrap first:pl-5 sm:first:pl-6 last:pr-5 sm:last:pr-6";
const td = "px-4 py-3 align-top first:pl-5 sm:first:pl-6 last:pr-5 sm:last:pr-6";

function NewsTable({ news }: { news: NewsEvidence[] }) {
  const [filter, setFilter] = useState<SentimentFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { all: news.length, positive: 0, neutral: 0, negative: 0 };
    news.forEach((n) => c[n.sentiment_label]++);
    return c;
  }, [news]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return news
      .filter((n) => filter === "all" || n.sentiment_label === filter)
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.source.toLowerCase().includes(q))
      .sort((a, b) => b.published_at.localeCompare(a.published_at));
  }, [news, filter, query]);

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Segmented<SentimentFilter>
          ariaLabel="Sentiment filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${counts.all}` },
            { value: "positive", label: `Positive ${counts.positive}` },
            { value: "neutral", label: `Neutral ${counts.neutral}` },
            { value: "negative", label: `Negative ${counts.negative}` },
          ]}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter headlines or sources…"
          className="h-9 w-full rounded-lg border border-line bg-ink/70 px-3 text-xs text-fg outline-none transition-all duration-300 ease-in-out placeholder:text-slate-600 hover:border-violet/50 hover:shadow-[0_0_20px_rgba(113,52,235,0.15)] focus:border-violet sm:w-64"
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState>No headlines match this filter.</EmptyState>
      ) : (
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
              <tr className="border-b border-line">
                <th className={th}>Published</th>
                <th className={th}>Headline</th>
                <th className={th}>Source</th>
                <th className={th}>Laya sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((n, i) => (
                <tr
                  key={`${n.published_at}-${i}`}
                  className="animate-rise-in transition-colors duration-200 hover:bg-violet/[0.06]"
                  style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
                >
                  <td className={`${td} font-mono text-xs whitespace-nowrap text-muted`}>{formatDateTime(n.published_at)}</td>
                  <td className={`${td} max-w-[480px]`}>
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-medium text-fg hover:text-teal hover:underline">
                        {n.title}
                      </a>
                    ) : (
                      <span className="font-medium text-fg">{n.title}</span>
                    )}
                    {n.summary && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.summary}</p>}
                  </td>
                  <td className={`${td} text-xs whitespace-nowrap text-slate-300`}>{n.source}</td>
                  <td className={td}><SentimentTag label={n.sentiment_label} score={n.sentiment_score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TradesTable({ trades }: { trades: Trade[] }) {
  if (!trades.length) return <EmptyState>The strategy made no trades in this window.</EmptyState>;
  return (
    <div className="max-h-[440px] overflow-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
          <tr className="border-b border-line">
            <th className={th}>Entry</th>
            <th className={th}>Exit</th>
            <th className={th}>Side</th>
            <th className={`${th} text-right`}>Size</th>
            <th className={`${th} text-right`} title={ADJ_NOTE}>
              <span className="cursor-help border-b border-dotted border-muted/60">Entry px*</span>
            </th>
            <th className={`${th} text-right`} title={ADJ_NOTE}>
              <span className="cursor-help border-b border-dotted border-muted/60">Exit px*</span>
            </th>
            <th className={`${th} text-right`}>P&amp;L</th>
            <th className={`${th} text-right`}>Return</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-mono text-xs tabular-nums">
          {trades.map((t, i) => {
            const tone = t.pnl > 0 ? "text-gain" : t.pnl < 0 ? "text-loss" : "text-muted";
            return (
              <tr
                key={i}
                className="animate-rise-in transition-colors duration-200 hover:bg-violet/[0.06]"
                style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
              >
                <td className={`${td} whitespace-nowrap text-slate-300`}>{formatDate(t.entry_date)}</td>
                <td className={`${td} whitespace-nowrap text-slate-300`}>
                  {t.exit_date ? formatDate(t.exit_date) : <span className="text-warn">Open</span>}
                  {t.closed_at_end && (
                    <span
                      title="Still open on the end date, so valued at the last close. Not an exit signal."
                      className="ml-2 rounded-md border border-line bg-white/5 px-1.5 py-0.5 font-sans text-[10px] text-muted"
                    >
                      closed at end
                    </span>
                  )}
                </td>
                <td className={td}>
                  <span className="rounded-md border border-line bg-white/5 px-1.5 py-0.5 text-[10px] tracking-wider text-slate-300 uppercase">{t.side}</span>
                </td>
                <td className={`${td} text-right text-fg`}>{t.size}</td>
                <td className={`${td} text-right text-fg`}>{formatPrice(t.entry_price)}</td>
                <td className={`${td} text-right text-fg`}>{formatPrice(t.exit_price)}</td>
                <td className={`${td} text-right ${tone}`}>{t.pnl >= 0 ? "+" : ""}{formatPrice(t.pnl)}</td>
                <td className={`${td} text-right ${tone}`}>{formatPct(t.return_pct)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// adjusted prices subtract every later dividend, so they sit below the prices quoted in the news
const ADJ_NOTE = "Dividend-adjusted price: every later dividend is subtracted, so it reads lower than the price quoted at the time.";

export function EvidenceCard({
  news,
  trades,
  newsSupported = true,
}: {
  news: NewsEvidence[] | null;
  trades: Trade[] | null;
  /** false when the backend returned a result without news; the News tab is hidden. */
  newsSupported?: boolean;
}) {
  const [picked, setPicked] = useState<Tab>("trades");
  const tab: Tab = newsSupported ? picked : "trades";
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={tab === "news" ? "Laya news evidence" : "Trade log"}
        subtitle={tab === "news" ? "Headlines scored by Laya sentiment over the backtest window" : "Fill dates and prices: signals on a close fill at the next day's open (dividend-adjusted)"}
        right={
          newsSupported ? (
            <Segmented<Tab>
              ariaLabel="Evidence view"
              value={tab}
              onChange={setPicked}
              options={[
                { value: "trades", label: `Trades${trades ? ` · ${trades.length}` : ""}` },
                { value: "news", label: `News${news ? ` · ${news.length}` : ""}` },
              ]}
            />
          ) : undefined
        }
      />
      <div key={`${tab}-${news?.length ?? "x"}-${trades?.length ?? "x"}`} className="animate-fade-in">
        {tab === "news" ? (
          news ? (news.length ? <NewsTable news={news} /> : <EmptyState>Laya returned no headlines for this window.</EmptyState>) : <EmptyState>News evidence appears after a backtest run.</EmptyState>
        ) : trades ? (
          <TradesTable trades={trades} />
        ) : (
          <EmptyState>Trades appear after a backtest run.</EmptyState>
        )}
      </div>
    </Card>
  );
}
