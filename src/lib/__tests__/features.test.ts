import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryUsage, limitCrossingMessage, usageStatus } from '../categoryBudgets';
import { dueReminders } from '../reminders';
import { generateSalt, hashPin, isValidPin, safeEqual } from '../pin';
import type { Category, Income, RecurringBudget } from '@/store/types';

describe('category budgets', () => {
  const food: Category = { id: 'f', name: 'Food', icon: '', color: '', monthlyLimit: 1000 };
  const now = new Date(2026, 2, 15, 12);
  const spend = (amount: number, d: number, categoryId = 'f') => ({
    amount, categoryId, date: new Date(2026, 2, d, 10).toISOString(),
  });

  it('classifies usage against the limit', () => {
    expect(usageStatus(500, 1000)).toBe('ok');
    expect(usageStatus(800, 1000)).toBe('warning');
    expect(usageStatus(1000, 1000)).toBe('warning');
    expect(usageStatus(1001, 1000)).toBe('over');
    expect(usageStatus(5000, undefined)).toBe('none');
  });

  it('only counts this month and this category', () => {
    const [u] = categoryUsage(
      [food],
      [spend(300, 3), spend(200, 10), spend(999, 3, 'other'), { amount: 700, categoryId: 'f', date: new Date(2026, 1, 20).toISOString() }],
      now,
    );
    expect(u.spent).toBe(500);
    expect(u.ratio).toBeCloseTo(0.5);
  });

  it('warns only when an expense crosses a threshold', () => {
    const fmt = (n: number) => String(n);
    expect(limitCrossingMessage(food, 500, 100, fmt)).toBeNull(); // 60%
    expect(limitCrossingMessage(food, 700, 150, fmt)).toMatch(/85%/); // crosses 80%
    expect(limitCrossingMessage(food, 900, 50, fmt)).toBeNull(); // already warning, still warning
    expect(limitCrossingMessage(food, 950, 100, fmt)).toMatch(/over its limit/);
    expect(limitCrossingMessage({ ...food, monthlyLimit: undefined }, 0, 5000, fmt)).toBeNull();
    expect(limitCrossingMessage(undefined, 0, 5000, fmt)).toBeNull();
  });
});

describe('reminders', () => {
  const fmt = (n: number) => `Rs ${n}`;
  const bill = (over: Partial<RecurringBudget>): RecurringBudget => ({
    id: 'b', title: 'Rent', amount: 1000, frequency: 'monthly',
    nextDueDate: new Date(2026, 2, 16).toISOString(), ...over,
  });
  const noon = new Date(2026, 2, 15, 12);

  it('reminds about a bill due tomorrow and today, and flags overdue ones', () => {
    const tomorrow = dueReminders({ now: noon, bills: [bill({})], income: null, expensesToday: 1, formatMoney: fmt });
    expect(tomorrow[0].title).toMatch(/tomorrow/);

    const today = dueReminders({
      now: noon, bills: [bill({ nextDueDate: new Date(2026, 2, 15).toISOString() })], income: null, expensesToday: 1, formatMoney: fmt,
    });
    expect(today[0].title).toMatch(/today/);

    const overdue = dueReminders({
      now: noon, bills: [bill({ nextDueDate: new Date(2026, 2, 10).toISOString() })], income: null, expensesToday: 1, formatMoney: fmt,
    });
    expect(overdue[0].title).toMatch(/overdue/);
  });

  it('ignores bills that are far away', () => {
    const r = dueReminders({
      now: noon, bills: [bill({ nextDueDate: new Date(2026, 3, 1).toISOString() })], income: null, expensesToday: 1, formatMoney: fmt,
    });
    expect(r).toHaveLength(0);
  });

  it('reminds about payday the day before', () => {
    const income: Income = { id: 'i', amount: 50000, frequency: 'monthly', nextDate: new Date(2026, 2, 16).toISOString() };
    const r = dueReminders({ now: noon, bills: [], income, expensesToday: 1, formatMoney: fmt });
    expect(r.some((x) => /Payday tomorrow/.test(x.title))).toBe(true);
  });

  it('nudges to log spending only in the evening and only when nothing is logged', () => {
    const evening = new Date(2026, 2, 15, 21);
    expect(dueReminders({ now: evening, bills: [], income: null, expensesToday: 0, formatMoney: fmt })).toHaveLength(1);
    expect(dueReminders({ now: evening, bills: [], income: null, expensesToday: 2, formatMoney: fmt })).toHaveLength(0);
    expect(dueReminders({ now: noon, bills: [], income: null, expensesToday: 0, formatMoney: fmt })).toHaveLength(0);
  });

  it('uses a stable key so a reminder fires once', () => {
    const a = dueReminders({ now: noon, bills: [bill({})], income: null, expensesToday: 1, formatMoney: fmt });
    const b = dueReminders({ now: new Date(2026, 2, 15, 18), bills: [bill({})], income: null, expensesToday: 1, formatMoney: fmt });
    expect(a[0].key).toBe(b[0].key);
  });
});

