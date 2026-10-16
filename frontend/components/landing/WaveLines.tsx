"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/random";

const W = 1440;
const H = 640;
const LINES = 7;
const STEP = 24;

/** y for line k at x and time t: a rising "equity curve" with two travelling waves on top. */
function y(k: number, x: number, t: number) {
  const base = 470 + k * 18 - x * (0.13 + k * 0.012);
  return base + 26 * Math.sin(x * 0.006 + t * 0.55 + k * 0.7) + 11 * Math.sin(x * 0.017 - t * 0.9 + k * 1.9);
}

function pathFor(k: number, t: number) {
  let d = `M0 ${y(k, 0, t).toFixed(1)}`;
  for (let x = STEP; x <= W; x += STEP) d += `L${x} ${y(k, x, t).toFixed(1)}`;
  return d;
}

/** Ambient hero lines: stylised equity curves that flow continuously (paused off-screen). */
export function WaveLines({ className = "" }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const draw = (t: number) => paths.current.forEach((p, k) => p?.setAttribute("d", pathFor(k, t)));
    draw(0);
    if (prefersReducedMotion()) return;

    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      draw(now / 1000);
      if (visible) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="waveStroke" x1="0" x2="1">
          <stop offset="0%" stopColor="#7134eb" stopOpacity="0" />
          <stop offset="45%" stopColor="#7134eb" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#16ccc5" stopOpacity="1" />
        </linearGradient>
      </defs>
      {Array.from({ length: LINES }, (_, k) => (
        <path
          key={k}
          ref={(el) => void (paths.current[k] = el)}
          d={pathFor(k, 0)}
          stroke="url(#waveStroke)"
          strokeWidth={k === 2 ? 1.6 : 1}
          strokeOpacity={0.25 + (k === 2 ? 0.6 : 0.08 * k)}
        />
      ))}
    </svg>
  );
}
