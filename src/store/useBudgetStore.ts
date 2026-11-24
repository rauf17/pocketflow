import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Category, RecurringBudget } from './types';
import { useExpenseStore } from './useExpenseStore';
import { addDays, addWeeks, addMonths, formatISO } from 'date-fns';

export const BILLS_CATEGORY_ID = 'bills';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Food', icon: 'utensils', color: '#10b981' },
  { id: '2', name: 'Transport', icon: 'car', color: '#f59e0b' },
  { id: BILLS_CATEGORY_ID, name: 'Bills', icon: 'receipt', color: '#6366f1' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#ec4899' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#8b5cf6' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#ef4444' },
  { id: 'education', name: 'Education', icon: 'book', color: '#0ea5e9' },
  { id: 'other', name: 'Other', icon: 'circle', color: '#94a3b8' },
];

interface BudgetState {
  categories: Category[];
  recurringBudgets: RecurringBudget[];

  // Actions
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  removeCategory: (id: string) => void;

  addRecurringBudget: (budget: Omit<RecurringBudget, 'id'>) => void;
  removeRecurringBudget: (id: string) => void;
  updateRecurringBudget: (id: string, data: Partial<RecurringBudget>) => void;
  /** Logs the payment as an expense and advances the due date. Returns what is needed to undo it. */
  payRecurringBudget: (id: string) => { expenseId: string; previousDueDate: string } | null;

  clearBudgets: () => void;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      recurringBudgets: [],

      addCategory: (data) => set((state) => ({
        categories: [...state.categories, { ...data, id: crypto.randomUUID() }]
      })),

      updateCategory: (id, data) => set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, ...data } : c)
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
        if (!budget) return null;

        // 1. Log the expense. The balance is derived from the ledger, so it drops automatically.
        const expenseId = useExpenseStore.getState().addExpense({
          amount: budget.amount,
          description: budget.title,
          date: new Date().toISOString(),
          categoryId: BILLS_CATEGORY_ID,
        });

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

        return { expenseId, previousDueDate: budget.nextDueDate };
      },

      clearBudgets: () => set({ categories: [], recurringBudgets: [] })
    }),
    {
      name: 'pocketflow-budget-store-v1',
      version: 2,
      // v2: richer default categories + a dedicated Bills category. Existing users
      // keep their own categories and gain any default (matched by name) they lack.
      migrate: (persisted: unknown) => {
        const state = persisted as { categories?: Category[] } | undefined;
        if (!state) return state as unknown as BudgetState;
        const existing = state.categories ?? [];
        const names = new Set(existing.map(c => c.name.toLowerCase()));
        const missing = DEFAULT_CATEGORIES.filter(c => !names.has(c.name.toLowerCase()));
        state.categories = [...existing, ...missing];
        return state as unknown as BudgetState;
      },
    }
  )
);