describe('pin hashing', () => {
  it('hashes deterministically per salt and differs across salts', async () => {
    const salt = generateSalt();
    const a = await hashPin('1234', salt);
    expect(await hashPin('1234', salt)).toBe(a);
    expect(await hashPin('1234', generateSalt())).not.toBe(a);
    expect(safeEqual(a, await hashPin('1235', salt))).toBe(false);
  });

  it('validates PIN shape', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('12345678')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('123456789')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
});

describe('user store ledger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('credits each missed payday exactly once and never double-credits', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 20, 12));
    const { useUserStore } = await import('@/store/useUserStore');
    const { computeBalance } = await import('../ledger');

    useUserStore.getState().setUser({ name: 'T', openingBalance: 1000, isOnboarded: true });
    useUserStore.getState().setIncome({
      id: 'i', amount: 500, frequency: 'weekly', nextDate: new Date(2026, 2, 6).toISOString(),
    });

    useUserStore.getState().processAutoPayday();
    const afterFirst = useUserStore.getState();
    // paydays on 6th, 13th, 20th → 3 deposits
    expect(afterFirst.deposits).toHaveLength(3);
    expect(computeBalance(1000, afterFirst.deposits, [])).toBe(2500);

    useUserStore.getState().processAutoPayday();
    expect(useUserStore.getState().deposits).toHaveLength(3);

    vi.useRealTimers();
  });

  it('records balance corrections as ledger entries', async () => {
    const { useUserStore } = await import('@/store/useUserStore');
    const { computeBalance } = await import('../ledger');

    useUserStore.getState().setUser({ name: 'T', openingBalance: 1000, isOnboarded: true });
    useUserStore.getState().adjustBalanceTo(1300, 1000);
    const { deposits } = useUserStore.getState();
    expect(deposits).toHaveLength(1);
    expect(deposits[0]).toMatchObject({ kind: 'adjustment', amount: 300 });
    expect(computeBalance(1000, deposits, [])).toBe(1300);

    // no-op when nothing changed
    useUserStore.getState().adjustBalanceTo(1300, 1300);
    expect(useUserStore.getState().deposits).toHaveLength(1);
  });
});

describe('user store migration (v3 → v4)', () => {
  it('turns the old stored balance into an opening balance that preserves it', async () => {
    const { migrateUserState } = await import('@/store/useUserStore');
    const { computeBalance } = await import('../ledger');

    // Old balance was 4,000 after 1,000 of expenses → opening must be 5,000
    // so that opening + 0 deposits − 1,000 expenses still shows 4,000.
    const next = migrateUserState({ user: { name: 'T', balance: 4000, isOnboarded: true } }, () => 1000) as unknown as {
      user: { openingBalance: number; balance?: number; hasSeenTour?: boolean };
      deposits: never[];
    };
    expect(next.user.openingBalance).toBe(5000);
    expect(next.user.balance).toBeUndefined();
    expect(next.user.hasSeenTour).toBe(true);
    expect(computeBalance(next.user.openingBalance, next.deposits, [{ amount: 1000 }])).toBe(4000);
  });

  it('leaves already-migrated data alone', async () => {
    const { migrateUserState } = await import('@/store/useUserStore');
    const next = migrateUserState(
      { user: { openingBalance: 123, isOnboarded: true, hasSeenTour: false }, deposits: [{ id: 'x' }] },
      () => 999,
    ) as unknown as { user: { openingBalance: number }; deposits: unknown[] };
    expect(next.user.openingBalance).toBe(123);
    expect(next.deposits).toHaveLength(1);
  });
});
