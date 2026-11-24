import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateSalt, hashPin, isValidPin, safeEqual } from '@/lib/pin';

interface LockState {
  // persisted
  pinHash: string | null;
  salt: string | null;
  /** Lock after the app has been hidden this many minutes (0 = immediately). */
  autoLockMinutes: number;
  // runtime only
  locked: boolean;
  failedAttempts: number;
  lockedUntil: number;

  setPin: (pin: string) => Promise<boolean>;
  removePin: (currentPin: string) => Promise<boolean>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  setAutoLockMinutes: (minutes: number) => void;
}

export const useLockStore = create<LockState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      salt: null,
      autoLockMinutes: 1,
      // Start locked; Gatekeeper only honours this when a PIN exists.
      locked: true,
      failedAttempts: 0,
      lockedUntil: 0,

      setPin: async (pin) => {
        if (!isValidPin(pin)) return false;
        const salt = generateSalt();
        const pinHash = await hashPin(pin, salt);
        set({ pinHash, salt, locked: false, failedAttempts: 0, lockedUntil: 0 });
        return true;
      },

      removePin: async (currentPin) => {
        const { pinHash, salt } = get();
        if (!pinHash || !salt) return true;
        const ok = safeEqual(await hashPin(currentPin, salt), pinHash);
        if (ok) set({ pinHash: null, salt: null, locked: false });
        return ok;
      },

      unlock: async (pin) => {
        const { pinHash, salt, lockedUntil, failedAttempts } = get();
        if (!pinHash || !salt) {
          set({ locked: false });
          return true;
        }
        if (Date.now() < lockedUntil) return false;

        const ok = safeEqual(await hashPin(pin, salt), pinHash);
        if (ok) {
          set({ locked: false, failedAttempts: 0, lockedUntil: 0 });
          return true;
        }
        const attempts = failedAttempts + 1;
        // After 5 wrong tries, back off 30 seconds (repeats every 5).
        set({
          failedAttempts: attempts,
          lockedUntil: attempts % 5 === 0 ? Date.now() + 30_000 : 0,
        });
        return false;
      },

      lock: () => {
        if (get().pinHash) set({ locked: true });
      },

      setAutoLockMinutes: (autoLockMinutes) => set({ autoLockMinutes }),
    }),
    {
      name: 'pocketflow-lock-store-v1',
      partialize: (s) => ({ pinHash: s.pinHash, salt: s.salt, autoLockMinutes: s.autoLockMinutes }),
    },
  ),
);
