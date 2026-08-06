import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DayProfile } from './types';

interface ProfileState {
  profiles: DayProfile[];
  weeklyPlan: Record<number, string>; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Actions
  addProfile: (profile: Omit<DayProfile, 'id'>) => void;
  updateProfile: (id: string, data: Partial<DayProfile>) => void;
  deleteProfile: (id: string) => void;
  setDayProfile: (dayOfWeek: number, profileId: string) => void;
}

const DEFAULT_PROFILES: DayProfile[] = [
  { id: 'safe-day', name: 'Safe Day', type: 'safe', expectedSpend: 0, icon: 'Shield', color: 'emerald' },
  { id: 'low-spend', name: 'Low Spend', type: 'low', expectedSpend: 200, icon: 'Coffee', color: 'blue' },
  { id: 'normal-day', name: 'Normal Day', type: 'normal', expectedSpend: 400, icon: 'Briefcase', color: 'orange' },
  { id: 'high-spend', name: 'High Spend', type: 'high', expectedSpend: 1000, icon: 'ShoppingBag', color: 'rose' },
];

const DEFAULT_WEEKLY_PLAN: Record<number, string> = {
  0: 'safe-day',   // Sunday
  1: 'normal-day', // Monday
  2: 'normal-day', // Tuesday
  3: 'normal-day', // Wednesday
  4: 'normal-day', // Thursday
  5: 'high-spend', // Friday
  6: 'safe-day',   // Saturday
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profiles: DEFAULT_PROFILES,
      weeklyPlan: DEFAULT_WEEKLY_PLAN,

      addProfile: (profileData) => set((state) => ({
        profiles: [...state.profiles, { ...profileData, id: Math.random().toString(36).substring(2, 9) }]
      })),

      updateProfile: (id, data) => set((state) => ({
        profiles: state.profiles.map(p => p.id === id ? { ...p, ...data } : p)
      })),

      deleteProfile: (id) => set((state) => {
        // If we delete a profile that's in the weekly plan, revert that day to safe-day
        const newPlan = { ...state.weeklyPlan };
        Object.keys(newPlan).forEach(key => {
          const numKey = Number(key);
          if (newPlan[numKey] === id) {
            newPlan[numKey] = 'safe-day';
          }
        });

        return {
          profiles: state.profiles.filter(p => p.id !== id),
          weeklyPlan: newPlan
        };
      }),

      setDayProfile: (dayOfWeek, profileId) => set((state) => ({
        weeklyPlan: { ...state.weeklyPlan, [dayOfWeek]: profileId }
      })),
    }),
    {
      name: 'pocketflow-profiles-store-v1',
    }
  )
);
