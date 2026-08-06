import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { differenceInDays, startOfDay, addMonths, setDate, isBefore, isEqual } from 'date-fns';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  dueDate: number; // Day of the month (1-31)
}

export interface PocketState {
  balance: number;
  nextIncomeDate: string;
  nextIncomeAmount: number;
  expenses: Expense[];
  recurringBills: RecurringBill[];
  
  // Actions
  setBalance: (amount: number) => void;
  setNextIncome: (date: string, amount: number) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  removeExpense: (id: string) => void;
  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => void;
  removeRecurringBill: (id: string) => void;
  
  // Derived state calculators
  getDaysUntilIncome: () => number;
  getSafeSpendingLimit: () => number;
  getRemainingBudgetToday: () => number;
}

export const usePocketStore = create<PocketState>()(
  persist(
    (set, get) => ({
      balance: 2450.00,
      nextIncomeDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      nextIncomeAmount: 3000,
      expenses: [],
      recurringBills: [],

      setBalance: (amount) => set({ balance: amount }),
      
      setNextIncome: (date, amount) => set({ nextIncomeDate: date, nextIncomeAmount: amount }),
      
      addExpense: (expenseData) => set((state) => {
        const newExpense: Expense = {
          ...expenseData,
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
        };
        return { 
          expenses: [newExpense, ...state.expenses],
          balance: state.balance - newExpense.amount 
        };
      }),

      removeExpense: (id) => set((state) => {
        const expense = state.expenses.find(e => e.id === id);
        if (!expense) return state;
        return {
          expenses: state.expenses.filter(e => e.id !== id),
          balance: state.balance + expense.amount // Refund the balance
        };
      }),

      addRecurringBill: (billData) => set((state) => ({
        recurringBills: [...state.recurringBills, { ...billData, id: crypto.randomUUID() }]
      })),

      removeRecurringBill: (id) => set((state) => ({
        recurringBills: state.recurringBills.filter(b => b.id !== id)
      })),

      getDaysUntilIncome: () => {
        const { nextIncomeDate } = get();
        if (!nextIncomeDate) return 0;
        const today = startOfDay(new Date());
        const incomeDate = startOfDay(new Date(nextIncomeDate));
        const diff = differenceInDays(incomeDate, today);
        return Math.max(0, diff);
      },

      getSafeSpendingLimit: () => {
        const { balance, recurringBills, nextIncomeDate } = get();
        const days = get().getDaysUntilIncome();
        if (days === 0) return balance;

        const today = startOfDay(new Date());
        const incomeDate = startOfDay(new Date(nextIncomeDate));

        // Calculate upcoming bills before next payday
        let upcomingBillsTotal = 0;
        
        recurringBills.forEach(bill => {
          let nextBillDate = setDate(today, bill.dueDate);
          
          // If the bill date for this month has already passed today, it happens next month
          if (isBefore(nextBillDate, today)) {
            nextBillDate = addMonths(nextBillDate, 1);
          }

          // If the next bill date is before or strictly equal to the income date (but after today), we must reserve cash for it
          if (isBefore(nextBillDate, incomeDate) || isEqual(nextBillDate, incomeDate)) {
            upcomingBillsTotal += bill.amount;
          }
        });

        const safeBalance = Math.max(0, balance - upcomingBillsTotal);
        return safeBalance / days;
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
      name: 'pocketflow-storage',
    }
  )
);
