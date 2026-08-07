"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// Clean word rotator: old word blurs out, new word blurs in, same position.
// Fixed width reserves space so the line never reflows.
export default function RotatingWord({
  words,
  interval = 2400,
  wordClass = "",
}: {
  words: string[];
  interval?: number;
  wordClass?: string;
}) {
  const [index, setIndex] = useState(0);
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) return;
    const id = setInterval(() => {
      setRotated(true);
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  // No aria-live: announcing a new phrase every couple of seconds turns the
  // headline into noise for screen readers. The current phrase is read once,
  // as part of the sentence around it.
  return (
    <span className="rot-word">
      {/* initial={false}: the first phrase is part of the headline, so it must
          be painted straight away instead of starting at opacity 0. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className={wordClass}
          // The first phrase is part of the headline the server sends, so it
          // must not start hidden. Only later phrases fade in.
          initial={rotated ? { opacity: 0, filter: "blur(5px)" } : false}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(5px)" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ display: "inline-block" }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
