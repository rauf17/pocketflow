/**
 * PocketFlow budget engine — the single source of truth for "what can I safely
 * spend today?". Pure functions only: no stores, no React, no `new Date()`
 * (the caller passes `now`), so every number is reproducible and testable.
 *
 * Pipeline:  balance → bills → goals → spendable → day profiles → today's limit
 */
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns';
import type { DayProfile, Goal, RecurringBudget } from '@/store/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EngineExpense {
  amount: number;
  date: string;
}

export interface EngineInput {
  now: Date;
  /** Current balance (already derived from the ledger). */
  balance: number;
  /** ISO date of the next payday; null when no income is configured. */
  nextPayday: string | null;
  bills: RecurringBudget[];
  goals: Goal[];
  profiles: DayProfile[];
  weeklyPlan: Record<number, string>;
  expenses: EngineExpense[];
}

export interface EngineDay {
  date: Date;
  profile: DayProfile;
  /** Safe limit for that day under today's plan. */
  limit: number;
}

export interface EngineResult {
  today: Date;
  daysUntilIncome: number;

  billsReserved: number;
  goalsReserved: number;
  rawSpendable: number;
  spendableBalance: number;
  /** True when bills + goals already consume the whole balance. */
  goalsProtectedMode: boolean;

  todayProfile: DayProfile;
  totalExpectedSpend: number;
  nonSafeDays: number;
  surplus: number;

  safeLimit: number;
  spentToday: number;
  remainingToday: number;
  isOverBudget: boolean;

  /** True when tomorrow is payday (or payday is today), so no allowance applies. */
  isTomorrowPayday: boolean;
  tomorrowAllowance: number;

  /** One entry per day from today up to (not including) payday. */
  days: EngineDay[];
}

// ─── Goals (kept here so the engine has no store imports) ───────────────────

export const GOAL_PRIORITY_ORDER = ['critical', 'important', 'planned', 'nice-to-have'] as const;

export function activeGoalsByPriority(goals: Goal[]): Goal[] {
  return goals
    .filter((g) => g.status !== 'completed')
    .sort(
      (a, b) =>
        GOAL_PRIORITY_ORDER.indexOf(a.priority) - GOAL_PRIORITY_ORDER.indexOf(b.priority),
    );
}

export function reservedForGoals(goals: Goal[]): number {
  return goals
    .filter((g) => g.status !== 'completed')
    .reduce((sum, g) => sum + g.monthlyContribution, 0);
}

// ─── Recurring bills ────────────────────────────────────────────────────────

const MAX_OCCURRENCES = 100;
const MAX_CATCHUP_STEPS = 5000;

function advanceDue(date: Date, frequency: RecurringBudget['frequency']): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'semester':
      return addMonths(date, 6);
    case 'monthly':
    default:
      return addMonths(date, 1);
  }
}

/**
 * How many payments a bill needs reserved before `deadline`. A bill that is
 * already overdue counts ONCE for what is owed now (a rent bill forgotten for a
 * year does not reserve twelve months), plus every occurrence from today up to
 * the deadline (a weekly bill with 3 weeks to payday reserves 3×, not 1×).
 */
export function billOccurrencesUntil(
  bill: RecurringBudget,
  deadline: Date,
  today: Date = new Date(),
): number {
  const end = startOfDay(deadline);
  const start = startOfDay(today);
  let due = startOfDay(new Date(bill.nextDueDate));
  if (isNaN(due.getTime())) return 0;

  let count = 0;
  if (isBefore(due, start)) {
    count = 1; // the overdue payment
    let steps = 0;
    while (isBefore(due, start) && steps++ < MAX_CATCHUP_STEPS) {
      due = startOfDay(advanceDue(due, bill.frequency));
    }
  }
  while (!isAfter(due, end) && count < MAX_OCCURRENCES) {
    count++;
    due = startOfDay(advanceDue(due, bill.frequency));
  }
  return count;
}

export function reservedForBills(bills: RecurringBudget[], deadline: Date, today: Date = new Date()): number {
  return bills.reduce((sum, b) => sum + b.amount * billOccurrencesUntil(b, deadline, today), 0);
}

// ─── Engine ─────────────────────────────────────────────────────────────────

const FALLBACK_PROFILE: DayProfile = {
  id: 'fallback',
  name: 'Safe Day',
  type: 'safe',
  expectedSpend: 0,
  icon: 'Shield',
  color: 'emerald',
};

function profileFor(
  date: Date,
  profiles: DayProfile[],
  weeklyPlan: Record<number, string>,
): DayProfile {
  const id = weeklyPlan[date.getDay()];
  return profiles.find((p) => p.id === id) ?? profiles[0] ?? FALLBACK_PROFILE;
}

