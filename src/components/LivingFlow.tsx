"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePocketStore } from "@/store/usePocketStore";

export function LivingFlow() {
  const { getRemainingBudgetToday, getSafeSpendingLimit } = usePocketStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-24 w-full" />; // Placeholder to avoid hydration mismatch
  }

  const remaining = getRemainingBudgetToday();
  
  // Determine if under or over budget
  const isOverBudget = remaining < 0;

  // The Living Flow is a bezier curve.
  // We'll animate its d attribute slightly for a breathing effect.
  // When over budget, we create a dip in the curve.
  
  const color = isOverBudget ? "text-flow-amber" : "text-flow-emerald";

  // Base paths
  const smoothPath = "M0,50 Q250,40 500,50 T1000,50";
  const breathePath = "M0,50 Q250,60 500,50 T1000,50";
  
  // Dip paths for over budget
  const dipPath = "M0,50 Q250,90 500,50 T1000,50";
  const dipBreathePath = "M0,50 Q250,80 500,50 T1000,50";

  return (
    <div className="relative w-full h-24 overflow-hidden flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
      <motion.svg
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        className={`w-full h-full ${color} opacity-80 mix-blend-screen drop-shadow-xl`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <motion.path
          d={isOverBudget ? dipPath : smoothPath}
          animate={{
            d: isOverBudget ? [dipPath, dipBreathePath, dipPath] : [smoothPath, breathePath, smoothPath],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Glow effect */}
        <motion.path
          d={isOverBudget ? dipPath : smoothPath}
          animate={{
            d: isOverBudget ? [dipPath, dipBreathePath, dipPath] : [smoothPath, breathePath, smoothPath],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
          className="opacity-20 blur-sm"
        />
      </motion.svg>
    </div>
  );
}
