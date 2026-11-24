"use client";

import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { useBalance } from "@/store/useBalance";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Brain, Flame, Target, CalendarDays, Activity, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { motion, Variants } from "framer-motion";
import {
  differenceInDays,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  subMonths,
  getDay,
  isAfter,
  endOfDay,
  startOfDay,
  subDays,
  formatISO
} from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";

export default function AnalyticsPage() {
  const { expenses } = useExpenseStore();
  const { user } = useUserStore();
  const balance = useBalance();
  const { categories, recurringBudgets } = useBudgetStore();
  const { goals } = useGoalStore();
  const { profiles, weeklyPlan } = useProfileStore();

  const currencySymbol = getCurrencySymbol(user?.currency);
  const today = new Date();

  // ─── 1. Current & Previous Month Expenses ────────────────────────────────────
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return isSameMonth(d, today) && !isAfter(d, endOfDay(today));
  });
  const totalSpentThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const lastMonthDate = subMonths(today, 1);
  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return isSameMonth(d, lastMonthDate);
  });
  const totalSpentLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // ─── 2. Month-end Trajectory & Velocity ─────────────────────────────────────
  const daysInMonth = differenceInDays(endOfMonth(today), startOfMonth(today)) + 1;
  const currentDayOfMonth = today.getDate();
  const avgDailySpent = currentDayOfMonth > 0 ? totalSpentThisMonth / currentDayOfMonth : 0;
  const predictedTotal = avgDailySpent * daysInMonth;

  // Monthly Budget / Spendable Balance calculation
  const upcomingBillsTotal = recurringBudgets.reduce((sum, b) => sum + b.amount, 0);
  const goalsReservedTotal = goals.reduce((sum, g) => sum + Math.max(0, g.targetAmount - g.currentSaved), 0);
  const spendableBalance = Math.max(0, balance - upcomingBillsTotal - goalsReservedTotal);
  const monthlyBudget = spendableBalance > 0 ? spendableBalance : balance;

  // Trajectory Status Determination
  let trajectoryStatus: "no-data" | "on-track" | "warning" | "exceeded" | "no-budget" = "on-track";
  let trajectoryMessage = "";

  if (totalSpentThisMonth === 0) {
    trajectoryStatus = "no-data";
    trajectoryMessage = "No spending recorded this month yet. Your daily allowance is active.";
  } else if (monthlyBudget > 0) {
    if (totalSpentThisMonth > monthlyBudget) {
      trajectoryStatus = "exceeded";
      const exceededBy = totalSpentThisMonth - monthlyBudget;
      trajectoryMessage = `You have already exceeded your monthly budget of ${currencySymbol}${Math.round(monthlyBudget).toLocaleString()} by ${currencySymbol}${Math.round(exceededBy).toLocaleString()}.`;
    } else if (predictedTotal > monthlyBudget) {
      trajectoryStatus = "warning";
      const overspendProjected = predictedTotal - monthlyBudget;
      trajectoryMessage = `Based on your current velocity of ${currencySymbol}${Math.round(avgDailySpent).toLocaleString()}/day, you are projected to exceed your budget by ${currencySymbol}${Math.round(overspendProjected).toLocaleString()} at month-end.`;
    } else {
      trajectoryStatus = "on-track";
      trajectoryMessage = `Based on your current velocity of ${currencySymbol}${Math.round(avgDailySpent).toLocaleString()}/day, you are on track to stay within your monthly budget of ${currencySymbol}${Math.round(monthlyBudget).toLocaleString()}.`;
    }
  } else {
    trajectoryStatus = "no-budget";
    trajectoryMessage = `Based on your current velocity of ${currencySymbol}${Math.round(avgDailySpent).toLocaleString()}/day, your projected total spend for this month is ${currencySymbol}${Math.round(predictedTotal).toLocaleString()}.`;
  }

  // ─── 3. Most Expensive Weekday ───────────────────────────────────────────────
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

  expenses.forEach(e => {
    const dayIdx = getDay(new Date(e.date));
    weekdayTotals[dayIdx] += e.amount;
    weekdayCounts[dayIdx] += 1;
  });

  const maxWeekdayTotal = Math.max(...weekdayTotals);
  const maxDayIndex = weekdayTotals.indexOf(maxWeekdayTotal);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const mostExpensiveDay = maxWeekdayTotal > 0 ? days[maxDayIndex] : "Not enough data";
  const avgOnMaxDay = maxDayIndex !== -1 && weekdayCounts[maxDayIndex] > 0
    ? Math.round(weekdayTotals[maxDayIndex] / weekdayCounts[maxDayIndex])
    : 0;

  // ─── 4. Saving Streak Calculation ──────────────────────────────────────────
  // Compute daily safe limit helper based on DayProfile
  const getDailySafeLimit = (date: Date): number => {
    const dayOfWeek = getDay(date);
    const profileId = weeklyPlan[dayOfWeek] || 'normal-day';
    const profile = profiles.find(p => p.id === profileId);
    const baseExpected = profile?.expectedSpend ?? 400;

    // Scale profile if budget/spendable balance is configured
    const totalWeeklyExpected = Object.values(weeklyPlan).reduce((sum, pId) => {
      const p = profiles.find(pr => pr.id === pId);
      return sum + (p?.expectedSpend ?? 400);
    }, 0);

    if (spendableBalance > 0 && totalWeeklyExpected > 0) {
      const scalingFactor = spendableBalance / (totalWeeklyExpected * 4);
      return Math.max(100, Math.round(baseExpected * scalingFactor));
    }
    return baseExpected > 0 ? baseExpected : 500;
  };

  // Group expenses by date (YYYY-MM-DD)
  const expensesByDate: Record<string, number> = {};
  expenses.forEach(e => {
    const key = formatISO(startOfDay(new Date(e.date)), { representation: 'date' });
    expensesByDate[key] = (expensesByDate[key] || 0) + e.amount;
  });

  let streak = 0;
  if (expenses.length > 0) {
    let checkDate = startOfDay(today);
    let isStreakActive = true;

    // Days before the first recorded expense are not "days within budget" — the user
    // wasn't tracking yet — so the streak can never reach back past that day.
    const firstTracked = expenses.reduce((min, e) => {
      const t = startOfDay(new Date(e.date)).getTime();
      return isNaN(t) ? min : Math.min(min, t);
    }, Infinity);

    // Check consecutive days starting from today going backward
    while (isStreakActive && checkDate.getTime() >= firstTracked) {
      const key = formatISO(checkDate, { representation: 'date' });
      const spentOnDay = expensesByDate[key] || 0;
      const limitOnDay = getDailySafeLimit(checkDate);

      if (spentOnDay <= limitOnDay) {
        streak++;
        checkDate = subDays(checkDate, 1);
        // Limit max historical check window to prevent infinite loops (365 days max)
        if (streak >= 365) break;
      } else {
        isStreakActive = false;
      }
    }
  }

  // ─── 5. Month-over-Month Comparison ───────────────────────────────────────
  let momLabel = "";
  let momSubtext = "";
  let momTrend: "up" | "down" | "neutral" = "neutral";

  if (totalSpentLastMonth > 0) {
    const diff = totalSpentThisMonth - totalSpentLastMonth;
    const momPct = Math.round((Math.abs(diff) / totalSpentLastMonth) * 100);

    if (diff > 0) {
      momLabel = `+${momPct}%`;
      momSubtext = `${momPct}% higher spend than last month (${currencySymbol}${totalSpentLastMonth.toLocaleString()})`;
      momTrend = "up";
    } else if (diff < 0) {
      momLabel = `-${momPct}%`;
      momSubtext = `${momPct}% lower spend than last month (${currencySymbol}${totalSpentLastMonth.toLocaleString()})`;
      momTrend = "down";
    } else {
      momLabel = "0%";
      momSubtext = `Identical spend to last month (${currencySymbol}${totalSpentLastMonth.toLocaleString()})`;
      momTrend = "neutral";
    }
  } else if (totalSpentThisMonth > 0) {
    momLabel = "100%";
    momSubtext = "First active month of recorded spending";
    momTrend = "up";
  } else {
    momLabel = "0%";
    momSubtext = "No spending recorded in recent months";
    momTrend = "neutral";
  }

  // ─── 6. Top Category Breakdown ─────────────────────────────────────────────
  const categoryMap: Record<string, number> = {};
  currentMonthExpenses.forEach(e => {
    const catId = e.categoryId || 'uncategorized';
    categoryMap[catId] = (categoryMap[catId] || 0) + e.amount;
  });

  let topCategoryName = "No Data";
  let topCategoryAmount = 0;
  let topCategoryPct = 0;

  Object.entries(categoryMap).forEach(([catId, amount]) => {
    if (amount > topCategoryAmount) {
      topCategoryAmount = amount;
      const cat = categories.find(c => c.id === catId);
      topCategoryName = cat?.name || "General";
    }
  });

  if (totalSpentThisMonth > 0 && topCategoryAmount > 0) {
    topCategoryPct = Math.round((topCategoryAmount / totalSpentThisMonth) * 100);
  }

  // ─── Animation Variants ───────────────────────────────────────────────────
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
          <p className="text-sm text-muted-foreground mt-2">Data-driven analysis of your personal spending habits.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-end"
        >
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">This Month</span>
          <span className="text-2xl font-light tracking-tight text-foreground">{currencySymbol}{totalSpentThisMonth.toLocaleString()}</span>
        </motion.div>
      </header>

      {expenses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-8 p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Add your first few expenses to start unlocking detailed spending trends, streaks, and month-over-month comparisons.
          </p>
        </motion.div>
      )}

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        
        {/* Prediction Card - Hero */}
        <motion.div 
          variants={itemVariants}
          className={`md:col-span-2 flex flex-col p-8 rounded-[2rem] border relative overflow-hidden group transition-colors ${
            trajectoryStatus === "warning" || trajectoryStatus === "exceeded"
              ? "bg-gradient-to-br from-flow-amber/10 to-transparent border-flow-amber/20"
              : "bg-gradient-to-br from-flow-emerald/10 to-transparent border-flow-emerald/20"
          }`}
        >
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
            <Brain className={`w-32 h-32 ${trajectoryStatus === "warning" || trajectoryStatus === "exceeded" ? "text-flow-amber" : "text-flow-emerald"}`} strokeWidth={1} />
          </div>
          
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full animate-pulse ${trajectoryStatus === "warning" || trajectoryStatus === "exceeded" ? "bg-flow-amber" : "bg-flow-emerald"}`} />
            <span className={`text-xs font-medium uppercase tracking-widest ${trajectoryStatus === "warning" || trajectoryStatus === "exceeded" ? "text-flow-amber" : "text-flow-emerald"}`}>
              Month-End Projection
            </span>
          </div>

          <div className="flex flex-col relative z-10">
            <h3 className="text-xl font-light text-foreground/90 mb-2">Month-end Trajectory</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-light tracking-tighter text-foreground">{currencySymbol}{Math.round(predictedTotal).toLocaleString()}</span>
              <span className="text-muted-foreground">projected spend</span>
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground max-w-md leading-relaxed">
              {trajectoryMessage}
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
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Highest Spend Day</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-light text-foreground block">{mostExpensiveDay}</span>
            <span className="text-sm text-muted-foreground mt-2 block">
              {maxWeekdayTotal > 0
                ? `Avg ${currencySymbol}${avgOnMaxDay.toLocaleString()} spent per ${mostExpensiveDay}.`
                : "Add expenses across weekdays to analyze trends."}
            </span>
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
            <span className="text-sm text-muted-foreground mt-2 block">
              {streak > 0
                ? "Consecutive days staying strictly within daily safe limit."
                : "Spend within your daily safe limit to start a streak."}
            </span>
          </div>
        </motion.div>

        {/* Insight: Month-over-Month Change */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col p-6 rounded-[2rem] bg-card/40 border border-white/5 hover:bg-card/60 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-white/5">
              {momTrend === "down" ? (
                <TrendingDown className="w-5 h-5 text-flow-emerald" />
              ) : momTrend === "up" ? (
                <TrendingUp className="w-5 h-5 text-flow-amber" />
              ) : (
                <Activity className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Month Comparison</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-light text-foreground block">{momLabel}</span>
            <span className="text-sm text-muted-foreground mt-2 block">{momSubtext}</span>
          </div>
        </motion.div>

        {/* Insight: Top Spending Category */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col p-6 rounded-[2rem] bg-card/40 border border-white/5 hover:bg-card/60 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-white/5">
              <PieChart className="w-5 h-5 text-flow-emerald" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Top Category</span>
          </div>
          <div className="mt-auto">
            <span className="text-4xl font-light text-foreground block">
              {topCategoryName}
            </span>
            <span className="text-sm text-muted-foreground mt-2 block">
              {topCategoryAmount > 0
                ? `${currencySymbol}${topCategoryAmount.toLocaleString()} (${topCategoryPct}% of month's spend)`
                : "No category spending logged this month."}
            </span>
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
              <span className="text-lg font-medium">{currencySymbol}{Math.round(monthlyBudget).toLocaleString()}</span>
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
              <span className="text-lg font-medium">{currencySymbol}{totalSpentThisMonth.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
