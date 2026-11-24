import { useEffect, useMemo, useState } from 'react';
import { useUserStore } from './useUserStore';
import { useExpenseStore } from './useExpenseStore';
import { useBudgetStore } from './useBudgetStore';
import { useProfileStore } from './useProfileStore';
import { useGoalStore } from './useGoalStore';
import { useBalance } from './useBalance';
import { computeBudget, type EngineInput, type EngineResult } from '@/lib/budgetEngine';

/** Changes when the calendar day rolls over, so a tab left open past midnight recomputes. */
function useDayKey(): string {
  const key = () => new Date().toDateString();
  const [day, setDay] = useState(key);
  useEffect(() => {
    const check = () => setDay(key());
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return day;
}

/** Everything the engine needs, read reactively from the stores. Null until onboarded. */
export function useEngineInput(): EngineInput | null {
  const income = useUserStore((s) => s.income);
  const user = useUserStore((s) => s.user);
  const expenses = useExpenseStore((s) => s.expenses);
  const bills = useBudgetStore((s) => s.recurringBudgets);
  const profiles = useProfileStore((s) => s.profiles);
  const weeklyPlan = useProfileStore((s) => s.weeklyPlan);
  const goals = useGoalStore((s) => s.goals);
  const balance = useBalance();
  const day = useDayKey();

  return useMemo(() => {
    if (!user || !income) return null;
    return {
      now: new Date(),
      balance,
      nextPayday: income.nextDate,
      bills,
      goals,
      profiles,
      weeklyPlan,
      expenses,
    };
    // `day` is not read inside, but must retrigger the memo so `now` refreshes at midnight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, income, balance, bills, goals, profiles, weeklyPlan, expenses, day]);
}

/** Today's budget, computed by the shared engine. Null until onboarded. */
export function useBudget(): EngineResult | null {
  const input = useEngineInput();
  return useMemo(() => (input ? computeBudget(input) : null), [input]);
}
