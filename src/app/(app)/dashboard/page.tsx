"use client";

import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useGoalStore, totalGoalContributions, sortGoalsByPriority, computeCompletionDate } from "@/store/useGoalStore";
import { getCurrencySymbol } from "@/lib/utils";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ExpenseInput } from "@/components/ExpenseInput";
import { LivingFlow } from "@/components/LivingFlow";
import { motion, Variants } from "framer-motion";
import { differenceInDays, startOfDay, isBefore, isEqual, format, addDays } from "date-fns";
import { ArrowRight, Receipt, Clock, Wallet, TrendingDown, Shield, Coffee, Briefcase, ShoppingBag, Zap, Target, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, income } = useUserStore();
  const { expenses } = useExpenseStore();
  const { recurringBudgets } = useBudgetStore();
  const { profiles, weeklyPlan } = useProfileStore();
  const { goals } = useGoalStore();

  if (!user || !income) return null;

  // ─── LAYER 1: Time Context ─────────────────────────────────────────────────
  const today = startOfDay(new Date());
  const incomeDate = startOfDay(new Date(income.nextDate));
  let daysUntilIncome = differenceInDays(incomeDate, today);
  if (daysUntilIncome < 0) daysUntilIncome = 0;

  // ─── LAYER 2: Recurring Bills Reserved ────────────────────────────────────
  let upcomingBillsTotal = 0;
  recurringBudgets.forEach(bill => {
    const billDate = startOfDay(new Date(bill.nextDueDate));
    if (isBefore(billDate, incomeDate) || isEqual(billDate, incomeDate)) {
      upcomingBillsTotal += bill.amount;
    }
  });

  // ─── LAYER 3: Goal Contributions Reserved (Priority Order) ────────────────
  const activeGoals = sortGoalsByPriority(goals.filter(g => g.status !== 'completed'));
  const goalsReservedTotal = totalGoalContributions(activeGoals);

  // ─── LAYER 4: Spendable Balance ───────────────────────────────────────────
  const rawSpendable = user.balance - upcomingBillsTotal - goalsReservedTotal;
  const spendableBalance = Math.max(0, rawSpendable);
  const goalsProtectedMode = rawSpendable <= 0;

  // ─── LAYER 5: Day Profile Budget Engine ───────────────────────────────────
  let totalExpectedSpendForRemainingDays = 0;
  let nonSafeDaysCount = 0;

  for (let i = 0; i < daysUntilIncome; i++) {
    const date = addDays(today, i);
    const profileId = weeklyPlan[date.getDay()];
    const profile = profiles.find(p => p.id === profileId) || profiles[0];
    totalExpectedSpendForRemainingDays += profile.expectedSpend;
    if (profile.type !== 'safe' && profile.expectedSpend > 0) nonSafeDaysCount++;
  }

  const todayProfileId = weeklyPlan[today.getDay()];
  const todayProfile = profiles.find(p => p.id === todayProfileId) || profiles[0];

  let safeLimit = 0;
  const surplus = spendableBalance - totalExpectedSpendForRemainingDays;

  if (goalsProtectedMode) {
    safeLimit = 0;
  } else if (daysUntilIncome === 0) {
    safeLimit = spendableBalance;
  } else if (todayProfile.expectedSpend === 0) {
    safeLimit = 0;
  } else if (surplus >= 0) {
    const extraPerDay = nonSafeDaysCount > 0 ? surplus / nonSafeDaysCount : 0;
    safeLimit = todayProfile.expectedSpend + extraPerDay;
  } else {
    const scalingFactor = totalExpectedSpendForRemainingDays > 0 ? spendableBalance / totalExpectedSpendForRemainingDays : 1;
    safeLimit = todayProfile.expectedSpend * scalingFactor;
  }

  // ─── LAYER 6: Today's Available ───────────────────────────────────────────
  const expensesToday = expenses
    .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
    .reduce((sum, e) => sum + e.amount, 0);

  const remainingToday = safeLimit - expensesToday;
  const isOverBudget = remainingToday < 0;

  // ─── Tomorrow's Projection ────────────────────────────────────────────────
  let tomorrowAllowance = 0;
  const tomorrow = addDays(today, 1);
  const tomorrowProfileId = weeklyPlan[tomorrow.getDay()];
  const tomorrowProfile = profiles.find(p => p.id === tomorrowProfileId) || profiles[0];

  if (daysUntilIncome <= 1) {
    tomorrowAllowance = -1; // Payday flag
  } else if (tomorrowProfile.expectedSpend === 0) {
    tomorrowAllowance = 0;
  } else {
    const safeBalanceAfterToday = Math.max(0, spendableBalance - expensesToday);
    const expectedSpendFuture = Math.max(0, totalExpectedSpendForRemainingDays - todayProfile.expectedSpend);
    const futureSurplus = safeBalanceAfterToday - expectedSpendFuture;
    const futureNonSafe = (todayProfile.type !== 'safe' && todayProfile.expectedSpend > 0)
      ? Math.max(0, nonSafeDaysCount - 1)
      : nonSafeDaysCount;

    if (futureSurplus >= 0) {
      tomorrowAllowance = tomorrowProfile.expectedSpend + (futureNonSafe > 0 ? futureSurplus / futureNonSafe : 0);
    } else {
      tomorrowAllowance = expectedSpendFuture > 0 ? tomorrowProfile.expectedSpend * (safeBalanceAfterToday / expectedSpendFuture) : 0;
    }
  }

  // ─── Goal summary for dashboard card ──────────────────────────────────────
  const atRiskGoals = activeGoals.filter(g => g.status === 'at-risk' || g.status === 'behind');
  const topGoal = activeGoals[0] ?? null;
  const topGoalProgress = topGoal ? Math.min(100, (topGoal.currentSaved / topGoal.targetAmount) * 100) : 0;
  const topGoalCompletion = topGoal ? computeCompletionDate(topGoal) : null;

  const currencySymbol = getCurrencySymbol(user.currency);
  const recentExpenses = expenses.slice(0, 3);

  // ─── Icon helper ──────────────────────────────────────────────────────────
  const getIcon = (name: string) => {
    switch (name) {
      case 'Shield': return <Shield className="w-4 h-4" />;
      case 'Coffee': return <Coffee className="w-4 h-4" />;
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      case 'ShoppingBag': return <ShoppingBag className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto pt-16 px-6 pb-32">
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full flex flex-col items-center text-center space-y-12"
      >
        
        {/* Greeting */}
        <motion.div variants={itemVariants} className="flex flex-col items-center space-y-2">
          <h2 className="text-xl md:text-2xl font-light tracking-tight text-foreground/80">
            Good Morning, {user.name}
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
              {format(new Date(), "EEEE • d MMMM")}
            </p>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <Link href="/planner" className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              {getIcon(todayProfile.icon)}
              {todayProfile.name}
            </Link>
          </div>
        </motion.div>

        {/* Hero: Available Today */}
        <motion.div variants={itemVariants} className="flex flex-col items-center relative group">
          <div className={`absolute inset-0 blur-3xl rounded-full -z-10 transition-colors duration-700 ${
            goalsProtectedMode ? 'bg-flow-amber/15' :
            isOverBudget ? 'bg-flow-amber/10' :
            todayProfile.type === 'safe' ? 'bg-flow-emerald/10' :
            'bg-flow-emerald/5 group-hover:bg-flow-emerald/10'
          }`} />
          
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-6">
            {goalsProtectedMode ? "Goals Protected" : isOverBudget ? "Overspent Today" : "Available Today"}
          </span>
          
          <div className="flex items-center gap-3">
            <span className={`text-4xl md:text-5xl font-light mt-2 ${goalsProtectedMode || isOverBudget ? 'text-flow-amber' : 'text-muted-foreground'}`}>
              {(goalsProtectedMode || isOverBudget) ? "-" : ""}{currencySymbol}
            </span>
            <AnimatedCounter 
              value={goalsProtectedMode ? 0 : Math.abs(remainingToday)} 
              symbol=""
              className={`text-8xl md:text-9xl font-light tracking-tighter drop-shadow-sm ${goalsProtectedMode || isOverBudget ? 'text-flow-amber' : 'text-foreground'}`}
            />
          </div>

          {goalsProtectedMode ? (
            <div className="mt-8 flex flex-col items-center max-w-sm text-center">
              <div className="flex items-center gap-2 text-flow-amber mb-3">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">All funds allocated to Goals & Bills</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Any spending right now will cut directly into one or more of your financial goals. 
                Adjust contributions in{" "}
                <Link href="/goals" className="underline text-foreground/70 hover:text-foreground">Mission Control</Link>.
              </p>
            </div>
          ) : todayProfile.type === 'safe' && expensesToday === 0 ? (
            <div className="mt-8 flex flex-col items-center max-w-xs text-center text-flow-emerald/90">
              <span className="text-sm font-medium">Today is a Safe Day.</span>
              <span className="text-xs opacity-70 mt-1">Rest your wallet to build tomorrow&apos;s surplus.</span>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center">
              <div className="text-xs font-medium tracking-wide text-foreground/80 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2">
                Tomorrow&apos;s Allowance:
                <span className={tomorrowAllowance < tomorrowProfile.expectedSpend ? "text-flow-amber font-bold" : "text-flow-emerald font-bold"}>
                  {tomorrowAllowance === -1 ? "Payday!" : `${currencySymbol}${tomorrowAllowance.toFixed(0)}`}
                </span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {daysUntilIncome} days until income
              </div>
            </div>
          )}
        </motion.div>

        {/* FlowPath */}
        <motion.div variants={itemVariants} className="w-full -my-4 relative z-0">
          <LivingFlow profileType={todayProfile.type} />
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 w-full mt-4">
          
          <div className="flex flex-col p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md hover:bg-card/60 transition-colors cursor-default">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-white/5">
                <TrendingDown className="w-4 h-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Spent</span>
            </div>
            <span className="text-3xl font-light tracking-tight text-foreground">
              {currencySymbol}{expensesToday.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground mt-2">Total spent today</span>
          </div>
          
          <div className="flex flex-col p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md hover:bg-card/60 transition-colors cursor-default">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-xl ${goalsProtectedMode ? 'bg-flow-amber/10' : 'bg-flow-emerald/10'}`}>
                <Wallet className={`w-4 h-4 ${goalsProtectedMode ? 'text-flow-amber' : 'text-flow-emerald'}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Spendable</span>
            </div>
            <span className={`text-3xl font-light tracking-tight ${goalsProtectedMode ? 'text-flow-amber' : 'text-foreground'}`}>
              {currencySymbol}{spendableBalance.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground mt-2">After goals & bills</span>
          </div>

          {/* Goal Summary Card */}
          {activeGoals.length > 0 && (
            <Link href="/goals" className="col-span-2 flex flex-col p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md hover:bg-card/60 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${atRiskGoals.length > 0 ? 'bg-flow-amber/10' : 'bg-flow-emerald/10'}`}>
                    <Target className={`w-4 h-4 ${atRiskGoals.length > 0 ? 'text-flow-amber' : 'text-flow-emerald'}`} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Goals</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {atRiskGoals.length > 0 ? (
                    <span className="text-flow-amber font-medium">{atRiskGoals.length} at risk</span>
                  ) : (
                    <span className="text-flow-emerald font-medium">{activeGoals.length} on track</span>
                  )}
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {topGoal && (
                <>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-medium text-foreground/90 text-sm">{topGoal.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {currencySymbol}{topGoal.currentSaved.toLocaleString()} / {currencySymbol}{topGoal.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                    <motion.div
                      className={`h-full rounded-full ${topGoal.status === 'at-risk' || topGoal.status === 'behind' ? 'bg-flow-amber' : 'bg-flow-emerald'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${topGoalProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{topGoalProgress.toFixed(0)}% saved</span>
                    {topGoalCompletion && (
                      <span>Est. {format(new Date(topGoalCompletion), "MMM yyyy")}</span>
                    )}
                  </div>
                </>
              )}
            </Link>
          )}

        </motion.div>

        {/* Quick Links */}
        <motion.div variants={itemVariants} className="w-full flex flex-col gap-4 mt-8">
          
          <Link href="/budgets" className="flex items-center justify-between p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md hover:bg-card/60 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-foreground/90">Upcoming Bills</span>
                <span className="text-xs text-muted-foreground">{currencySymbol}{upcomingBillsTotal.toFixed(0)} reserved</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/expenses" className="flex items-center justify-between p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md hover:bg-card/60 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-foreground/90">Recent Activity</span>
                <span className="text-xs text-muted-foreground">{recentExpenses.length} recent transactions</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>

        </motion.div>

      </motion.div>

      {/* Quick Expense Input */}
      <div className="w-full mt-12 mb-8">
        <ExpenseInput />
      </div>

    </div>
  );
}
