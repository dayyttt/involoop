"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

// Clean phrase rotator: the old phrase blurs out, the new one blurs in.
//
// The phrases have different lengths, so a naive swap reflows the headline and
// shoves everything below it up and down every couple of seconds. To stop that,
// an invisible copy of the longest phrase holds the space at whatever the
// current viewport makes it, and the animated phrase sits on top of it.
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

  const longest = useMemo(
    () => words.reduce((a, b) => (b.length > a.length ? b : a), words[0] ?? ""),
    [words]
  );

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
      <span className="rot-word-sizer" aria-hidden>
        {longest}
      </span>
      {/* No mode="wait": waiting for the old phrase to leave before the new one
          arrives left the headline reading "Your next invoice is" with nothing
          after it for almost half a second, every rotation. The phrases are
          stacked on the sizer, so they can simply cross-fade.
          initial={false}: the first phrase is part of the headline the server
          sends, so it must be painted straight away, not faded in. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={words[index]}
          className={`rot-word-phrase ${wordClass}`}
          initial={rotated ? { opacity: 0, filter: "blur(5px)" } : false}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(5px)" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
