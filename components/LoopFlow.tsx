"use client";

import { motion } from "motion/react";

// Animated distribution loop: a pulse travels from the freelancer (A) to the
// client (B) and back — the referral cycle that IS the product.
export default function LoopFlow() {
  return (
    <div className="loop-flow" aria-hidden>
      <motion.span
        className="loop-dot"
        animate={{ left: ["0%", "100%", "0%"] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
