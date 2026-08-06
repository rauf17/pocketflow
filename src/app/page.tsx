"use client";

import { useEffect, useState } from "react";
import { usePocketStore } from "@/store/usePocketStore";
import { LivingFlow } from "@/components/LivingFlow";
import { ExpenseInput } from "@/components/ExpenseInput";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TransactionHistory } from "@/components/TransactionHistory";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { balance, getDaysUntilIncome, getSafeSpendingLimit, getRemainingBudgetToday } = usePocketStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse w-32 h-32 rounded-full bg-primary/10" />
      </main>
    );
  }

  const limit = getSafeSpendingLimit();
  const remaining = getRemainingBudgetToday();
  const days = getDaysUntilIncome();
  const isOverBudget = remaining < 0;

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-background selection:bg-primary/30 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-flow-emerald/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="w-full max-w-md flex justify-between items-center py-4 mt-2 z-10">
        <Button variant="ghost" size="icon" onClick={() => setShowHistory(true)} className="text-muted-foreground hover:text-foreground">
          <History className="w-5 h-5" />
        </Button>
        <div className="text-sm font-medium tracking-wide text-foreground/80 bg-secondary/50 px-4 py-1.5 rounded-full backdrop-blur-md">
          {days} days until income
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <section className="w-full max-w-md flex flex-col items-center mt-12 mb-16 z-10">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-muted-foreground text-lg font-medium mb-4"
        >
          Today&apos;s safe limit
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
          className="mb-6 drop-shadow-sm"
        >
          <AnimatedCounter 
            value={limit} 
            className="text-[72px] font-light tracking-[-0.04em] leading-none text-foreground"
          />
        </motion.div>

        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Remaining today</p>
          <p className={`text-2xl font-medium tracking-tight ${isOverBudget ? 'text-flow-amber' : 'text-flow-emerald'}`}>
            {isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(2)}
          </p>
        </div>
      </section>

      <div className="w-full max-w-2xl z-10 my-4">
        <LivingFlow />
      </div>

      <div className="w-full max-w-md z-10 flex-1">
        <ExpenseInput />
      </div>

      <footer className="w-full max-w-md py-8 flex justify-between items-center text-muted-foreground/60 text-xs mt-auto z-10">
        <span>Balance: ${balance.toFixed(2)}</span>
        <span>PocketFlow OS</span>
      </footer>

      {/* Slide-in Panels */}
      <AnimatePresence>
        {showHistory && <TransactionHistory onClose={() => setShowHistory(false)} />}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </AnimatePresence>

      {/* Dimmed backdrop when a panel is open */}
      <AnimatePresence>
        {(showHistory || showSettings) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowHistory(false); setShowSettings(false); }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>
    </main>
  );
}
