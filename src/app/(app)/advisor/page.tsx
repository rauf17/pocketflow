"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Brain, ArrowRight, Target, TrendingDown, RefreshCcw, Loader2,
  Clock, Wallet, Zap, ShoppingBag, CalendarDays, CheckCircle2, AlertTriangle, MinusCircle
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useGoalStore, totalGoalContributions, sortGoalsByPriority } from "@/store/useGoalStore";
import { User, Income, Expense, RecurringBudget, DayProfile, Goal } from "@/store/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { differenceInDays, startOfDay, isBefore, isEqual, addDays } from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIResponse {
  verdict: "positive" | "negative" | "neutral";
  assessment: string;
  metrics: { label: string; value: string }[];
  recommendation: string;
  context: string | null;
}

// ─── Context Builder ──────────────────────────────────────────────────────────
// Computes the full 4-layer financial pipeline and sends pre-derived numbers to
// Gemini. Gemini never needs to do arithmetic — it only interprets and explains.
// Goals may be [] — all other layers compute independently.

function buildAIContext(
  user: User | null,
  income: Income | null,
  expenses: Expense[],
  recurringBudgets: RecurringBudget[],
  profiles: DayProfile[],
  weeklyPlan: Record<number, string>,
  goals: Goal[],
) {
  const today = startOfDay(new Date());
  const balance = user?.balance ?? 0;
  const currency = user?.currency ?? "PKR";
  const currencySymbol = getCurrencySymbol(currency);

  const incomeDate = income ? startOfDay(new Date(income.nextDate)) : null;
  const daysUntilIncome = incomeDate ? Math.max(0, differenceInDays(incomeDate, today)) : null;

  const upcomingBills = (recurringBudgets ?? []).filter(bill => {
    if (!incomeDate) return false;
    const d = startOfDay(new Date(bill.nextDueDate));
    return isBefore(d, incomeDate) || isEqual(d, incomeDate);
  });
  const billsReserved = upcomingBills.reduce((s, b) => s + b.amount, 0);

  const activeGoals = sortGoalsByPriority((goals ?? []).filter(g => g.status !== "completed"));
  const goalsReserved = totalGoalContributions(activeGoals);

  const spendableBalance = Math.max(0, balance - billsReserved - goalsReserved);

  const todayProfileId = weeklyPlan?.[today.getDay()];
  const todayProfile = profiles?.find(p => p.id === todayProfileId) ?? profiles?.[0];
  const isSafeDay = todayProfile?.type === "safe";

  let totalExpectedSpend = 0;
  let nonSafeDays = 0;
  const daysCount = daysUntilIncome ?? 0;
  for (let i = 0; i < daysCount; i++) {
    const date = addDays(today, i);
    const pid = weeklyPlan?.[date.getDay()];
    const profile = profiles?.find(p => p.id === pid) ?? profiles?.[0];
    if (profile) {
      totalExpectedSpend += profile.expectedSpend;
      if (profile.type !== "safe" && profile.expectedSpend > 0) nonSafeDays++;
    }
  }

  let todayBudget = 0;
  const surplus = spendableBalance - totalExpectedSpend;
  if (daysCount === 0) {
    todayBudget = spendableBalance;
  } else if (isSafeDay) {
    todayBudget = 0;
  } else if (surplus >= 0) {
    todayBudget = (todayProfile?.expectedSpend ?? 0) + (nonSafeDays > 0 ? surplus / nonSafeDays : 0);
  } else {
    todayBudget = (todayProfile?.expectedSpend ?? 0) * (totalExpectedSpend > 0 ? spendableBalance / totalExpectedSpend : 1);
  }

  const expensesToday = (expenses ?? []).filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime());
  const spentToday = expensesToday.reduce((s, e) => s + e.amount, 0);
  const todayRemaining = Math.max(0, todayBudget - spentToday);
  const isOverBudget = spentToday > todayBudget;

  const remainingDays = Math.max(1, daysCount - 1);
  const remainingSpendableAfterToday = Math.max(0, spendableBalance - spentToday);
  const adjustedDailyAllowance = remainingSpendableAfterToday > 0 ? Math.round(remainingSpendableAfterToday / remainingDays) : 0;

  return {
    currency,
    currencySymbol,
    balance,
    billsReserved,
    goalsReserved,
    spendableBalance: Math.round(spendableBalance),
    todayProfile: todayProfile ? { name: todayProfile.name, type: todayProfile.type, expectedSpend: todayProfile.expectedSpend } : null,
    isSafeDay,
    todayBudget: Math.round(todayBudget),
    spentToday: Math.round(spentToday),
    todayRemaining: Math.round(todayRemaining),
    isOverBudget,
    adjustedDailyAllowance,
    incomeAmount: income?.amount ?? null,
    nextPayday: income?.nextDate ?? null,
    daysUntilIncome,
    upcomingBills: upcomingBills.map(b => ({ title: b.title, amount: b.amount })),
    goals: activeGoals.map(g => ({
      name: g.name,
      priority: g.priority,
      status: g.status,
      targetAmount: g.targetAmount,
      currentSaved: g.currentSaved,
      remaining: Math.round(g.targetAmount - g.currentSaved),
      monthlyContribution: g.monthlyContribution,
    })),
    recentExpenses: (expenses ?? []).slice(0, 3).map(e => ({ amount: e.amount, description: e.description })),
  };
}

