"use client";

import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { getCurrencySymbol } from "@/lib/utils";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ExpenseInput } from "@/components/ExpenseInput";
import { motion } from "framer-motion";
import { differenceInDays, startOfDay, isBefore, isEqual } from "date-fns";

export default function DashboardPage() {
  const { user, income } = useUserStore();
  const { expenses } = useExpenseStore();
  const { recurringBudgets } = useBudgetStore();

  if (!user || !income) return null;

  // Recalculate metrics
  const today = startOfDay(new Date());
  const incomeDate = startOfDay(new Date(income.nextDate));
  
  let daysUntilIncome = differenceInDays(incomeDate, today);
  if (daysUntilIncome < 0) daysUntilIncome = 0; // Or handle next month logic

  // Upcoming Bills
  let upcomingBillsTotal = 0;
  recurringBudgets.forEach(bill => {
    // Basic logic for daily/weekly/monthly
    // For MVP, just assume we reserve cash for all of them if due before next payday
    const billDate = startOfDay(new Date(bill.nextDueDate));
    if (isBefore(billDate, incomeDate) || isEqual(billDate, incomeDate)) {
      upcomingBillsTotal += bill.amount;
    }
  });

  const safeBalance = Math.max(0, user.balance - upcomingBillsTotal);
  const safeLimit = daysUntilIncome === 0 ? safeBalance : safeBalance / daysUntilIncome;

  const expensesToday = expenses
    .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
    .reduce((sum, e) => sum + e.amount, 0);

  const remainingToday = safeLimit - expensesToday;
  const isOverBudget = remainingToday < 0;
  const currencySymbol = getCurrencySymbol(user.currency);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto pt-12 px-6">
      
      <header className="w-full flex justify-between items-center mb-12">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        <div className="text-xs font-medium tracking-wide text-foreground/80 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
          {daysUntilIncome} days to income
        </div>
      </header>
      
      <div className="flex flex-col items-center text-center space-y-12 w-full">
        
        {/* Main Metric: Safe to Spend Today */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-4">Safe to Spend Today</span>
          
          <div className="flex items-center gap-4 group cursor-pointer relative">
            <span className={`text-xl font-medium ${isOverBudget ? 'text-flow-amber' : 'text-flow-emerald'}`}>
              {remainingToday < 0 ? "-" : "+"}{currencySymbol}{Math.abs(remainingToday).toFixed(2)}
            </span>
            <AnimatedCounter 
              value={safeLimit} 
              symbol={currencySymbol}
              className="text-7xl md:text-8xl font-light tracking-tighter"
            />
          </div>
        </motion.div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center p-6 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-sm"
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Total Balance</span>
            <span className="text-2xl font-light">
              {currencySymbol}{user.balance.toFixed(2)}
            </span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center p-6 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-sm"
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Upcoming Bills</span>
            <span className="text-2xl font-light">
              {currencySymbol}{upcomingBillsTotal.toFixed(2)}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="w-full mt-4">
        <ExpenseInput />
      </div>

    </div>
  );
}
