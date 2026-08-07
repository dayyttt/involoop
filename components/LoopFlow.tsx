"use client";

import { motion } from "motion/react";

// Animated distribution loop: a pulse travels from the freelancer (A) to the
// client (B) and back — the referral cycle that IS the product.
//
// The vertical variant is a real vertical element, not a horizontal one rotated
// 90°. A rotated bar keeps its original 130×2 layout box, so it reserved a wide
// flat strip and then drew itself across whatever happened to be beside it.
export default function LoopFlow({ vertical = false }: { vertical?: boolean }) {
  return (
    <div className={`loop-flow${vertical ? " loop-flow-v" : ""}`} aria-hidden>
      <motion.span
        className="loop-dot"
        animate={vertical ? { top: ["0%", "100%", "0%"] } : { left: ["0%", "100%", "0%"] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
