"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

interface RotatingTextProps {
  texts: string[];
  transition?: Record<string, unknown>;
  initial?: { y: string; opacity: number };
  animate?: { y: number; opacity: number };
  exit?: { y: string; opacity: number };
  animatePresenceMode?: "wait" | "sync" | "popLayout";
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random";
  loop?: boolean;
  auto?: boolean;
  splitBy?: string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>((props, ref) => {
  const {
    texts,
    transition = { type: "spring", damping: 25, stiffness: 300 },
    initial = { y: "100%", opacity: 0 },
    animate = { y: 0, opacity: 1 },
    exit = { y: "-120%", opacity: 0 },
    animatePresenceMode = "wait",
    animatePresenceInitial = false,
    rotationInterval = 2000,
    staggerDuration = 0,
    staggerFrom = "first",
    loop = true,
    auto = true,
    splitBy = "characters",
    onNext,
    mainClassName,
    splitLevelClassName,
    elementLevelClassName,
  } = props;

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const splitIntoCharacters = (text: string) => {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), (segment) => segment.segment);
    }
    return Array.from(text);
  };

  const elements = useMemo(() => {
    const currentText = texts[currentTextIndex];
    return splitBy === "characters"
      ? splitIntoCharacters(currentText).map((ch, i) => ({
          char: ch,
          id: `${i}-${ch}`,
        }))
      : currentText.split(" ").map((word, i) => ({
          char: word,
          id: `${i}-${word}`,
        }));
  }, [currentTextIndex, splitBy, texts]);

  const getStaggerDelay = useCallback(
    (index: number, totalChars: number) => {
      const total = totalChars;
      if (staggerFrom === "first") return index * staggerDuration;
      if (staggerFrom === "last") return (total - 1 - index) * staggerDuration;
      if (staggerFrom === "center") {
        const center = Math.floor(total / 2);
        return Math.abs(center - index) * staggerDuration;
      }
      if (staggerFrom === "random") {
        const randomIndex = Math.floor(Math.random() * total);
        return Math.abs(randomIndex - index) * staggerDuration;
      }
      return index * staggerDuration;
    },
    [staggerFrom, staggerDuration]
  );

  const handleNext = useCallback(() => {
    setCurrentTextIndex((prev) => (prev === texts.length - 1 ? (loop ? 0 : prev) : prev + 1));
  }, [texts, loop]);

  const handlePrevious = useCallback(() => {
    setCurrentTextIndex((prev) => (prev === 0 ? (loop ? texts.length - 1 : prev) : prev - 1));
  }, [texts, loop]);

  const handleJumpTo = useCallback((index: number) => {
    setCurrentTextIndex(index);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentTextIndex(0);
  }, []);

  useImperativeHandle(ref, () => ({
    next: handleNext,
    previous: handlePrevious,
    jumpTo: handleJumpTo,
    reset: handleReset,
  }));

  useEffect(() => {
    if (!auto) return;
    const intervalId = setInterval(handleNext, rotationInterval);
    return () => clearInterval(intervalId);
  }, [auto, rotationInterval, handleNext]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!loop && currentTextIndex === texts.length - 1) return;
      onNext?.(currentTextIndex);
    }, rotationInterval);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, currentTextIndex, texts.length, rotationInterval, onNext]);

  return (
    <span
      className={cn(mainClassName)}
      style={{
        display: "flex",
        flexWrap: "wrap",
        whiteSpace: "pre-wrap",
        position: "relative",
        textAlign: "left",
        justifyContent: "flex-start",
      }}
    >
      <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {texts[currentTextIndex]}
      </span>
      <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
        <motion.span key={currentTextIndex} aria-hidden="true">
          {elements.map((wordObj, wordIndex, array) => {
            const previousCharsCount = array.slice(0, wordIndex).reduce((sum, word) => sum + word.char.length, 0);
            return (
              <span key={wordIndex} className={cn("text-rotate-word", splitLevelClassName)}>
                {splitBy === "characters" ? (
                  wordObj.char.split("").map((char, charIndex) => (
                    <motion.span
                      key={charIndex}
                      initial={initial}
                      animate={animate}
                      exit={exit}
                      transition={{
                        ...transition,
                        delay: getStaggerDelay(
                          previousCharsCount + charIndex,
                          array.reduce((sum, word) => sum + word.char.length, 0)
                        ),
                      }}
                      className={cn("text-rotate-element", elementLevelClassName)}
                    >
                      {char}
                    </motion.span>
                  ))
                ) : (
                  <motion.span
                    initial={initial}
                    animate={animate}
                    exit={exit}
                    transition={{
                      ...transition,
                      delay: getStaggerDelay(wordIndex, array.length),
                    }}
                    className={cn("text-rotate-element", elementLevelClassName)}
                  >
                    {wordObj.char}
                  </motion.span>
                )}
              </span>
            );
          })}
        </motion.span>
      </AnimatePresence>
    </span>
  );
});

RotatingText.displayName = "RotatingText";
export default RotatingText;
