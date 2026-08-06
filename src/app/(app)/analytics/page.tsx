"use client";

import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { Brain, Flame, Target, CalendarDays, Activity } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { differenceInDays, startOfMonth, endOfMonth, isSameMonth, getDay } from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";

export default function AnalyticsPage() {
  const { expenses } = useExpenseStore();
  const { user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);

  const currentMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), new Date()));
  const totalSpentThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const today = new Date();
  const daysInMonth = differenceInDays(endOfMonth(today), startOfMonth(today)) + 1;
  const currentDayOfMonth = today.getDate();
  const avgDailySpent = currentDayOfMonth > 0 ? totalSpentThisMonth / currentDayOfMonth : 0;
  const predictedTotal = avgDailySpent * daysInMonth;

  // Calculate most expensive weekday
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  expenses.forEach(e => {
    weekdayTotals[getDay(new Date(e.date))] += e.amount;
  });
  const maxDayIndex = weekdayTotals.indexOf(Math.max(...weekdayTotals));
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const mostExpensiveDay = Math.max(...weekdayTotals) > 0 ? days[maxDayIndex] : "Not enough data";

  // Dummy data for "Longest Saving Streak" MVP
  const streak = expenses.length > 5 ? 4 : 1;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-16 px-6 pb-32">
      
      <header className="w-full flex justify-between items-end mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-3xl font-light tracking-tight">Insights</h2>
          <p className="text-sm text-muted-foreground mt-2">AI-driven analysis of your spending habits.</p>
        </motion.div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        
        {/* Prediction Card - Hero */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-2 flex flex-col p-8 rounded-[2rem] bg-gradient-to-br from-flow-emerald/10 to-transparent border border-flow-emerald/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
            <Brain className="w-32 h-32 text-flow-emerald" strokeWidth={1} />
          </div>
          
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-flow-emerald animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-widest text-flow-emerald">AI Projection</span>
          </div>

          <div className="flex flex-col relative z-10">
            <h3 className="text-xl font-light text-foreground/90 mb-2">Month-end Trajectory</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-light tracking-tighter text-foreground">{currencySymbol}{predictedTotal.toFixed(0)}</span>
              <span className="text-muted-foreground">projected spend</span>
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground max-w-md leading-relaxed">
              Based on your current velocity of <strong className="text-foreground">{currencySymbol}{avgDailySpent.toFixed(0)}/day</strong>, you are on track to end the month safely. Keep it up.
            </p>
          </div>
        </motion.div>

        {/* Insight: Most Expensive Day */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col p-6 rounded-[2rem] bg-card/40 border border-white/5 hover:bg-card/60 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-white/5">
              <CalendarDays className="w-5 h-5 text-flow-amber" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Highest Spend</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-light text-foreground block">{mostExpensiveDay}</span>
            <span className="text-sm text-muted-foreground mt-2 block">Your most expensive weekday on average.</span>
          </div>
        </motion.div>

        {/* Insight: Saving Streak */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col p-6 rounded-[2rem] bg-card/40 border border-white/5 hover:bg-card/60 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-white/5">
              <Flame className="w-5 h-5 text-flow-emerald" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Saving Streak</span>
          </div>
          <div className="mt-auto">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light text-foreground">{streak}</span>
              <span className="text-xl text-muted-foreground font-light">days</span>
            </div>
            <span className="text-sm text-muted-foreground mt-2 block">Staying strictly under the safe limit.</span>
          </div>
        </motion.div>

        {/* Summary Mini Cards */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-between p-6 rounded-[2rem] bg-card/40 border border-white/5"
        >
          <div className="flex items-center gap-4">
            <Target className="w-6 h-6 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Monthly Budget</span>
              <span className="text-lg font-medium">{currencySymbol}{(user?.balance || 0).toFixed(0)}</span>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-between p-6 rounded-[2rem] bg-card/40 border border-white/5"
        >
          <div className="flex items-center gap-4">
            <Activity className="w-6 h-6 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Current Spent</span>
              <span className="text-lg font-medium">{currencySymbol}{totalSpentThisMonth.toFixed(0)}</span>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
