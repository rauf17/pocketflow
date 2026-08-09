import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense } from './types';
import { clampExpenseDate } from '@/lib/utils';

interface ExpenseState {
  expenses: Expense[];
  
  // Actions
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  clearExpenses: () => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      expenses: [],

      addExpense: (expenseData) => set((state) => ({
        expenses: [
          { ...expenseData, date: clampExpenseDate(expenseData.date), id: crypto.randomUUID() },
          ...state.expenses
        ]
      })),

      removeExpense: (id) => set((state) => ({
        expenses: state.expenses.filter(e => e.id !== id)
      })),

      // Data-layer guard: a future date can never be persisted, even if it
      // arrives via a direct updateExpense call rather than the Add Expense form.
      updateExpense: (id, data) => set((state) => ({
        expenses: state.expenses.map(e => e.id === id
          ? { ...e, ...data, ...(data.date ? { date: clampExpenseDate(data.date) } : {}) }
          : e
        )
      })),

      clearExpenses: () => set({ expenses: [] })
    }),
    {
      name: 'pocketflow-expense-store-v1',
    }
  )
);
