"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { prefersReducedMotion } from "@/lib/random";

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
  delay?: number;
  active?: boolean;
  className?: string;
}

/** Counts from 0 to `value` with an ease-out curve (~0.7s) once visible; restarts when `value` changes. */
export function CountUp({ value, format, duration = 700, delay = 0, active, className = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { threshold: 0.3 });
  const go = active ?? seen;
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!go) return;
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now;
      const t = Math.min(1, Math.max(0, (now - start - delay) / duration));
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{format(shown ?? 0)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
