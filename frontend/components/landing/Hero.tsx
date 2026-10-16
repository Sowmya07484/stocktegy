import Link from "next/link";
import { LetterReveal } from "../motion/LetterReveal";
import { Reveal } from "../motion/Reveal";
import { Scramble } from "../motion/Scramble";
import { WaveLines } from "./WaveLines";

const TICKERS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC"];

/**
 * S1. The violet sheet follows the nav up on load, then the heading scrambles in,
 * the subtext reveals letter by letter, and the ticker strip and CTA fade up last.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] animate-sheet-in flex-col overflow-hidden bg-violet-deep [animation-delay:160ms]">
      <WaveLines className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] w-full" />
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-violet/40 blur-[140px]" />

      <div className="relative mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-center px-4 pt-28 pb-10 sm:px-6 lg:px-8">
        <h1 className="display max-w-5xl text-[42px] text-white sm:text-6xl lg:text-[84px]">
          <span className="block">
            <Scramble text="Test the strategy." delay={520} duration={560} />
          </span>
          <span className="block text-teal">
            <Scramble text="Measure the risk." delay={560} duration={560} />
          </span>
          <span className="block">
            <Scramble text="Understand the evidence." delay={600} duration={560} />
          </span>
        </h1>

        <p className="mt-7 max-w-[60ch] text-[15px] leading-relaxed text-muted sm:text-base">
          <LetterReveal
            text="Backtest trading rules on NSE stocks, compare them with buying and holding, and read the news sentiment around every trade."
            delay={760}
            spread={600}
          />
        </p>

        <Reveal delay={1150} y={12} className="mt-9">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-violet-deep transition-all duration-300 ease-out hover:bg-white/90 hover:shadow-[0_0_32px_rgba(22,204,197,0.35)] active:scale-[0.97]"
          >
            Run a backtest
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </Reveal>
      </div>

      <Reveal delay={950} y={12} margin="0px" className="relative mx-auto w-full max-w-[1320px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] px-5 py-4 backdrop-blur-md">
          <p className="eyebrow mb-3 text-center">Try it on</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {TICKERS.map((t) => (
              <li key={t}>
                <Link
                  href={`/dashboard?ticker=${t}.NS`}
                  className="text-sm font-medium tracking-wide text-white/75 transition-colors duration-300 hover:text-teal"
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
