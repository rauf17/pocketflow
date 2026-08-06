import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Goal, GoalPriority, GoalStatus } from './types';
import { differenceInMonths, addMonths, formatISO } from 'date-fns';

// Priority order for budget engine (lower index = higher priority)
export const PRIORITY_ORDER: GoalPriority[] = ['critical', 'important', 'planned', 'nice-to-have'];

// Compute goal status based on saved amount and monthly contribution
export function computeGoalStatus(goal: Goal): GoalStatus {
  if (goal.currentSaved >= goal.targetAmount) return 'completed';
  if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return 'at-risk';

  const remaining = goal.targetAmount - goal.currentSaved;
  const monthsNeeded = remaining / goal.monthlyContribution;

  if (goal.targetDate) {
    const monthsAvailable = differenceInMonths(new Date(goal.targetDate), new Date());
    if (monthsAvailable <= 0) return 'behind';
    if (monthsNeeded <= monthsAvailable * 0.8) return 'ahead';
    if (monthsNeeded <= monthsAvailable) return 'on-track';
    return 'behind';
  }

  return 'on-track';
}

// Compute projected completion date ISO string
export function computeCompletionDate(goal: Goal): string | null {
  if (goal.currentSaved >= goal.targetAmount) return null;
  if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return null;
  const remaining = goal.targetAmount - goal.currentSaved;
  const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);
  return formatISO(addMonths(new Date(), monthsNeeded));
}

// Total monthly contribution reserved across ALL goals
export function totalGoalContributions(goals: Goal[]): number {
  return goals
    .filter(g => g.status !== 'completed')
    .reduce((sum, g) => sum + g.monthlyContribution, 0);
}

// Sort goals by priority order
export function sortGoalsByPriority(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
}

interface GoalState {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'status' | 'createdAt'>) => void;
  updateGoal: (id: string, data: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addContribution: (id: string, amount: number) => void;
  clearGoals: () => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      goals: [],

      addGoal: (data) => {
        const newGoal: Goal = {
          ...data,
          id: crypto.randomUUID(),
          status: 'on-track',
          createdAt: new Date().toISOString(),
        };
        newGoal.status = computeGoalStatus(newGoal);
        set((state) => ({ goals: [...state.goals, newGoal] }));
      },

      updateGoal: (id, data) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== id) return g;
            const updated = { ...g, ...data };
            updated.status = computeGoalStatus(updated);
            return updated;
          }),
        }));
      },

      deleteGoal: (id) =>
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),

      addContribution: (id, amount) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== id) return g;
            const updated = { ...g, currentSaved: g.currentSaved + amount };
            updated.status = computeGoalStatus(updated);
            return updated;
          }),
        }));
      },

      clearGoals: () => set({ goals: [] }),
    }),
    {
      name: 'pocketflow-goal-store-v1',
    }
  )
);
