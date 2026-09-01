import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Income } from './types';
import { startOfDay, isBefore, isEqual, addMonths, addWeeks, formatISO } from 'date-fns';

interface UserState {
  user: User | null;
  income: Income | null;
  
  setUser: (user: Partial<User>) => void;
  setIncome: (income: Income) => void;
  completeOnboarding: () => void;
  updateBalance: (amount: number) => void;
  processAutoPayday: () => void;
  resetUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      income: null,

      setUser: (userData) => set((state) => ({ 
        user: state.user ? { ...state.user, ...userData } : { 
          name: '', 
          balance: 0, 
          currency: 'PKR', 
          theme: 'dark',
          hostelDaysMode: false,
          isOnboarded: false,
          id: crypto.randomUUID(),
          ...userData 
        } as User 
      })),

      setIncome: (income) => set({ income }),

      completeOnboarding: () => set((state) => {
        if (state.user) {
          return { user: { ...state.user, isOnboarded: true } };
        }
        return state;
      }),

      updateBalance: (amount) => set((state) => {
        if (state.user) {
          return { user: { ...state.user, balance: state.user.balance + amount } };
        }
        return state;
      }),

      processAutoPayday: () => {
        const { user, income } = get();
        if (!user || !income || !income.nextDate || !income.amount) return;

        const today = startOfDay(new Date());
        let currentNextDate = startOfDay(new Date(income.nextDate));

        // Check if payday has arrived or passed
        if (isBefore(currentNextDate, today) || isEqual(currentNextDate, today)) {
          let updatedBalance = user.balance;
          const frequency = income.frequency || 'monthly';

          // Loop forward to advance the payday date past or to today, depositing paycheck amount each time
          while (isBefore(currentNextDate, today) || isEqual(currentNextDate, today)) {
            updatedBalance += income.amount;
            if (frequency === 'weekly') {
              currentNextDate = addWeeks(currentNextDate, 1);
            } else if (frequency === 'bi-weekly') {
              currentNextDate = addWeeks(currentNextDate, 2);
            } else {
              // Default to monthly
              currentNextDate = addMonths(currentNextDate, 1);
            }
          }

          set({
            user: { ...user, balance: updatedBalance },
            income: { ...income, nextDate: formatISO(currentNextDate) },
          });
        }
      },

      resetUser: () => set({ user: null, income: null }),
    }),
    {
      name: 'pocketflow-user-store-v2',
    }
  )
);

