"use client";

import { useRef } from "react";
import { useInView } from "@/hooks/useInView";

interface Props {
  children: React.ReactNode;
  active?: boolean;
  delay?: number;
  /** Start offset in px (spec: 60–80 for cards, ~12 for small strips). */
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
  /** IntersectionObserver rootMargin; the default ignores the bottom 10% of the screen. */
  margin?: string;
}

/** Slide up + fade in (easeOutQuint, 600ms) when scrolled into view or when `active` turns true. */
export function Reveal({ children, active, delay = 0, y = 72, className = "", as: Tag = "div", margin }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, margin ? { rootMargin: margin, threshold: 0.2 } : undefined);
  const go = active ?? seen;
  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-in={go}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms`, ["--reveal-y" as string]: `${y}px` }}
    >
      {children}
    </Tag>
  );
}
