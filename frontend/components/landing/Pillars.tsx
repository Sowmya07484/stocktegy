"use client";

import { useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { Reveal } from "../motion/Reveal";
import { Scramble } from "../motion/Scramble";

const PILLARS = [
  { title: "Backtest", text: "Replay a rule on daily prices and see every trade it would have made." },
  { title: "Compare", text: "Line it up against buy & hold and the other strategies on return, drawdown and Sharpe." },
  { title: "News context", text: "Read the headlines and Laya sentiment from the days around each trade." },
];

// three beams start at the left edge (one per pillar) and converge on the orb
const BEAMS = ["M0 70 C 180 70, 260 200, 420 200", "M0 200 C 160 200, 260 200, 420 200", "M0 330 C 180 330, 260 200, 420 200"];
const RAYS = [-50, -25, 0, 25, 50];

function Beam({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 560 400" className="h-full w-full overflow-visible" fill="none" aria-hidden>
      <defs>
        {/* userSpaceOnUse: the straight middle beam has a zero-height bounding box, which breaks the default units */}
        <linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="420" y2="0">
          <stop offset="0%" stopColor="#7134eb" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#16ccc5" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="orbGlow">
          <stop offset="0%" stopColor="#16ccc5" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#7134eb" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7134eb" stopOpacity="0" />
        </radialGradient>
      </defs>
      {BEAMS.map((d, i) => (
        <path
          key={d}
          d={d}
          stroke="url(#beam)"
          strokeWidth={1.5}
          pathLength={1}
          strokeDasharray="1"
          style={{
            strokeDashoffset: on ? 0 : 1,
            transition: `stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1) ${200 + i * 120}ms`,
          }}
        />
      ))}
      {/* rays fan out from the orb once the beams arrive */}
      {RAYS.map((deg, i) => (
        <line
          key={deg}
          x1={420}
          y1={200}
          x2={420 + 130 * Math.cos((deg * Math.PI) / 180)}
          y2={200 + 130 * Math.sin((deg * Math.PI) / 180)}
          stroke="#16ccc5"
          strokeWidth={1}
          style={{ opacity: on ? 0.35 : 0, transition: `opacity 700ms ease-out ${1200 + i * 60}ms` }}
        />
      ))}
      <g style={{ transformOrigin: "420px 200px", transform: on ? "scale(1)" : "scale(0)", transition: "transform 700ms cubic-bezier(0.22,1,0.36,1) 1000ms" }}>
        <g className="animate-orb-pulse" style={{ transformOrigin: "420px 200px" }}>
          <circle cx={420} cy={200} r={64} fill="url(#orbGlow)" />
          <circle cx={420} cy={200} r={10} fill="#fff" />
        </g>
      </g>
    </svg>
  );
}

/** S3: violet panel. Three pillars on the left; light beams converge on one orb, "one decision". */
export function Pillars() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { threshold: 0.35 });
  const [active, setActive] = useState(0);

  return (
    <section id="pillars" aria-labelledby="pillars-title" className="rounded-t-[40px] bg-violet-deep px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div ref={ref} className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[1fr_1.1fr_auto] lg:gap-10">
        <div>
          <Reveal y={12}>
            <p className="eyebrow">Three pillars</p>
          </Reveal>
          <h2 id="pillars-title" className="display mt-4 text-4xl text-white sm:text-5xl">
            <Scramble text="Three answers, one decision" delay={50} duration={600} wavy />
          </h2>
          <ul className="mt-10 space-y-2">
            {PILLARS.map((p, i) => (
              <Reveal as="li" key={p.title} y={16} delay={300 + i * 80}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-pressed={active === i}
                  className={`w-full rounded-2xl px-5 py-4 text-left transition-all duration-300 ease-out ${
                    active === i ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <span className={`block text-lg transition-colors duration-300 ${active === i ? "text-teal" : "text-white"}`}>{p.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{p.text}</span>
                </button>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="hidden h-[400px] lg:block">
          <Beam on={on} />
        </div>

        {/* vertical pager dots, one per pillar */}
        <div className="hidden flex-col gap-3 lg:flex" aria-hidden>
          {PILLARS.map((p, i) => (
            <span
              key={p.title}
              className={`w-2 rounded-full transition-all duration-300 ${active === i ? "h-6 bg-teal" : "h-2 bg-white/30"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
