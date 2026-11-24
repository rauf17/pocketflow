import { describe, expect, it } from 'vitest';
import { computeBalance } from '../ledger';
import { parseQuickEntry } from '../quickEntry';
import { buildWeeklyReview } from '../weeklyReview';
import { formatMoney, getCurrencySymbol } from '../currency';
import { DEFAULT_CATEGORIES } from '@/store/useBudgetStore';
import type { DayProfile, Deposit, Expense } from '@/store/types';

describe('computeBalance', () => {
  const dep = (amount: number): Deposit => ({
    id: String(amount), amount, date: '', label: '', kind: 'manual',
  });

  it('is opening + deposits − expenses', () => {
    expect(computeBalance(1000, [dep(500), dep(-100)], [{ amount: 300 }, { amount: 50 }])).toBe(1050);
  });

  it('removing an expense gives the money back', () => {
    const expenses = [{ amount: 300 }, { amount: 50 }];
    expect(computeBalance(1000, [], expenses.slice(1))).toBe(950);
  });

  it('handles an empty ledger', () => {
    expect(computeBalance(0, [], [])).toBe(0);
  });
});

describe('parseQuickEntry', () => {
  const cats = DEFAULT_CATEGORIES;
  const name = (id?: string) => cats.find((c) => c.id === id)?.name;

  it('parses "500 lunch"', () => {
    const r = parseQuickEntry('500 lunch', cats);
    expect(r).toMatchObject({ amount: 500, description: 'lunch', daysAgo: 0 });
    expect(name(r?.categoryId)).toBe('Food');
  });

  it('parses the amount in any position', () => {
    expect(parseQuickEntry('lunch with friends 750', cats)).toMatchObject({ amount: 750, description: 'lunch with friends' });
  });

  it('understands k suffix and currency prefixes', () => {
    expect(parseQuickEntry('rs 1.5k uber', cats)?.amount).toBe(1500);
    expect(parseQuickEntry('Rs2k movie', cats)?.amount).toBe(2000);
    expect(parseQuickEntry('1,200 groceries', cats)?.amount).toBe(1200);
  });

  it('understands yesterday', () => {
    expect(parseQuickEntry('yesterday 200 chai', cats)).toMatchObject({ amount: 200, daysAgo: 1 });
  });

  it('matches a category by its own name', () => {
    expect(name(parseQuickEntry('300 shopping', cats)?.categoryId)).toBe('Shopping');
  });

  it('returns null without a usable amount', () => {
    expect(parseQuickEntry('lunch', cats)).toBeNull();
    expect(parseQuickEntry('', cats)).toBeNull();
    expect(parseQuickEntry('0 lunch', cats)).toBeNull();
  });

  it('only takes the first number as the amount', () => {
    const r = parseQuickEntry('500 table 4', cats);
    expect(r?.amount).toBe(500);
    expect(r?.description).toBe('table 4');
  });
});

describe('currency', () => {
  it('knows common symbols and falls back safely', () => {
    expect(getCurrencySymbol('PKR')).toBe('Rs');
    expect(getCurrencySymbol('inr')).toBe('₹');
    expect(getCurrencySymbol(undefined)).toBe('$');
  });

  it('formats with grouping', () => {
    expect(formatMoney(12345, 'PKR')).toBe('Rs 12,345');
    expect(formatMoney(-50, 'USD')).toBe('-$50');
    expect(formatMoney(1.5, 'USD', { decimals: 2 })).toBe('$1.50');
  });
});

describe('buildWeeklyReview', () => {
  const profiles: DayProfile[] = [
    { id: 'n', name: 'Normal', type: 'normal', expectedSpend: 400, icon: '', color: '' },
  ];
  const plan = { 0: 'n', 1: 'n', 2: 'n', 3: 'n', 4: 'n', 5: 'n', 6: 'n' };
  const now = new Date(2026, 2, 8, 12);
  const exp = (amount: number, daysAgo: number, categoryId?: string): Expense => ({
    id: `${amount}-${daysAgo}`, amount, description: '', categoryId,
    date: new Date(2026, 2, 8 - daysAgo, 10).toISOString(),
  });

  it('totals planned vs actual over 7 days', () => {
    const r = buildWeeklyReview({
      now, profiles, weeklyPlan: plan, categories: DEFAULT_CATEGORIES,
      expenses: [exp(500, 0, '1'), exp(100, 1, '1'), exp(900, 2, '2')],
    });
    expect(r.days).toHaveLength(7);
    expect(r.totalPlanned).toBe(2800);
    expect(r.totalActual).toBe(1500);
    expect(r.variance).toBe(-1300);
    expect(r.overDays).toBe(2); // 500>400 and 900>400
    expect(r.noSpendDays).toBe(4);
    expect(r.topCategory?.name).toBe('Transport'); // 900 vs 600 for Food
  });

  it('suggests lowering a profile that is consistently overestimated', () => {
    // never spend anything for 4 weeks while planning 400/day
    const r = buildWeeklyReview({ now, profiles, weeklyPlan: plan, categories: [], expenses: [] });
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.suggestions[0].direction).toBe('lower');
  });

  it('ignores expenses outside the week', () => {
    const r = buildWeeklyReview({
      now, profiles, weeklyPlan: plan, categories: [], expenses: [exp(9999, 20)],
    });
    expect(r.totalActual).toBe(0);
  });
});
