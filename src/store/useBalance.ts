import { useMemo } from 'react';
import { useUserStore } from './useUserStore';
import { useExpenseStore } from './useExpenseStore';
import { computeBalance } from '@/lib/ledger';

/** Current balance, derived from the ledger (opening + deposits − expenses). */
export function useBalance(): number {
  const opening = useUserStore((s) => s.user?.openingBalance ?? 0);
  const deposits = useUserStore((s) => s.deposits);
  const expenses = useExpenseStore((s) => s.expenses);
  return useMemo(() => computeBalance(opening, deposits, expenses), [opening, deposits, expenses]);
}

/** Non-reactive read for event handlers and store actions. */
export function getBalance(): number {
  const { user, deposits } = useUserStore.getState();
  return computeBalance(user?.openingBalance ?? 0, deposits, useExpenseStore.getState().expenses);
}
