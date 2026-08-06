import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { differenceInDays, startOfDay } from 'date-fns';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface PocketState {
  balance: number;
  nextIncomeDate: string;
  nextIncomeAmount: number;
  expenses: Expense[];
  
  // Actions
  setBalance: (amount: number) => void;
  setNextIncome: (date: string, amount: number) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  
  // Derived state calculators
  getDaysUntilIncome: () => number;
  getSafeSpendingLimit: () => number;
  getRemainingBudgetToday: () => number;
}

export const usePocketStore = create<PocketState>()(
  persist(
    (set, get) => ({
      balance: 2450.00, // Initial mock data
      nextIncomeDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days from now
      nextIncomeAmount: 3000,
      expenses: [],

      setBalance: (amount) => set({ balance: amount }),
      
      setNextIncome: (date, amount) => set({ nextIncomeDate: date, nextIncomeAmount: amount }),
      
      addExpense: (expenseData) => set((state) => {
        const newExpense: Expense = {
          ...expenseData,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
        };
        return { 
          expenses: [...state.expenses, newExpense],
          balance: state.balance - newExpense.amount 
        };
      }),

      getDaysUntilIncome: () => {
        const { nextIncomeDate } = get();
        if (!nextIncomeDate) return 0;
        const today = startOfDay(new Date());
        const incomeDate = startOfDay(new Date(nextIncomeDate));
        const diff = differenceInDays(incomeDate, today);
        return Math.max(0, diff);
      },

      getSafeSpendingLimit: () => {
        const { balance } = get();
        const days = get().getDaysUntilIncome();
        if (days === 0) return balance;
        return balance / days;
      },

      getRemainingBudgetToday: () => {
        const safeLimit = get().getSafeSpendingLimit();
        const today = startOfDay(new Date());
        
        const expensesToday = get().expenses
          .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
          .reduce((sum, e) => sum + e.amount, 0);

        return safeLimit - expensesToday;
      }
    }),
    {
      name: 'pocketflow-storage', // key in local storage
    }
  )
);
