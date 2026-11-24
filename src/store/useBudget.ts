import { useMemo } from 'react';
import { useUserStore } from './useUserStore';
import { useExpenseStore } from './useExpenseStore';
import { useBudgetStore } from './useBudgetStore';
import { useProfileStore } from './useProfileStore';
import { useGoalStore } from './useGoalStore';
import { useBalance } from './useBalance';
import { computeBudget, type EngineInput, type EngineResult } from '@/lib/budgetEngine';

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
  }, [user, income, balance, bills, goals, profiles, weeklyPlan, expenses]);
}

/** Today's budget, computed by the shared engine. Null until onboarded. */
export function useBudget(): EngineResult | null {
  const input = useEngineInput();
  return useMemo(() => (input ? computeBudget(input) : null), [input]);
}
