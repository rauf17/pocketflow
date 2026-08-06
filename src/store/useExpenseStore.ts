import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense } from './types';

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
        expenses: [{ ...expenseData, id: crypto.randomUUID() }, ...state.expenses]
      })),

      removeExpense: (id) => set((state) => ({
        expenses: state.expenses.filter(e => e.id !== id)
      })),

      updateExpense: (id, data) => set((state) => ({
        expenses: state.expenses.map(e => e.id === id ? { ...e, ...data } : e)
      })),

      clearExpenses: () => set({ expenses: [] })
    }),
    {
      name: 'pocketflow-expense-store-v1',
    }
  )
);
