import { isSameMonth, isAfter, endOfDay } from 'date-fns';
import type { Category, Expense } from '@/store/types';

export interface CategoryUsage {
  category: Category;
  spent: number;
  limit: number | null;
  /** 0–1+ ; null when no limit is set. */
  ratio: number | null;
  status: 'none' | 'ok' | 'warning' | 'over';
}

export const WARNING_RATIO = 0.8;

export function categorySpentThisMonth(
  expenses: Pick<Expense, 'amount' | 'date' | 'categoryId'>[],
  categoryId: string,
  now: Date = new Date(),
): number {
  return expenses
    .filter((e) => {
      if (e.categoryId !== categoryId) return false;
      const d = new Date(e.date);
      return !isNaN(d.getTime()) && isSameMonth(d, now) && !isAfter(d, endOfDay(now));
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function usageStatus(spent: number, limit: number | null | undefined): CategoryUsage['status'] {
  if (!limit || limit <= 0) return 'none';
  const ratio = spent / limit;
  if (ratio > 1) return 'over';
  if (ratio >= WARNING_RATIO) return 'warning';
  return 'ok';
}

export function categoryUsage(
  categories: Category[],
  expenses: Pick<Expense, 'amount' | 'date' | 'categoryId'>[],
  now: Date = new Date(),
): CategoryUsage[] {
  return categories.map((category) => {
    const spent = categorySpentThisMonth(expenses, category.id, now);
    const limit = category.monthlyLimit && category.monthlyLimit > 0 ? category.monthlyLimit : null;
    return {
      category,
      spent,
      limit,
      ratio: limit ? spent / limit : null,
      status: usageStatus(spent, limit),
    };
  });
}

/**
 * Message to show right after adding an expense, if it pushed its category over
 * the warning threshold or the limit. Null when nothing crossed.
 */
export function limitCrossingMessage(
  category: Category | undefined,
  spentBefore: number,
  amount: number,
  format: (n: number) => string,
): string | null {
  if (!category?.monthlyLimit || category.monthlyLimit <= 0) return null;
  const before = usageStatus(spentBefore, category.monthlyLimit);
  const after = usageStatus(spentBefore + amount, category.monthlyLimit);
  if (before === after || after === 'ok' || after === 'none') return null;
  const total = spentBefore + amount;
  return after === 'over'
    ? `${category.name} is over its limit: ${format(total)} of ${format(category.monthlyLimit)}.`
    : `${category.name} is at ${Math.round((total / category.monthlyLimit) * 100)}% of its ${format(category.monthlyLimit)} limit.`;
}
