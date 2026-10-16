import { Reveal } from "../motion/Reveal";
import { Scramble } from "../motion/Scramble";
import { RingNode, SectionIntro } from "./shared";

const POINTS = [
  { title: "NSE prices from Yahoo Finance", text: "Daily OHLCV for the ticker and dates you choose." },
  { title: "Three strategies, one baseline", text: "Moving average crossover and RSI mean reversion, measured against buy & hold." },
  { title: "News next to the numbers", text: "Laya sentiment on headlines from the same window as the trades." },
];

/** A static picture of the dashboard's strategy builder, drawn in HTML. */
function BuilderMockup() {
  const field = "rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] text-white/90";
  return (
    <div data-ui aria-hidden className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel/90 p-5 shadow-2xl backdrop-blur-md">
      <p className="mb-1.5 text-[11px] text-muted">Ticker</p>
      <div className={field}>TCS.NS</div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[11px] text-muted">Start</p>
          <div className={field}>01 Jan 2024</div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] text-muted">End</p>
          <div className={field}>31 Dec 2024</div>
        </div>
      </div>
      <p className="mt-3 mb-1.5 text-[11px] text-muted">Strategy</p>
      <div className={field}>Moving Average Crossover</div>
      {[
        ["Short window", "20d", "28%"],
        ["Long window", "50d", "52%"],
      ].map(([label, v, w]) => (
        <div key={label} className="mt-3">
          <div className="mb-1.5 flex justify-between text-[11px] text-muted">
            <span>{label}</span>
            <span className="text-white">{v}</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-white/10">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet to-teal" style={{ width: w }} />
            <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: w }} />
          </div>
        </div>
      ))}
      <div className="mt-5 rounded-full bg-violet py-2.5 text-center text-[13px] font-medium text-white">Run Backtest</div>
    </div>
  );
}

/** S2: dark card with the builder picture on the left and the three points on the right. */
export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="rounded-t-[40px] bg-ink px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-[1320px]">
        <SectionIntro
          id="how-title"
          eyebrow="How it works"
          title="From a stock and a rule to evidence"
          sub="Every backtest starts with three choices and ends with numbers you can check against the market."
        />

        <div className="mt-16 grid items-center gap-12 lg:mt-20 lg:grid-cols-2 lg:gap-20">
          <Reveal y={80} delay={150}>
            <div className="relative flex min-h-[420px] items-center justify-center rounded-[28px] rounded-tr-[72px] bg-gradient-to-br from-violet via-violet-2 to-teal/70 p-8 sm:p-12">
              <RingNode className="top-10 -left-[5px]" />
              <RingNode className="-right-[5px] bottom-16" />
              <RingNode className="-bottom-[5px] left-1/3" />
              <BuilderMockup />
            </div>
          </Reveal>

          <div>
            <h3 className="display text-3xl text-white sm:text-4xl">
              <Scramble text="Pick a stock, pick a rule, see the truth" delay={250} duration={560} />
            </h3>
            <ul className="mt-9 space-y-6">
              {POINTS.map((p, i) => (
                <Reveal as="li" key={p.title} y={16} delay={450 + i * 80} className="flex gap-4">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal/15 text-teal">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[15px] font-medium text-white">{p.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{p.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
