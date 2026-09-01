import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Category, RecurringBudget } from './types';
import { useUserStore } from './useUserStore';
import { useExpenseStore } from './useExpenseStore';
import { addDays, addWeeks, addMonths, formatISO } from 'date-fns';

interface BudgetState {
  categories: Category[];
  recurringBudgets: RecurringBudget[];
  
  // Actions
  addCategory: (category: Omit<Category, 'id'>) => void;
  removeCategory: (id: string) => void;
  
  addRecurringBudget: (budget: Omit<RecurringBudget, 'id'>) => void;
  removeRecurringBudget: (id: string) => void;
  updateRecurringBudget: (id: string, data: Partial<RecurringBudget>) => void;
  payRecurringBudget: (id: string) => void;
  
  clearBudgets: () => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      categories: [
        { id: '1', name: 'Food', icon: 'utensils', color: '#10b981' },
        { id: '2', name: 'Transport', icon: 'car', color: '#f59e0b' },
      ],
      recurringBudgets: [],

      addCategory: (data) => set((state) => ({
        categories: [...state.categories, { ...data, id: crypto.randomUUID() }]
      })),

      removeCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id)
      })),

      addRecurringBudget: (data) => set((state) => ({
        recurringBudgets: [...state.recurringBudgets, { ...data, id: crypto.randomUUID() }]
      })),

      removeRecurringBudget: (id) => set((state) => ({
        recurringBudgets: state.recurringBudgets.filter(b => b.id !== id)
      })),

      updateRecurringBudget: (id, data) => set((state) => ({
        recurringBudgets: state.recurringBudgets.map(b => b.id === id ? { ...b, ...data } : b)
      })),

      payRecurringBudget: (id) => {
        const budget = get().recurringBudgets.find(b => b.id === id);
        if (!budget) return;

        // 1. Log expense & decrement user balance
        useExpenseStore.getState().addExpense({
          amount: budget.amount,
          description: budget.title,
          date: new Date().toISOString(),
          categoryId: '1', // General / Bills category
        });
        useUserStore.getState().updateBalance(-budget.amount);

        // 2. Advance due date based on frequency
        const currentDate = new Date(budget.nextDueDate);
        let nextDueDate = currentDate;
        if (budget.frequency === 'daily') nextDueDate = addDays(currentDate, 1);
        else if (budget.frequency === 'weekly') nextDueDate = addWeeks(currentDate, 1);
        else if (budget.frequency === 'monthly') nextDueDate = addMonths(currentDate, 1);
        else if (budget.frequency === 'semester') nextDueDate = addMonths(currentDate, 6);

        set((state) => ({
          recurringBudgets: state.recurringBudgets.map(b =>
            b.id === id ? { ...b, nextDueDate: formatISO(nextDueDate) } : b
          )
        }));
      },

      clearBudgets: () => set({ categories: [], recurringBudgets: [] })
    }),
    {
      name: 'pocketflow-budget-store-v1',
    }
  )
);

