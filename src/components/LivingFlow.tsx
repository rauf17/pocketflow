"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { startOfDay, differenceInDays } from "date-fns";

export function LivingFlow({ profileType = 'normal' }: { profileType?: string }) {
  const { user, income } = useUserStore();
  const { expenses } = useExpenseStore();
  const [mounted, setMounted] = useState(false);
  
  const rippleControls = useAnimation();
  
  // To track expenses length for ripple
  const prevExpensesLength = useRef(expenses.length);

  const getSafeSpendingLimit = () => {
    if (!user || !income) return 0;
    const today = startOfDay(new Date());
    const incomeDate = startOfDay(new Date(income.nextDate));
    const days = Math.max(0, differenceInDays(incomeDate, today));
    return days === 0 ? user.balance : user.balance / days;
  };

  const getRemainingBudgetToday = () => {
    const limit = getSafeSpendingLimit();
    const today = startOfDay(new Date());
    const expensesToday = expenses
      .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
      .reduce((sum, e) => sum + e.amount, 0);
    return limit - expensesToday;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Ripple on Expense
  useEffect(() => {
    if (mounted && expenses.length > prevExpensesLength.current) {
      // New expense added -> trigger ripple & trajectory shake
      const triggerRipple = async () => {
        rippleControls.set({ scale: 0, opacity: 0.8, cx: "50%", cy: "50%" });
        rippleControls.start({
          scale: [0, 4, 10],
          opacity: [0.8, 0.4, 0],
          transition: { duration: 1.2, ease: "easeOut" }
        });
      };
      triggerRipple();
    }
    prevExpensesLength.current = expenses.length;
  }, [expenses.length, mounted, rippleControls]);

  if (!mounted) {
    return <div className="h-32 w-full" />; // Hydration placeholder
  }

  const remaining = getRemainingBudgetToday();
  const limit = getSafeSpendingLimit();
  
  // Determine if under or over budget
  const ratio = limit > 0 ? remaining / limit : 0;
  const isOverBudget = remaining < 0;

  // The Living Flow is an SVG that dynamically shapes itself
  // based on the financial health ratio.
  const color = isOverBudget ? "text-flow-amber" : "text-flow-emerald";

  // Dynamic Trajectory Generation
  // When healthy (ratio ~ 1), path flows upwards and smooth.
  // When over budget, path dips downwards.
  
  // Base coordinates
  const startY = 80;
  const endY = isOverBudget ? 90 : 20; 
  const midY1 = isOverBudget ? 95 : (40 + (1 - ratio) * 40);
  const midY2 = isOverBudget ? 100 : (30 + (1 - ratio) * 50);

  // Smooth path
  const smoothPath = `M0,${startY} C250,${midY1} 400,${midY2} 1000,${endY}`;
  // Breathing variation (slightly higher/lower)
  const breathePath = `M0,${startY} C250,${midY1 - 5} 400,${midY2 + 5} 1000,${endY}`;

  const baseDuration = profileType === 'safe' ? 6 : profileType === 'high' ? 2 : 4;
  
  return (
    <div className="relative w-full h-32 overflow-hidden flex items-center justify-center pointer-events-none group">
      {/* Background ambient glow */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isOverBudget ? 'from-flow-amber/5' : 'from-flow-emerald/5'} to-transparent z-10 transition-colors duration-1000`} />
      
      <svg
        viewBox="0 0 1000 150"
        preserveAspectRatio="none"
        className={`w-full h-full ${color} mix-blend-screen drop-shadow-2xl z-20 transition-colors duration-700`}
      >
        <defs>
          <linearGradient id="flow-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Core animated line */}
        <motion.path
          d={smoothPath}
          animate={{ d: [smoothPath, breathePath, smoothPath] }}
          transition={{ duration: baseDuration, repeat: Infinity, ease: "easeInOut" }}
          fill="none"
          stroke="url(#flow-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#glow)"
        />

        {/* Ambient shadow line for depth */}
        <motion.path
          d={smoothPath}
          animate={{ d: [smoothPath, breathePath, smoothPath] }}
          transition={{ duration: baseDuration, repeat: Infinity, ease: "easeInOut" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className="opacity-10 blur-md"
        />

        {/* Ripple Effect (Triggered on Expense) */}
        <motion.circle
          cx="500" // Will be set to 50% dynamically, or specific coordinate
          cy="50"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={rippleControls}
          className="origin-center"
        />
      </svg>
    </div>
  );
}
