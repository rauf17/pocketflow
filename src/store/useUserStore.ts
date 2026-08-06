import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Income } from './types';

interface UserState {
  user: User | null;
  income: Income | null;
  
  setUser: (user: Partial<User>) => void;
  setIncome: (income: Income) => void;
  completeOnboarding: () => void;
  updateBalance: (amount: number) => void;
  resetUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
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

      resetUser: () => set({ user: null, income: null }),
    }),
    {
      name: 'pocketflow-user-store-v2',
    }
  )
);
