import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Income, Deposit } from './types';
import { startOfDay, isBefore, isEqual, addMonths, addWeeks, formatISO } from 'date-fns';

interface UserState {
  user: User | null;
  income: Income | null;
  deposits: Deposit[];
  
  setUser: (user: Partial<User>) => void;
  setIncome: (income: Income) => void;
  completeOnboarding: () => void;
  setHasSeenTour: (hasSeen: boolean) => void;
  addDeposit: (deposit: Omit<Deposit, 'id'>) => string;
  removeDeposit: (id: string) => void;
  restoreDeposit: (deposit: Deposit) => void;
  /** Records a correcting entry so the derived balance equals `target`. */
  adjustBalanceTo: (target: number, currentBalance: number) => void;
  processAutoPayday: () => void;
  resetUser: () => void;
}

/** Sum of expenses straight from storage (the expense store may not be hydrated yet). */
function readStoredExpenseTotal(): number {
  try {
    const raw = localStorage.getItem('pocketflow-expense-store-v1');
    const expenses: { amount?: number }[] = raw ? JSON.parse(raw)?.state?.expenses ?? [] : [];
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Upgrades persisted user data. Exported so the migration can be unit-tested.
 *
 * v4: the balance is now derived from a ledger. The old stored balance was
 * "opening + deposits − expenses", so with no deposit history the opening
 * balance is the old balance plus everything spent so far.
 */
export function migrateUserState(persisted: unknown, getTotalSpent: () => number) {
  const state = persisted as
    | { user?: (Partial<User> & { balance?: number }) | null; deposits?: Deposit[] }
    | undefined;
  if (!state) return state;

  // Users onboarded before the tour existed must not get the tour.
  if (state.user && state.user.isOnboarded && state.user.hasSeenTour === undefined) {
    state.user = { ...state.user, hasSeenTour: true };
  }

  if (state.user && state.user.openingBalance === undefined) {
    const { balance, ...rest } = state.user;
    state.user = { ...rest, openingBalance: (balance ?? 0) + getTotalSpent() };
  }
  if (!state.deposits) state.deposits = [];
  return state;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      income: null,
      deposits: [],

      setUser: (userData) => set((state) => ({ 
        user: state.user ? { ...state.user, ...userData } : { 
          name: '', 
          openingBalance: 0,
          currency: 'PKR', 
          theme: 'dark',
          hostelDaysMode: false,
          isOnboarded: false,
          hasSeenTour: false,
          id: crypto.randomUUID(),
          ...userData 
        } as User 
      })),

      setIncome: (income) => set({ income }),

      completeOnboarding: () => set((state) => {
        if (state.user) {
          return { user: { ...state.user, isOnboarded: true, hasSeenTour: false } };
        }
        return state;
      }),

      setHasSeenTour: (hasSeen) => set((state) => {
        if (state.user) {
          return { user: { ...state.user, hasSeenTour: hasSeen } };
        }
        return state;
      }),

      addDeposit: (deposit) => {
        const id = crypto.randomUUID();
        set((state) => ({ deposits: [{ ...deposit, id }, ...state.deposits] }));
        return id;
      },

      removeDeposit: (id) => set((state) => ({
        deposits: state.deposits.filter((d) => d.id !== id),
      })),

      restoreDeposit: (deposit) => set((state) => ({
        deposits: state.deposits.some((d) => d.id === deposit.id)
          ? state.deposits
          : [deposit, ...state.deposits],
      })),

      adjustBalanceTo: (target, currentBalance) => {
        const delta = target - currentBalance;
        if (!isFinite(delta) || Math.abs(delta) < 0.005) return;
        get().addDeposit({
          amount: delta,
          date: new Date().toISOString(),
          label: 'Balance correction',
          kind: 'adjustment',
        });
      },

      processAutoPayday: () => {
        const { user, income } = get();
        if (!user || !income || !income.nextDate || !income.amount) return;

        const today = startOfDay(new Date());
        let currentNextDate = startOfDay(new Date(income.nextDate));

        // Check if payday has arrived or passed
        if (isBefore(currentNextDate, today) || isEqual(currentNextDate, today)) {
          const frequency = income.frequency || 'monthly';
          const known = new Set(get().deposits.map((d) => d.id));
          const newDeposits: Deposit[] = [];

          // Walk the payday forward to today, recording one deposit per payday.
          // The id is derived from the date so this can never double-credit.
          while (isBefore(currentNextDate, today) || isEqual(currentNextDate, today)) {
            const id = `payday-${formatISO(currentNextDate, { representation: 'date' })}`;
            if (!known.has(id)) {
              newDeposits.push({
                id,
                amount: income.amount,
                date: currentNextDate.toISOString(),
                label: 'Payday',
                kind: 'payday',
              });
              known.add(id);
            }
            if (frequency === 'weekly') {
              currentNextDate = addWeeks(currentNextDate, 1);
            } else if (frequency === 'bi-weekly') {
              currentNextDate = addWeeks(currentNextDate, 2);
            } else if (frequency === 'semester') {
              currentNextDate = addMonths(currentNextDate, 6);
            } else {
              // Default to monthly
              currentNextDate = addMonths(currentNextDate, 1);
            }
          }

          set((state) => ({
            deposits: [...newDeposits.reverse(), ...state.deposits],
            income: { ...income, nextDate: formatISO(currentNextDate) },
          }));
        }
      },

      resetUser: () => set({ user: null, income: null, deposits: [] }),
    }),
    {
      name: 'pocketflow-user-store-v2',
      // Bump this whenever the persisted shape changes; `migrate` runs once for
      // any older saved data. NEVER reference `useUserStore` from
      // onRehydrateStorage: localStorage hydrates synchronously *inside*
      // create(), so the const doesn't exist yet (TDZ error) and zustand
      // swallows it, leaving hasHydrated() === false forever.
      version: 4,
      migrate: (persisted: unknown) => migrateUserState(persisted, readStoredExpenseTotal) as unknown as UserState,
    }
  )
);
