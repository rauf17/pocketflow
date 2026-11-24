import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  remindersEnabled: boolean;
  setRemindersEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      remindersEnabled: false,
      setRemindersEnabled: (remindersEnabled) => set({ remindersEnabled }),
    }),
    { name: 'pocketflow-settings-store-v1' },
  ),
);
