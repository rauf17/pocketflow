"use client";

import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { Brain, TrendingDown, Target, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { differenceInDays, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";

export default function AnalyticsPage() {
  const { expenses } = useExpenseStore();
  const { user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);

  const currentMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), new Date()));
  const totalSpentThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const daysInMonth = differenceInDays(endOfMonth(new Date()), startOfMonth(new Date())) + 1;
  const currentDay = new Date().getDate();
  
  const avgDailySpent = totalSpentThisMonth / currentDay || 0;
  const predictedTotal = avgDailySpent * daysInMonth;

  // Mocked AI Observation (Will hook up to Gemini in Phase 6)
  const aiObservation = predictedTotal > (user?.balance || 0) 
    ? "You are currently trending to exceed your balance before the end of the month by 14%."
    : "Your spending velocity has decreased by 5% this week. Momentum is stable.";

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto pt-12 px-6">
      
      <header className="w-full flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Deep insights and financial momentum.</p>
        </div>
      </header>

      {/* AI Observation Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6 rounded-3xl mb-8 flex items-start gap-4 backdrop-blur-md"
      >
        <div className="p-3 bg-indigo-500/20 rounded-2xl shrink-0">
          <Brain className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-medium uppercase tracking-widest text-indigo-400/80 mb-2">AI Observation</h3>
          <p className="text-lg text-foreground/90 leading-relaxed font-light">{aiObservation}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        
        {/* Insight Card: Avg Daily Spending */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Daily Velocity</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-light text-foreground">{currencySymbol}{avgDailySpent.toFixed(0)}</span>
            <span className="text-sm text-muted-foreground ml-2">/ day avg</span>
          </div>
        </motion.div>

        {/* Insight Card: Predicted Monthly */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Predicted Spend</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-light text-foreground">{currencySymbol}{predictedTotal.toFixed(0)}</span>
            <span className="text-sm text-muted-foreground ml-2">by EOM</span>
          </div>
        </motion.div>

        {/* Insight Card: Most Expensive Day */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingDown className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Costliest Weekday</span>
          </div>
          <div className="mt-auto flex flex-col">
            <span className="text-3xl font-light text-foreground mb-1">Friday</span>
            <span className="text-sm text-muted-foreground">Accounts for 35% of spend</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
