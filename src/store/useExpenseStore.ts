import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense, Favorite } from './types';
import { clampExpenseDate } from '@/lib/utils';

interface ExpenseState {
  expenses: Expense[];
  favorites: Favorite[];

  // Actions
  addExpense: (expense: Omit<Expense, 'id'>) => string;
  /** Re-inserts a previously removed expense with its original id (undo). */
  restoreExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  clearExpenses: () => void;

  addFavorite: (favorite: Omit<Favorite, 'id'>) => void;
  removeFavorite: (id: string) => void;
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      expenses: [],
      favorites: [],

      addExpense: (expenseData) => {
        const id = crypto.randomUUID();
        set((state) => ({
          expenses: [
            { ...expenseData, date: clampExpenseDate(expenseData.date), id },
            ...state.expenses
          ]
        }));
        return id;
      },

      restoreExpense: (expense) => set((state) => ({
        expenses: state.expenses.some(e => e.id === expense.id)
          ? state.expenses
          : [expense, ...state.expenses]
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

      clearExpenses: () => set({ expenses: [] }),

      addFavorite: (favorite) => set((state) => {
        // Same description + amount is the same favorite.
        const exists = state.favorites.some(
          f => f.description.toLowerCase() === favorite.description.toLowerCase() && f.amount === favorite.amount
        );
        return exists
          ? state
          : { favorites: [...state.favorites, { ...favorite, id: crypto.randomUUID() }].slice(-12) };
      }),

      removeFavorite: (id) => set((state) => ({
        favorites: state.favorites.filter(f => f.id !== id)
      })),
    }),
    {
      name: 'pocketflow-expense-store-v1',
    }
  )
);
