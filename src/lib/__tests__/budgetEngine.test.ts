import { describe, expect, it } from 'vitest';
import {
  billOccurrencesUntil,
  computeBudget,
  simulateScenario,
  type EngineInput,
} from '../budgetEngine';
import type { DayProfile, Goal, RecurringBudget } from '@/store/types';

const profiles: DayProfile[] = [
  { id: 'safe', name: 'Safe', type: 'safe', expectedSpend: 0, icon: '', color: '' },
  { id: 'low', name: 'Low', type: 'low', expectedSpend: 200, icon: '', color: '' },
  { id: 'normal', name: 'Normal', type: 'normal', expectedSpend: 400, icon: '', color: '' },
  { id: 'high', name: 'High', type: 'high', expectedSpend: 1000, icon: '', color: '' },
];

// Sun safe, Mon–Thu normal, Fri high, Sat safe
const weeklyPlan: Record<number, string> = {
  0: 'safe', 1: 'normal', 2: 'normal', 3: 'normal', 4: 'normal', 5: 'high', 6: 'safe',
};

// Monday 2026-03-02, midday
const monday = new Date(2026, 2, 2, 12, 0, 0);
const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', name: 'Laptop', icon: '', color: '', priority: 'planned', targetAmount: 10000,
  currentSaved: 0, monthlyContribution: 500, status: 'on-track', createdAt: '', ...over,
});

const bill = (over: Partial<RecurringBudget> = {}): RecurringBudget => ({
  id: 'b', title: 'Rent', amount: 1000, frequency: 'monthly', nextDueDate: iso(2026, 3, 5), ...over,
});

const base = (over: Partial<EngineInput> = {}): EngineInput => ({
  now: monday,
  balance: 5000,
  nextPayday: iso(2026, 3, 6), // Fri → 4 days: Mon..Thu (all normal, 400 each = 1600)
  bills: [],
  goals: [],
  profiles,
  weeklyPlan,
  expenses: [],
  ...over,
});

describe('computeBudget', () => {
  it('splits a surplus across the non-safe days', () => {
    const r = computeBudget(base());
    expect(r.daysUntilIncome).toBe(4);
    expect(r.totalExpectedSpend).toBe(1600);
    expect(r.nonSafeDays).toBe(4);
    // surplus 3400 / 4 days = 850 extra on top of the 400 profile
    expect(r.safeLimit).toBe(1250);
    expect(r.remainingToday).toBe(1250);
    expect(r.isOverBudget).toBe(false);
  });

  it('scales every day down proportionally when money is short', () => {
    const r = computeBudget(base({ balance: 800 }));
    // 800 spendable vs 1600 expected → 50% of the 400 profile
    expect(r.safeLimit).toBe(200);
  });

  it('reserves bills and goals before spendable', () => {
    const r = computeBudget(
      base({ bills: [bill()], goals: [goal()] }),
    );
    expect(r.billsReserved).toBe(1000);
    expect(r.goalsReserved).toBe(500);
    expect(r.spendableBalance).toBe(3500);
  });

  it('ignores completed goals and bills due after payday', () => {
    const r = computeBudget(
      base({
        bills: [bill({ nextDueDate: iso(2026, 3, 20) })],
        goals: [goal({ status: 'completed' })],
      }),
    );
    expect(r.billsReserved).toBe(0);
    expect(r.goalsReserved).toBe(0);
  });

  it('enters protected mode when reserves swallow the balance', () => {
    const r = computeBudget(base({ balance: 1200, bills: [bill()], goals: [goal()] }));
    expect(r.goalsProtectedMode).toBe(true);
    expect(r.spendableBalance).toBe(0);
    expect(r.safeLimit).toBe(0);
  });

  it('gives a safe day a zero limit', () => {
    // Sunday 2026-03-01, payday Fri
    const r = computeBudget(base({ now: new Date(2026, 2, 1, 9), nextPayday: iso(2026, 3, 6) }));
    expect(r.todayProfile.type).toBe('safe');
    expect(r.safeLimit).toBe(0);
  });

  it('on payday the whole spendable balance is available', () => {
    const r = computeBudget(base({ nextPayday: iso(2026, 3, 2) }));
    expect(r.daysUntilIncome).toBe(0);
    expect(r.safeLimit).toBe(5000);
  });

  it('treats an overdue payday as today', () => {
    const r = computeBudget(base({ nextPayday: iso(2026, 2, 20) }));
    expect(r.daysUntilIncome).toBe(0);
  });

  it('subtracts what was already spent today', () => {
    const r = computeBudget(
      base({ expenses: [{ amount: 300, date: monday.toISOString() }, { amount: 999, date: iso(2026, 3, 1) }] }),
    );
    expect(r.spentToday).toBe(300);
    expect(r.remainingToday).toBe(950);
  });

  it('flags overspending', () => {
    const r = computeBudget(base({ expenses: [{ amount: 2000, date: monday.toISOString() }] }));
    expect(r.isOverBudget).toBe(true);
    expect(r.remainingToday).toBeLessThan(0);
  });

  it('reports tomorrow as payday on the last day', () => {
    expect(computeBudget(base({ nextPayday: iso(2026, 3, 3) })).isTomorrowPayday).toBe(true);
    expect(computeBudget(base()).isTomorrowPayday).toBe(false);
  });

  it('lowers tomorrow when more is spent today', () => {
    const calm = computeBudget(base()).tomorrowAllowance;
    const spent = computeBudget(
      base({ expenses: [{ amount: 1500, date: monday.toISOString() }] }),
    ).tomorrowAllowance;
    expect(spent).toBeLessThan(calm);
  });

  it('returns one day entry per day until payday', () => {
    const r = computeBudget(base());
    expect(r.days).toHaveLength(4);
    expect(r.days[0].limit).toBe(r.safeLimit);
  });

  it('survives having no income or profiles configured', () => {
    const r = computeBudget(base({ nextPayday: null, profiles: [], weeklyPlan: {} }));
    expect(r.daysUntilIncome).toBe(0);
    expect(r.safeLimit).toBe(5000);
  });
});