export function spentOnDay(expenses: EngineExpense[], day: Date): number {
  const target = startOfDay(day).getTime();
  return expenses
    .filter((e) => startOfDay(new Date(e.date)).getTime() === target)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function computeBudget(input: EngineInput): EngineResult {
  const { now, balance, nextPayday, bills, goals, profiles, weeklyPlan, expenses } = input;

  // Time context
  const today = startOfDay(now);
  const paydayDate = nextPayday ? startOfDay(new Date(nextPayday)) : today;
  const daysUntilIncome = Math.max(0, differenceInDays(paydayDate, today));

  // Reserved money
  const billsReserved = reservedForBills(bills, paydayDate, today);
  const goalsReserved = reservedForGoals(goals);
  const rawSpendable = balance - billsReserved - goalsReserved;
  const spendableBalance = Math.max(0, rawSpendable);
  const goalsProtectedMode = rawSpendable <= 0;

  // Day profiles across the remaining horizon
  const days: EngineDay[] = [];
  let totalExpectedSpend = 0;
  let nonSafeDays = 0;
  for (let i = 0; i < daysUntilIncome; i++) {
    const date = addDays(today, i);
    const profile = profileFor(date, profiles, weeklyPlan);
    totalExpectedSpend += profile.expectedSpend;
    if (profile.type !== 'safe' && profile.expectedSpend > 0) nonSafeDays++;
    days.push({ date, profile, limit: 0 });
  }

  const todayProfile = profileFor(today, profiles, weeklyPlan);
  const surplus = spendableBalance - totalExpectedSpend;
  const perNonSafeDay = nonSafeDays > 0 ? surplus / nonSafeDays : 0;
  const scaling =
    totalExpectedSpend > 0 ? Math.min(1, spendableBalance / totalExpectedSpend) : 1;

  // Today's safe limit
  let safeLimit: number;
  if (goalsProtectedMode) {
    safeLimit = 0;
  } else if (daysUntilIncome === 0) {
    safeLimit = spendableBalance;
  } else if (todayProfile.expectedSpend === 0) {
    safeLimit = 0;
  } else if (surplus >= 0) {
    safeLimit = todayProfile.expectedSpend + perNonSafeDay;
  } else {
    safeLimit = todayProfile.expectedSpend * scaling;
  }

  // Per-day limits (trajectory)
  for (const day of days) {
    day.limit = goalsProtectedMode
      ? 0
      : surplus >= 0
        ? day.profile.expectedSpend + perNonSafeDay
        : day.profile.expectedSpend * scaling;
  }

  // Today's actuals
  const spentToday = spentOnDay(expenses, today);
  const remainingToday = safeLimit - spentToday;

  // Tomorrow's allowance
  const tomorrowProfile = profileFor(addDays(today, 1), profiles, weeklyPlan);
  const isTomorrowPayday = daysUntilIncome <= 1;
  let tomorrowAllowance = 0;
  if (!isTomorrowPayday && tomorrowProfile.expectedSpend > 0) {
    const balanceAfterToday = Math.max(0, spendableBalance - spentToday);
    const expectedFuture = Math.max(0, totalExpectedSpend - todayProfile.expectedSpend);
    const futureSurplus = balanceAfterToday - expectedFuture;
    const futureNonSafe =
      todayProfile.type !== 'safe' && todayProfile.expectedSpend > 0
        ? Math.max(0, nonSafeDays - 1)
        : nonSafeDays;

    if (futureSurplus >= 0) {
      tomorrowAllowance =
        tomorrowProfile.expectedSpend + (futureNonSafe > 0 ? futureSurplus / futureNonSafe : 0);
    } else {
      tomorrowAllowance =
        expectedFuture > 0
          ? tomorrowProfile.expectedSpend * (balanceAfterToday / expectedFuture)
          : 0;
    }
  }

  return {
    today,
    daysUntilIncome,
    billsReserved,
    goalsReserved,
    rawSpendable,
    spendableBalance,
    goalsProtectedMode,
    todayProfile,
    totalExpectedSpend,
    nonSafeDays,
    surplus,
    safeLimit,
    spentToday,
    remainingToday,
    isOverBudget: remainingToday < 0,
    isTomorrowPayday,
    tomorrowAllowance,
    days,
  };
}

// ─── What-if simulation ─────────────────────────────────────────────────────

export interface Scenario {
  /** Extra money spent today (on top of what's already logged). */
  extraSpendToday?: number;
  /** Payday arrives this many days later than planned. */
  paydayDelayDays?: number;
  /** A one-off cost that must be paid before payday. */
  oneOffExpense?: number;
}

export interface ScenarioComparison {
  before: EngineResult;
  after: EngineResult;
  /** Change in today's remaining amount (negative = worse). */
  remainingDelta: number;
  tomorrowDelta: number;
  /** Money you'd have per day until payday, before and after. */
  perDayBefore: number;
  perDayAfter: number;
}

export function simulateScenario(input: EngineInput, scenario: Scenario): ScenarioComparison {
  const before = computeBudget(input);

  const extraSpend = Math.max(0, scenario.extraSpendToday ?? 0);
  const oneOff = Math.max(0, scenario.oneOffExpense ?? 0);
  const delay = Math.max(0, Math.floor(scenario.paydayDelayDays ?? 0));

  const modified: EngineInput = {
    ...input,
    nextPayday:
      input.nextPayday && delay > 0
        ? addDays(new Date(input.nextPayday), delay).toISOString()
        : input.nextPayday,
    // A one-off cost lowers the balance; extra spend today is logged as an expense
    // so it also counts against today's limit.
    balance: input.balance - oneOff,
    expenses:
      extraSpend > 0
        ? [...input.expenses, { amount: extraSpend, date: input.now.toISOString() }]
        : input.expenses,
  };
  // Logged expenses are already part of the ledger balance, so the extra spend
  // must also reduce the balance, otherwise it would only hit today's limit.
  modified.balance -= extraSpend;

  const after = computeBudget(modified);

  const perDay = (r: EngineResult, bal: number) =>
    r.daysUntilIncome > 0 ? Math.max(0, bal) / r.daysUntilIncome : Math.max(0, bal);

  return {
    before,
    after,
    remainingDelta: after.remainingToday - before.remainingToday,
    tomorrowDelta: after.tomorrowAllowance - before.tomorrowAllowance,
    perDayBefore: perDay(before, before.spendableBalance),
    perDayAfter: perDay(after, after.spendableBalance),
  };
}
