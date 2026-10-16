"use client";

import { useMemo, useRef } from "react";
import { useInView } from "@/hooks/useInView";
import { hashString, mulberry32 } from "@/lib/random";

interface Props {
  text: string;
  active?: boolean;
  delay?: number;
  /** Letters appear at random times spread over this many ms. */
  spread?: number;
  className?: string;
}

/** Per-letter random reveal: letters fade in in random order (no glyph swapping). */
export function LetterReveal({ text, active, delay = 0, spread = 650, className = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { threshold: 0.3 });
  const go = active ?? seen;

  // seeded by the text so server and client agree on the delays
  const delays = useMemo(() => {
    const rand = mulberry32(hashString(text));
    return [...text].map(() => Math.round(delay + rand() * spread));
  }, [text, delay, spread]);

  const words: { ch: string; i: number }[][] = [];
  let idx = 0;
  for (const word of text.split(" ")) {
    words.push([...word].map((ch) => ({ ch, i: idx++ })));
    idx++;
  }

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden>
          <span className="inline-block whitespace-nowrap">
            {w.map(({ ch, i }) => (
              <span
                key={i}
                className="transition-opacity duration-300 ease-out"
                style={{ opacity: go ? 1 : 0, transitionDelay: go ? `${delays[i]}ms` : "0ms" }}
              >
                {ch}
              </span>
            ))}
          </span>
          {wi < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
