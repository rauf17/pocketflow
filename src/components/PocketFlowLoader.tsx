"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { PocketFlowLogo } from "./PocketFlowLogo";

interface PocketFlowLoaderProps {
  onComplete?: () => void;
  minDuration?: number; // Minimum display time in ms (default 1800ms)
}

export function PocketFlowLoader({ onComplete, minDuration = 1800 }: PocketFlowLoaderProps) {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"particles" | "logo" | "wordmark" | "done">("particles");

  useEffect(() => {
    if (shouldReduceMotion) {
      setPhase("done");
      if (onComplete) onComplete();
      return;
    }

    // Step sequence
    const t1 = setTimeout(() => setPhase("logo"), 250);
    const t2 = setTimeout(() => setPhase("wordmark"), 850);
    const t3 = setTimeout(() => {
      setPhase("done");
      if (onComplete) onComplete();
    }, minDuration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [minDuration, onComplete, shouldReduceMotion]);

  // Particles positioning (scattered around center)
  const particles = [
    { id: 1, startX: -60, startY: -40, delay: 0 },
    { id: 2, startX: 70, startY: -30, delay: 0.05 },
    { id: 3, startX: -50, startY: 50, delay: 0.1 },
    { id: 4, startX: 65, startY: 45, delay: 0.08 },
    { id: 5, startX: 0, startY: -70, delay: 0.02 },
    { id: 6, startX: 0, startY: 65, delay: 0.12 },
  ];

  if (shouldReduceMotion) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <PocketFlowLogo className="w-10 h-10" />
          <span className="text-2xl font-light tracking-tight text-foreground">PocketFlow</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === "done" ? 0 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background select-none overflow-hidden"
    >
      {/* Background ambient glow */}
      <div className="absolute w-72 h-72 rounded-full bg-flow-emerald/5 blur-[100px] pointer-events-none" />

      {/* Main stage */}
      <div className="relative flex items-center justify-center">

        {/* Phase 2 & 3: Converging particles */}
        {phase === "particles" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{
                  x: p.startX,
                  y: p.startY,
                  opacity: 0,
                  scale: 0.6,
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: [0, 0.8, 0],
                  scale: [0.6, 1, 0.2],
                }}
                transition={{
                  duration: 0.7,
                  delay: p.delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute w-2 h-2 rounded-full bg-flow-emerald shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              />
            ))}
          </div>
        )}

        {/* Phase 4, 5, 6: Logo & Signature Trajectory Signal */}
        <div className="flex items-center gap-3.5 z-10">
          {/* Logo container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: phase !== "particles" ? 1 : 0,
              scale: phase !== "particles" ? 1 : 0.92,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex items-center justify-center"
          >
            {/* Base Logo */}
            <PocketFlowLogo className="w-10 h-10 md:w-12 md:h-12" />

            {/* Signature Flow Motion Signal Overlay */}
            {phase !== "particles" && (
              <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-10 h-10 md:w-12 md:h-12 pointer-events-none"
              >
                {/* Trajectory signal traveling along open bowl: M28 22 C58 14 78 28 72 48 C66 64 46 68 86 36 */}
                <motion.path
                  d="M28 22 C58 14 78 28 72 48 C66 64 46 68 86 36"
                  stroke="hsl(var(--brand-flow-emerald))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1] }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Terminus Ripple when signal reaches dot at (86, 36) */}
                <motion.circle
                  cx="86"
                  cy="36"
                  r="7"
                  fill="none"
                  stroke="hsl(var(--brand-flow-emerald))"
                  strokeWidth="2"
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{
                    scale: [1, 2.2, 3],
                    opacity: [0, 0.7, 0],
                  }}
                  transition={{ duration: 0.6, delay: 0.65, ease: "easeOut" }}
                />
              </svg>
            )}
          </motion.div>

          {/* Phase 6: Wordmark Reveal */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: phase === "wordmark" || phase === "done" ? 1 : 0,
              x: phase === "wordmark" || phase === "done" ? 0 : -10,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden flex items-center"
          >
            <span className="text-2xl md:text-3xl font-light tracking-tight text-foreground">
              PocketFlow
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
