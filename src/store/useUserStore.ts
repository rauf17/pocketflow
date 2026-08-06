import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Income } from './types';

interface UserState {
  user: User | null;
  income: Income | null;
  
  // Actions
  setUser: (user: Partial<User>) => void;
  setIncome: (income: Partial<Income>) => void;
  completeOnboarding: () => void;
  updateBalance: (amount: number) => void; // Can be negative for subtraction
  resetUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      income: null,

      setUser: (userData) => set((state) => ({ 
        user: state.user ? { ...state.user, ...userData } : { ...userData } as User 
      })),

      setIncome: (incomeData) => set((state) => ({ 
        income: state.income ? { ...state.income, ...incomeData } : { ...incomeData } as Income 
      })),

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

      resetUser: () => set({ user: null, income: null }),
    }),
    {
      name: 'pocketflow-user-store-v1',
    }
  )
);
