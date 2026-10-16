"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { prefersReducedMotion } from "@/lib/random";

const GLYPHS = "!<>-_\\/[]{}=+*^?#abcdefghijklmnopqrstuvwxyz0123456789";

type Cell = { glyph: string | null; resolved: boolean; dy: number; sy: number };

interface Props {
  text: string;
  /** Start the effect. Omit to start when the element scrolls into view. */
  active?: boolean;
  delay?: number;
  duration?: number;
  /** Letters also stretch and jump while unresolved (section headings). */
  wavy?: boolean;
  className?: string;
}

/**
 * Text scramble: every character cycles through random glyphs and locks into the real
 * letter in random order. Each letter keeps its real width the whole time (the glyph is
 * overlaid on an invisible copy of the real letter), so the line never reflows.
 */
export function Scramble({ text, active, delay = 0, duration = 600, wavy = false, className = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { threshold: 0.3 });
  const go = active ?? seen;
  const [cells, setCells] = useState<Cell[] | null>(null); // null = not started (letters hidden)
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!go || done) return;
    if (prefersReducedMotion()) {
      setDone(true);
      return;
    }
    const chars = [...text];
    const lockAt = chars.map(() => Math.random() * duration);
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now;
      const t = now - start - delay;
      if (t >= 0) {
        setCells(
          chars.map((c, i) => {
            if (c === " " || t >= lockAt[i]) return { glyph: null, resolved: true, dy: 0, sy: 1 };
            if (t < lockAt[i] * 0.4) return { glyph: null, resolved: false, dy: 0, sy: 1 };
            return {
              glyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
              resolved: false,
              dy: wavy ? (Math.random() - 0.5) * 14 : 0,
              sy: wavy ? 1 + Math.random() * 0.7 : 1,
            };
          }),
        );
      }
      if (t < duration) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, done, text, delay, duration, wavy]);

  // group characters into words so a line can only break between words
  const words: { ch: string; i: number }[][] = [];
  let idx = 0;
  for (const word of text.split(" ")) {
    words.push([...word].map((ch) => ({ ch, i: idx++ })));
    idx++; // the space
  }

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden>
          <span className="inline-block whitespace-nowrap">
            {w.map(({ ch, i }) => {
              const cell = done ? null : cells?.[i];
              const visible = done || cell?.resolved;
              return (
                <span key={i} className="relative inline-block">
                  <span style={{ opacity: visible ? 1 : 0 }}>{ch}</span>
                  {!visible && cell?.glyph && (
                    <span
                      className="absolute inset-0 text-center opacity-70"
                      style={{ transform: `translateY(${cell.dy}px) scaleY(${cell.sy})` }}
                    >
                      {cell.glyph}
                    </span>
                  )}
                </span>
              );
            })}
          </span>
          {wi < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
