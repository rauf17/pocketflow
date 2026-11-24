import type { Deposit, Expense } from '@/store/types';

/**
 * The balance is never stored — it is derived from the ledger:
 *   opening balance + deposits (paydays, manual income, corrections) − expenses
 * so an expense and the balance can never drift apart, and deleting or editing
 * an expense automatically gives the money back.
 */
export function computeBalance(
  openingBalance: number,
  deposits: Deposit[],
  expenses: Pick<Expense, 'amount'>[],
): number {
  const income = deposits.reduce((sum, d) => sum + d.amount, 0);
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  return openingBalance + income - spent;
}
