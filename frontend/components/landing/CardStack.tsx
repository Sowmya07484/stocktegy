"use client";

import { Children, useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/random";

/**
 * Card-over-card scrolling. Each section sticks, and as the next one slides up over it the
 * outgoing section scales to 0.95 and dims by 40% (a dark overlay, so cards stacked behind
 * never show through). Sections taller than the viewport stick by their bottom edge so none
 * of their content is skipped.
 */
export function CardStack({ children }: { children: React.ReactNode }) {
  const outer = useRef<(HTMLDivElement | null)[]>([]);
  const inner = useRef<(HTMLDivElement | null)[]>([]);
  const shade = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const animate = !prefersReducedMotion();
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      outer.current.forEach((el, i) => {
        if (!el) return;
        el.style.top = `${Math.min(0, vh - el.offsetHeight)}px`;
        const next = outer.current[i + 1];
        const body = inner.current[i];
        const dim = shade.current[i];
        if (!animate || !next || !body || !dim) return;
        const p = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh));
        body.style.transform = p > 0 ? `scale(${1 - 0.05 * p})` : "";
        dim.style.opacity = String(0.4 * p);
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <>
      {Children.toArray(children).map((child, i) => (
        <div key={i} ref={(el) => void (outer.current[i] = el)} className="sticky top-0" style={{ zIndex: i + 1 }}>
          <div ref={(el) => void (inner.current[i] = el)} className="relative origin-top will-change-transform [&>section]:min-h-[100svh]">
            {child}
            <div
              ref={(el) => void (shade.current[i] = el)}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-t-[40px] bg-black opacity-0"
            />
          </div>
        </div>
      ))}
    </>
  );
}
