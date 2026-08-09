"use client";

import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useGoalStore, totalGoalContributions, sortGoalsByPriority, computeCompletionDate } from "@/store/useGoalStore";
import { getCurrencySymbol } from "@/lib/utils";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ExpenseInput } from "@/components/ExpenseInput";
import { LivingFlow, DayNode } from "@/components/LivingFlow";
import { motion, Variants } from "framer-motion";
import { differenceInDays, startOfDay, isBefore, isEqual, format, addDays } from "date-fns";
import { ArrowRight, Receipt, Clock, Wallet, TrendingDown, Shield, Coffee, Briefcase, ShoppingBag, Zap, Target, AlertTriangle, Brain } from "lucide-react";
import Link from "next/link";

// ─── Greeting helper ──────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

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
  const activeGoals = sortGoalsByPriority(goals.filter(g => g.status !== "completed"));
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
    if (profile.type !== "safe" && profile.expectedSpend > 0) nonSafeDaysCount++;
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
    const scalingFactor = totalExpectedSpendForRemainingDays > 0
      ? spendableBalance / totalExpectedSpendForRemainingDays : 1;
    safeLimit = todayProfile.expectedSpend * scalingFactor;
  }

  // ─── LAYER 6: Today's Actuals ─────────────────────────────────────────────
  const spentToday = expenses
    .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
    .reduce((sum, e) => sum + e.amount, 0);

  const remainingToday = safeLimit - spentToday;
  const isOverBudget = remainingToday < 0;

  // ─── Tomorrow's Allowance (from engine) ───────────────────────────────────
  let tomorrowAllowance = 0;
  const tomorrow = addDays(today, 1);
  const tomorrowProfileId = weeklyPlan[tomorrow.getDay()];
  const tomorrowProfile = profiles.find(p => p.id === tomorrowProfileId) || profiles[0];

  if (daysUntilIncome <= 1) {
    tomorrowAllowance = -1; // Payday flag
  } else if (tomorrowProfile.expectedSpend === 0) {
    tomorrowAllowance = 0;
  } else {
    const safeBalanceAfterToday = Math.max(0, spendableBalance - spentToday);
    const expectedSpendFuture = Math.max(0, totalExpectedSpendForRemainingDays - todayProfile.expectedSpend);
    const futureSurplus = safeBalanceAfterToday - expectedSpendFuture;
    const futureNonSafe = (todayProfile.type !== "safe" && todayProfile.expectedSpend > 0)
      ? Math.max(0, nonSafeDaysCount - 1)
      : nonSafeDaysCount;

    if (futureSurplus >= 0) {
      tomorrowAllowance = tomorrowProfile.expectedSpend + (futureNonSafe > 0 ? futureSurplus / futureNonSafe : 0);
    } else {
      tomorrowAllowance = expectedSpendFuture > 0
        ? tomorrowProfile.expectedSpend * (safeBalanceAfterToday / expectedSpendFuture)
        : 0;
    }
  }

  const tomorrowLabel = tomorrowAllowance === -1
    ? "Payday!"
    : `${getCurrencySymbol(user.currency)}${tomorrowAllowance.toFixed(0)}`;

  // ─── Full Day Trajectory (for LivingFlow) ─────────────────────────────────
  const scalingFactor = totalExpectedSpendForRemainingDays > 0
    ? Math.min(1, spendableBalance / totalExpectedSpendForRemainingDays) : 1;

  const dayTrajectory: DayNode[] = [];
  for (let i = 0; i < Math.min(daysUntilIncome, 30); i++) {
    const date = addDays(today, i);
    const profileId = weeklyPlan[date.getDay()];
    const profile = profiles.find(p => p.id === profileId) || profiles[0];

    const daySafeLimit = goalsProtectedMode
      ? 0
      : surplus >= 0
        ? profile.expectedSpend + (nonSafeDaysCount > 0 ? surplus / nonSafeDaysCount : 0)
        : profile.expectedSpend * scalingFactor;

    const isToday = i === 0;
    const projectedSpend = isToday ? spentToday : profile.expectedSpend;
    const remaining = daySafeLimit - projectedSpend;

    let status: DayNode["status"];
    if (profile.type === "safe") status = "safe-day";
    else if (isToday && isOverBudget) status = "over-budget";
    else if (remaining < daySafeLimit * 0.35 && daySafeLimit > 0) status = "approaching";
    else status = "on-track";

    dayTrajectory.push({
      dateLabel: format(date, "EEE, d MMM"),
      profileName: profile.name,
      profileType: profile.type,
      safeLimit: Math.round(daySafeLimit),
      projectedSpend: Math.round(projectedSpend),
      actualSpend: isToday ? Math.round(spentToday) : undefined,
      remaining: Math.round(remaining),
      isToday,
      status,
    });
  }

  // ─── Goal Summary ──────────────────────────────────────────────────────────
  const atRiskGoals = activeGoals.filter(g => g.status === "at-risk" || g.status === "behind");
  const topGoal = activeGoals[0] ?? null;
  const topGoalProgress = topGoal ? Math.min(100, (topGoal.currentSaved / topGoal.targetAmount) * 100) : 0;
  const topGoalCompletion = topGoal ? computeCompletionDate(topGoal) : null;

  const currencySymbol = getCurrencySymbol(user.currency);
  const recentExpenses = expenses.slice(0, 3);

  // ─── Hero State (priority-ordered, mutually exclusive) ────────────────────
  type HeroState = "safety-limit" | "over-budget" | "safe-day" | "approaching" | "normal";
  let heroState: HeroState;
  if (goalsProtectedMode)                                             heroState = "safety-limit";
  else if (isOverBudget)                                              heroState = "over-budget";
  else if (todayProfile.type === "safe")                              heroState = "safe-day";
  else if (remainingToday > 0 && remainingToday < safeLimit * 0.35)  heroState = "approaching";
  else                                                                heroState = "normal";

  const heroConfig: Record<HeroState, {
    label: string; color: string; glowColor: string; showMinus: boolean; value: number;
  }> = {
    "safety-limit": { label: "SAFETY LIMIT REACHED",  color: "text-flow-amber",   glowColor: "bg-flow-amber/15", showMinus: false, value: 0 },
    "over-budget":  { label: "OVERSPENT TODAY",        color: "text-flow-amber",   glowColor: "bg-flow-amber/10", showMinus: true,  value: Math.abs(remainingToday) },
    "safe-day":     { label: "SAFE DAY",               color: "text-flow-emerald", glowColor: "bg-flow-emerald/8",showMinus: false, value: 0 },
    "approaching":  { label: "SPENDING CAUTION",       color: "text-flow-amber",   glowColor: "bg-flow-amber/8",  showMinus: false, value: remainingToday },
    "normal":       { label: "SAFE TO SPEND TODAY",    color: "text-foreground",   glowColor: "bg-flow-emerald/5",showMinus: false, value: remainingToday },
  };
  const hero = heroConfig[heroState];

  // ─── Icon helper ──────────────────────────────────────────────────────────
  const getIcon = (name: string) => {
    switch (name) {
      case "Shield":      return <Shield className="w-4 h-4" />;
      case "Coffee":      return <Coffee className="w-4 h-4" />;
      case "Briefcase":   return <Briefcase className="w-4 h-4" />;
      case "ShoppingBag": return <ShoppingBag className="w-4 h-4" />;
      default:            return <Zap className="w-4 h-4" />;
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto pt-16 px-6 pb-32">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full flex flex-col items-center text-center space-y-10"
      >

        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col items-center space-y-2">
          <h2 className="text-xl md:text-2xl font-light tracking-tight text-foreground/80">
            {greeting()}, {user.name}
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
              {format(new Date(), "EEEE • d MMMM")}
            </p>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <Link
              href="/planner"
              className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors bg-white/5 px-2.5 py-1 rounded-full border border-white/5"
            >
              {getIcon(todayProfile.icon)}
              {todayProfile.name}
            </Link>
          </div>
        </motion.div>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col items-center relative group w-full">
          <div className={`absolute inset-0 blur-3xl rounded-full -z-10 transition-colors duration-700 ${hero.glowColor}`} />

          {/* State label */}
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-6">
            {hero.label}
          </span>

          {/* Big number */}
          <div className="flex items-center gap-2">
            <span className={`text-4xl md:text-5xl font-light mt-2 ${hero.color}`}>
              {hero.showMinus ? "-" : ""}{currencySymbol}
            </span>
            <AnimatedCounter
              value={hero.value}
              symbol=""
              className={`text-8xl md:text-9xl font-light tracking-tighter drop-shadow-sm ${hero.color}`}
            />
          </div>

          {/* Today's Safe Limit reference — always visible */}
          {heroState !== "safe-day" && heroState !== "safety-limit" && (
            <div className="mt-4 text-xs text-muted-foreground font-medium tracking-wide">
              Today&apos;s Safe Limit:{" "}
              <span className="text-foreground/70">{currencySymbol}{safeLimit.toFixed(0)}</span>
            </div>
          )}

          {/* State-specific sub-copy */}
          <div className="mt-6">
            {heroState === "safety-limit" && (
              <div className="flex flex-col items-center max-w-sm text-center">
                <div className="flex items-center gap-2 text-flow-amber mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Further spending would compromise your protected savings.</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Adjust goal contributions in{" "}
                  <Link href="/goals" className="underline text-foreground/70 hover:text-foreground">Mission Control</Link>.
                </p>
              </div>
            )}

            {heroState === "over-budget" && (
              <div className="flex items-center gap-2 text-xs text-foreground/80 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                Tomorrow&apos;s Allowance:
                <span className={`font-bold ${tomorrowAllowance < tomorrowProfile.expectedSpend ? "text-flow-amber" : "text-flow-emerald"}`}>
                  {tomorrowLabel}
                </span>
              </div>
            )}

            {heroState === "safe-day" && (
              <div className="flex flex-col items-center max-w-xs text-center text-flow-emerald/90 gap-1">
                <span className="text-sm font-medium">Rest Day — no spending expected today.</span>
                <span className="text-xs opacity-70">
                  Tomorrow&apos;s allowance: <span className="font-semibold text-foreground/60">{tomorrowLabel}</span>
                </span>
              </div>
            )}

            {heroState === "approaching" && (
              <div className="flex items-center gap-2 text-xs text-foreground/80 bg-flow-amber/5 px-4 py-2 rounded-full border border-flow-amber/20 backdrop-blur-md">
                <AlertTriangle className="w-3.5 h-3.5 text-flow-amber" />
                Keep spending under {currencySymbol}{remainingToday.toFixed(0)} to stay on track.
              </div>
            )}

            {heroState === "normal" && (
              <div className="flex items-center gap-2 text-xs text-foreground/80 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                Tomorrow&apos;s Allowance:
                <span className={`font-bold ${tomorrowAllowance < tomorrowProfile.expectedSpend ? "text-flow-amber" : "text-flow-emerald"}`}>
                  {tomorrowLabel}
                </span>
                <span className="text-muted-foreground">· {daysUntilIncome}d until income</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Flow Trajectory ────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="w-full -my-2 relative z-0">
          <LivingFlow profileType={todayProfile.type} dayTrajectory={dayTrajectory} />
        </motion.div>

        {/* ── Today at a Glance ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="w-full flex flex-col gap-4">

          {/* 3-chip metric row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Today's Safe Limit */}
            <div className="flex flex-col items-center p-4 rounded-[1.75rem] bg-card/40 border border-white/5 backdrop-blur-md">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Safe Limit</span>
              <span className="text-xl font-light text-foreground/90 tracking-tight">
                {currencySymbol}{safeLimit.toFixed(0)}
              </span>
            </div>

            {/* Spent Today */}
            <div className="flex flex-col items-center p-4 rounded-[1.75rem] bg-card/40 border border-white/5 backdrop-blur-md">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Spent Today</span>
              <span className={`text-xl font-light tracking-tight ${isOverBudget ? "text-flow-amber" : "text-foreground/90"}`}>
                {currencySymbol}{spentToday.toFixed(0)}
              </span>
            </div>

            {/* Remaining Today */}
            <div className="flex flex-col items-center p-4 rounded-[1.75rem] bg-card/40 border border-white/5 backdrop-blur-md">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                {isOverBudget ? "Over Budget" : "Remaining"}
              </span>
              <span className={`text-xl font-light tracking-tight ${isOverBudget ? "text-flow-amber" : "text-flow-emerald"}`}>
                {isOverBudget ? "-" : ""}{currencySymbol}{Math.abs(remainingToday).toFixed(0)}
              </span>
            </div>
          </div>

          {/* Contextual Status Card */}
          {heroState === "safety-limit" && (
            <div className="flex items-start justify-between p-5 rounded-[2rem] bg-flow-amber/5 border border-flow-amber/15 backdrop-blur-md">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold text-foreground/90">Funds Protected</span>
                <span className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  All available balance is allocated to goals & bills. Further spending would compromise protected savings.
                </span>
              </div>
              <Link href="/goals" className="ml-4 shrink-0 text-xs font-medium text-foreground/70 hover:text-foreground underline underline-offset-4 transition-colors mt-0.5">
                Mission Control
              </Link>
            </div>
          )}

          {heroState === "over-budget" && (
            <div className="flex items-start justify-between p-5 rounded-[2rem] bg-flow-amber/5 border border-flow-amber/15 backdrop-blur-md">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold text-foreground/90">Budget Recovery</span>
                <span className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  You overspent by {currencySymbol}{Math.abs(remainingToday).toFixed(0)} today. Your daily allowance has been recalculated to {currencySymbol}{tomorrowAllowance === -1 ? "—" : tomorrowAllowance.toFixed(0)}/day.
                </span>
              </div>
              <div className="flex flex-col gap-2 ml-4 shrink-0">
                <Link href="/expenses" className="text-xs font-medium text-foreground/70 hover:text-foreground underline underline-offset-4 transition-colors">
                  See Breakdown
                </Link>
                <Link href="/advisor" className="text-xs font-medium text-foreground/70 hover:text-foreground underline underline-offset-4 transition-colors">
                  Ask AI
                </Link>
              </div>
            </div>
          )}

          {heroState === "approaching" && (
            <div className="flex items-start justify-between p-5 rounded-[2rem] bg-flow-amber/5 border border-flow-amber/15 backdrop-blur-md">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm font-semibold text-foreground/90">Spending Caution</span>
                <span className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  You have {currencySymbol}{remainingToday.toFixed(0)} left for today. Keep spend under this amount to stay on track.
                </span>
              </div>
              <Link href="/advisor" className="ml-4 shrink-0 text-xs font-medium text-foreground/70 hover:text-foreground underline underline-offset-4 transition-colors mt-0.5">
                <Brain className="w-3.5 h-3.5 inline mr-1" />Ask AI
              </Link>
            </div>
          )}

        </motion.div>

        {/* ── Secondary Cards ────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 w-full">

          {/* Spendable Balance */}
          <div className="flex flex-col p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-xl ${goalsProtectedMode ? "bg-flow-amber/10" : "bg-white/5"}`}>
                <Wallet className={`w-4 h-4 ${goalsProtectedMode ? "text-flow-amber" : "text-muted-foreground"}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Spendable Balance</span>
            </div>
            <span className={`text-3xl font-light tracking-tight ${goalsProtectedMode ? "text-flow-amber" : "text-foreground"}`}>
              {currencySymbol}{spendableBalance.toFixed(0)}
            </span>
            <span className="text-xs text-muted-foreground mt-2">After goals & bills</span>
          </div>

          {/* Tomorrow's Allowance */}
          <div className="flex flex-col p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-white/5">
                <TrendingDown className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Tomorrow&apos;s Allowance</span>
            </div>
            <span className={`text-3xl font-light tracking-tight ${tomorrowAllowance < tomorrowProfile.expectedSpend && tomorrowAllowance !== -1 ? "text-flow-amber" : "text-foreground"}`}>
              {tomorrowLabel}
            </span>
            <span className="text-xs text-muted-foreground mt-2">{tomorrowProfile.name}</span>
          </div>

          {/* Goal Summary Card */}
          {activeGoals.length > 0 && (
            <Link href="/goals" className="col-span-2 flex flex-col p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md hover:bg-card/60 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${atRiskGoals.length > 0 ? "bg-flow-amber/10" : "bg-flow-emerald/10"}`}>
                    <Target className={`w-4 h-4 ${atRiskGoals.length > 0 ? "text-flow-amber" : "text-flow-emerald"}`} />
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
                      className={`h-full rounded-full ${topGoal.status === "at-risk" || topGoal.status === "behind" ? "bg-flow-amber" : "bg-flow-emerald"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${topGoalProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{topGoalProgress.toFixed(0)}% saved</span>
                    {topGoalCompletion && <span>Est. {format(new Date(topGoalCompletion), "MMM yyyy")}</span>}
                  </div>
                </>
              )}
            </Link>
          )}

        </motion.div>

        {/* ── Quick Links ────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="w-full flex flex-col gap-4">

          <Link href="/budgets" className="flex items-center justify-between p-5 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md hover:bg-card/60 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-foreground/90">Upcoming Bills</span>
                <span className="text-xs text-muted-foreground">{currencySymbol}{upcomingBillsTotal.toFixed(0)} reserved this cycle</span>
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
