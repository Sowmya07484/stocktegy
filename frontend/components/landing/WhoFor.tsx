import Link from "next/link";
import { Reveal } from "../motion/Reveal";
import { SectionIntro } from "./shared";

const icon = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const AUDIENCES = [
  {
    title: "Students",
    text: "See how a trading rule would have played out before putting any money on it.",
    icon: icon(<><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" /></>),
  },
  {
    title: "Beginner traders",
    text: "Check whether a strategy actually beats simply holding the stock.",
    icon: icon(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  },
  {
    title: "Student quants",
    text: "Tune parameters and compare drawdown, Sharpe and win rate across runs.",
    icon: icon(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  },
  {
    title: "Educators",
    text: "Show a class real price history next to the news that moved it.",
    icon: icon(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>),
  },
];

/** S5: four columns that arrive left to right, ~0.12s apart; links fade in last. */
export function WhoFor() {
  return (
    <section id="who" aria-labelledby="who-title" className="rounded-t-[40px] bg-panel px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <SectionIntro id="who-title" eyebrow="Who it's for" title="Built for people learning to test ideas" wavy />
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.title} y={60} delay={200 + i * 120} className="flex flex-col">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] text-teal ring-1 ring-white/10">{a.icon}</span>
              <h3 className="mt-5 text-lg text-white">{a.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{a.text}</p>
              <Reveal y={8} delay={200 + 4 * 120 + 200}>
                <Link href="/dashboard" className="eyebrow mt-5 inline-flex items-center gap-1.5 !text-white/70 transition-colors duration-300 hover:!text-teal">
                  Try it
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </Reveal>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
