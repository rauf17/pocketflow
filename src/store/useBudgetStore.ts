import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Category, RecurringBudget } from './types';

interface BudgetState {
  categories: Category[];
  recurringBudgets: RecurringBudget[];
  
  // Actions
  addCategory: (category: Omit<Category, 'id'>) => void;
  removeCategory: (id: string) => void;
  
  addRecurringBudget: (budget: Omit<RecurringBudget, 'id'>) => void;
  removeRecurringBudget: (id: string) => void;
  updateRecurringBudget: (id: string, data: Partial<RecurringBudget>) => void;
  
  clearBudgets: () => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
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

      clearBudgets: () => set({ categories: [], recurringBudgets: [] })
    }),
    {
      name: 'pocketflow-budget-store-v1',
    }
  )
);
