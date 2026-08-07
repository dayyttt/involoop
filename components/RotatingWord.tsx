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

  useEffect(() => {
    const id = setInterval(() => setIndex((prev) => (prev + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className="rot-word" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          className={wordClass}
          initial={{ opacity: 0, filter: "blur(5px)" }}
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