// ─── Scenario Cards ───────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: "afford",  title: "Can I afford this?",   description: "Check if a purchase is safe today.",         icon: Wallet,       prompt: "Can I afford to spend Rs500 today?",                                                         actionText: "Check" },
  { id: "week",    title: "This week's budget",    description: "How much can I safely spend this week?",    icon: CalendarDays, prompt: "How much can I safely spend across this entire week?",                                    actionText: "Calculate" },
  { id: "delayed", title: "Salary Delayed",        description: "What if my income arrives 5 days late?",    icon: Clock,        prompt: "What happens to my daily budget if my salary is delayed by 5 days?",                   actionText: "Simulate" },
  { id: "impact",  title: "Overspend impact",      description: "Simulate spending above today's limit.",    icon: TrendingDown, prompt: "What happens if I spend Rs1,000 today — well above my limit? Show me the ripple effect.", actionText: "Simulate" },
  { id: "save",    title: "Save more",             description: "How can I increase my savings rate?",       icon: Target,       prompt: "Based on my current balance and budget, how can I realistically save more before my next payday?", actionText: "Advise" },
  { id: "bills",   title: "Bill impact",           description: "How do upcoming bills affect my budget?",   icon: ShoppingBag,  prompt: "How do my upcoming recurring bills reduce my available daily budget?",                  actionText: "Analyze" },
];

