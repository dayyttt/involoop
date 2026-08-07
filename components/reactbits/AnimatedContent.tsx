"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Travel distance in px. Kept small on purpose: long slides read as filler. */
  distance?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  duration?: number;
  delay?: number;
  /** Fraction of the element that must be visible before it plays. */
  threshold?: number;
  as?: "div" | "section" | "article";
}

// Scroll reveal, same API as the React Bits component of this name, rebuilt for
// this codebase. Two things are deliberately different:
//
//   1. It degrades safely. React Bits ships the wrapper with
//      `visibility: hidden` and the naive motion port renders `opacity: 0` into
//      the HTML — either way a failed or blocked bundle leaves whole sections
//      of the page blank. Here the hidden state only applies under `html.js`,
//      a class set by an inline script, so without JavaScript every section is
//      simply visible.
//   2. It animates in CSS rather than per-frame in JS. Two dozen reveals on one
//      page is real work to hand to the main thread for no visual gain.
export default function AnimatedContent({
  children,
  className = "",
  style,
  distance = 14,
  direction = "vertical",
  reverse = false,
  duration = 0.5,
  delay = 0,
  threshold = 0.15,
  as: Tag = "div",
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const offset = `${reverse ? -distance : distance}px`;

  return (
    <Tag
      ref={ref as never}
      className={`reveal${shown ? " reveal-in" : ""}${className ? ` ${className}` : ""}`}
      style={
        {
          "--reveal-x": direction === "horizontal" ? offset : "0px",
          "--reveal-y": direction === "horizontal" ? "0px" : offset,
          "--reveal-duration": `${duration}s`,
          "--reveal-delay": `${delay}s`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