describe('billOccurrencesUntil', () => {
  it('counts a weekly bill once per occurrence before the deadline', () => {
    const weekly = bill({ frequency: 'weekly', nextDueDate: iso(2026, 3, 3) });
    // due 3rd, 10th, 17th, 24th → deadline 25th = 4
    expect(billOccurrencesUntil(weekly, new Date(2026, 2, 25), monday)).toBe(4);
  });

  it('counts a long-overdue bill once, not once per missed cycle', () => {
    // monthly rent forgotten since January: owe it once now, plus the Mar 5 cycle? No —
    // stepping forward from Jan 1 lands on Mar 1 (<= Mar 5), which is a real upcoming cycle.
    const overdue = bill({ nextDueDate: iso(2025, 1, 1) });
    const today = new Date(2026, 2, 2);
    // 1 overdue payment + the cycle falling on Mar 1? Mar 1 < Mar 2 is consumed by catch-up,
    // next due is Apr 1, after the Mar 5 deadline → exactly 1.
    expect(billOccurrencesUntil(overdue, new Date(2026, 2, 5), today)).toBe(1);
  });

  it('an overdue weekly bill reserves the overdue payment plus upcoming ones', () => {
    const overdueWeekly = bill({ frequency: 'weekly', nextDueDate: iso(2026, 2, 1) });
    const today = new Date(2026, 2, 2); // Mon
    // catch-up lands on Mar 8; deadline Mar 20 → Mar 8, 15 = 2, plus the overdue one = 3
    expect(billOccurrencesUntil(overdueWeekly, new Date(2026, 2, 20), today)).toBe(3);
  });

  it('counts nothing when the first due date is after the deadline', () => {
    expect(billOccurrencesUntil(bill({ nextDueDate: iso(2026, 4, 1) }), new Date(2026, 2, 5), monday)).toBe(0);
  });

  it('reserves a weekly bill more than once in the engine', () => {
    const r = computeBudget(
      base({ nextPayday: iso(2026, 3, 20), bills: [bill({ frequency: 'weekly', amount: 100, nextDueDate: iso(2026, 3, 3) })] }),
    );
    // 3rd, 10th, 17th
    expect(r.billsReserved).toBe(300);
  });
});

describe('simulateScenario', () => {
  it('spending more today lowers remaining and tomorrow', () => {
    const s = simulateScenario(base(), { extraSpendToday: 500 });
    expect(s.after.remainingToday).toBeLessThan(s.before.remainingToday);
    expect(s.remainingDelta).toBeLessThan(0);
    expect(s.tomorrowDelta).toBeLessThan(0);
  });

  it('a later payday spreads the money over more days', () => {
    const s = simulateScenario(base(), { paydayDelayDays: 5 });
    expect(s.after.daysUntilIncome).toBe(s.before.daysUntilIncome + 5);
    expect(s.perDayAfter).toBeLessThan(s.perDayBefore);
  });

  it('a one-off cost reduces the balance', () => {
    const s = simulateScenario(base(), { oneOffExpense: 1000 });
    expect(s.after.spendableBalance).toBe(s.before.spendableBalance - 1000);
  });

  it('does not mutate the input', () => {
    const input = base();
    const copy = JSON.stringify(input);
    simulateScenario(input, { extraSpendToday: 100, paydayDelayDays: 2, oneOffExpense: 50 });
    expect(JSON.stringify(input)).toBe(copy);
  });

  it('with no changes, before equals after', () => {
    const s = simulateScenario(base(), {});
    expect(s.remainingDelta).toBe(0);
  });
});