// ─── Verdict Icon ─────────────────────────────────────────────────────────────
function VerdictIcon({ verdict }: { verdict: AIResponse["verdict"] }) {
  if (verdict === "positive") return <CheckCircle2 className="w-5 h-5 text-flow-emerald shrink-0" />;
  if (verdict === "negative") return <AlertTriangle className="w-5 h-5 text-flow-amber shrink-0" />;
  return <MinusCircle className="w-5 h-5 text-muted-foreground shrink-0" />;
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ result, onReset }: { result: AIResponse; onReset: () => void }) {
  const borderColor =
    result.verdict === "positive" ? "border-flow-emerald/20" :
    result.verdict === "negative" ? "border-flow-amber/20" :
    "border-white/10";
  const bgColor =
    result.verdict === "positive" ? "bg-flow-emerald/5" :
    result.verdict === "negative" ? "bg-flow-amber/5" :
    "bg-card/40";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex flex-col rounded-[2rem] border backdrop-blur-xl overflow-hidden ${bgColor} ${borderColor}`}
    >
      {/* Assessment */}
      <div className="flex items-start gap-3 p-6 pb-4">
        <VerdictIcon verdict={result.verdict} />
        <p className="text-foreground font-medium leading-snug text-base">{result.assessment}</p>
      </div>

      {/* Metrics Grid */}
      {result.metrics.length > 0 && (
        <div className="mx-6 mb-4 grid grid-cols-2 gap-2">
          {result.metrics.map((m, i) => (
            <div key={i} className="flex flex-col p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-1">{m.label}</span>
              <span className="text-base font-medium text-foreground/90 tracking-tight">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {result.recommendation && (
        <div className="mx-6 mb-4 flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-foreground/5 border border-white/5">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-foreground/60" />
          <p className="text-sm text-foreground/80 leading-relaxed">{result.recommendation}</p>
        </div>
      )}

      {/* Optional context */}
      {result.context && (
        <p className="mx-6 mb-5 text-xs text-muted-foreground leading-relaxed">{result.context}</p>
      )}

      {/* Reset */}
      <div className="border-t border-white/5 px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full gap-2 px-4"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Ask another question
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdvisorPage() {
  const { user, income } = useUserStore();
  const { expenses } = useExpenseStore();
  const { recurringBudgets } = useBudgetStore();
  const { profiles, weeklyPlan } = useProfileStore();
  const { goals } = useGoalStore();

  const currencySymbol = getCurrencySymbol(user?.currency);
  const hasGoals = goals.length > 0;

  const [customQuestion, setCustomQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ask = async (prompt: string) => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResult(null);
    setErrorMsg(null);

    const context = buildAIContext(user, income, expenses, recurringBudgets, profiles, weeklyPlan, goals);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [], context }),
      });

      const data = await res.json();

      if (data.error) {
        setErrorMsg(data.error);
        return;
      }

      setResult(data.response as AIResponse);
    } catch {
      setErrorMsg("Could not reach PocketFlow AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto pt-16 px-6 pb-32">

      {/* Header */}
      <header className="w-full flex flex-col mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-foreground" />
          <h2 className="text-3xl font-light tracking-tight">AI Co-Pilot</h2>
        </motion.div>
        <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground mt-2">
          Decision first. Ask anything about your spending or budget.
        </motion.p>
      </header>

      <div className="w-full space-y-6">

        {/* Ask Anything — always visible */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative group">
          <div className="absolute inset-0 bg-white/5 blur-xl rounded-[2rem] -z-10 group-focus-within:bg-white/10 transition-colors duration-500" />
          <div className="flex items-center relative">
            <Input
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder={`Ask anything — "Can I spend ${currencySymbol}500 today?"`}
              className="h-16 pl-6 pr-36 rounded-[2rem] bg-card/60 border border-white/10 text-lg font-light placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/20"
              onKeyDown={(e) => { if (e.key === "Enter" && customQuestion.trim()) ask(customQuestion); }}
            />
            <Button
              size="sm"
              className="absolute right-2 h-12 rounded-xl bg-foreground text-background px-5 gap-1.5"
              onClick={() => ask(customQuestion)}
              disabled={!customQuestion.trim() || isLoading}
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Zap className="w-4 h-4" />Ask</>
              }
            </Button>
          </div>
        </motion.div>

        {/* Error */}
        {errorMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-4 rounded-2xl bg-flow-amber/10 border border-flow-amber/20 text-sm text-flow-amber">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </motion.div>
        )}

        {/* Loading shimmer */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 p-6 rounded-[2rem] bg-card/30 border border-white/5">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Analyzing your finances…</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 rounded-2xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* Structured result */}
          {result && !isLoading && (
            <ResultCard
              key="result"
              result={result}
              onReset={() => { setResult(null); setCustomQuestion(""); }}
            />
          )}

          {/* Idle: scenario cards */}
          {!result && !isLoading && !errorMsg && (
            <motion.div key="idle" variants={containerVariants} initial="hidden" animate="show" exit="hidden" className="flex flex-col gap-6">

              {/* Goals tip — soft, non-blocking */}
              {!hasGoals && (
                <motion.div variants={itemVariants} className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-muted-foreground">
                  <Target className="w-4 h-4 shrink-0 mt-0.5 text-flow-emerald/70" />
                  <span>
                    <span className="text-foreground/60 font-medium">Tip:</span> Add goals in{" "}
                    <a href="/goals" className="text-foreground/80 underline underline-offset-4 hover:text-foreground transition-colors">
                      Mission Control
                    </a>
                    {" "}so AI Co-Pilot can factor your long-term savings into every answer.
                  </span>
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">
                Common Questions
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SCENARIOS.map((s) => (
                  <motion.button
                    key={s.id}
                    variants={itemVariants}
                    onClick={() => ask(s.prompt)}
                    disabled={isLoading}
                    className="flex flex-col text-left p-5 rounded-[1.75rem] bg-card/40 border border-white/5 hover:bg-card/60 transition-all hover:scale-[1.02] group disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="p-2.5 rounded-xl bg-white/5 mb-4 group-hover:bg-foreground group-hover:text-background transition-colors w-min">
                      <s.icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-medium text-foreground/90 text-sm mb-1">{s.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">{s.description}</p>
                    <div className="flex items-center text-xs font-medium text-foreground/60 group-hover:text-foreground transition-colors">
                      {s.actionText}
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.button>
                ))}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
