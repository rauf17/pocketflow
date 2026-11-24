import { addDays, format, startOfDay, subDays } from 'date-fns';
import type { Category, DayProfile, Expense } from '@/store/types';

export interface ReviewDay {
  date: Date;
  label: string;
  planned: number;
  actual: number;
  profileName: string;
  /** False for days before the first recorded expense — the user wasn't tracking yet. */
  tracked: boolean;
}

export interface ProfileSuggestion {
  profileId: string;
  profileName: string;
  weekday: string;
  planned: number;
  averageActual: number;
  direction: 'lower' | 'raise';
}

export interface WeeklyReview {
  days: ReviewDay[];
  totalPlanned: number;
  totalActual: number;
  /** actual − planned (positive = overspent against plan). */
  variance: number;
  overDays: number;
  noSpendDays: number;
  topCategory: { name: string; total: number } | null;
  suggestions: ProfileSuggestion[];
}

interface ReviewInput {
  now: Date;
  expenses: Expense[];
  profiles: DayProfile[];
  weeklyPlan: Record<number, string>;
  categories: Category[];
}

const dayKey = (d: Date) => startOfDay(d).getTime();

function plannedFor(date: Date, profiles: DayProfile[], weeklyPlan: Record<number, string>) {
  const profile = profiles.find((p) => p.id === weeklyPlan[date.getDay()]) ?? profiles[0];
  return { planned: profile?.expectedSpend ?? 0, profile };
}

/** Reviews the 7 days ending today, plus 4 weeks of history for suggestions. */
export function buildWeeklyReview({
  now,
  expenses,
  profiles,
  weeklyPlan,
  categories,
}: ReviewInput): WeeklyReview {
  const today = startOfDay(now);

  const spentByDay = new Map<number, number>();
  for (const e of expenses) {
    const t = new Date(e.date);
    if (isNaN(t.getTime())) continue;
    const k = dayKey(t);
    spentByDay.set(k, (spentByDay.get(k) ?? 0) + e.amount);
  }

  // Days before the first expense don't count: a new user hasn't "underspent" them.
  const firstTracked = expenses.reduce((min, e) => {
    const t = new Date(e.date);
    return isNaN(t.getTime()) ? min : Math.min(min, startOfDay(t).getTime());
  }, today.getTime());

  // The last 7 days, oldest first
  const days: ReviewDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const { planned, profile } = plannedFor(date, profiles, weeklyPlan);
    days.push({
      date,
      label: format(date, 'EEE d'),
      planned,
      actual: spentByDay.get(dayKey(date)) ?? 0,
      profileName: profile?.name ?? 'Day',
      tracked: date.getTime() >= firstTracked,
    });
  }

  const trackedDays = days.filter((d) => d.tracked);
  const totalPlanned = trackedDays.reduce((s, d) => s + d.planned, 0);
  const totalActual = trackedDays.reduce((s, d) => s + d.actual, 0);

  // Top category over the week
  const weekStart = days[0].date.getTime();
  const catTotals = new Map<string, number>();
  for (const e of expenses) {
    const t = new Date(e.date).getTime();
    if (isNaN(t) || t < weekStart || t >= addDays(today, 1).getTime()) continue;
    const key = e.categoryId ?? '__none';
    catTotals.set(key, (catTotals.get(key) ?? 0) + e.amount);
  }
  let topCategory: WeeklyReview['topCategory'] = null;
  catTotals.forEach((total, key) => {
    if (!topCategory || total > topCategory.total) {
      const name =
        key === '__none' ? 'Uncategorized' : (categories.find((c) => c.id === key)?.name ?? 'Other');
      topCategory = { name, total };
    }
  });

  // Suggestions: compare each weekday's profile to the last 4 weeks of that weekday.
  // Needs real history — a new user's empty past is not "you spend nothing on Fridays".
  const suggestions: ProfileSuggestion[] = [];
  const earliest = expenses.reduce((min, e) => {
    const t = new Date(e.date).getTime();
    return isNaN(t) ? min : Math.min(min, t);
  }, Infinity);
  const hasHistory = isFinite(earliest) && earliest <= subDays(today, 14).getTime() && expenses.length >= 8;
  for (let weekday = 0; hasHistory && weekday < 7; weekday++) {
    const profile = profiles.find((p) => p.id === weeklyPlan[weekday]);
    if (!profile) continue;

    const samples: number[] = [];
    for (let back = 1; back <= 28; back++) {
      const date = subDays(today, back);
      if (date.getDay() === weekday) samples.push(spentByDay.get(dayKey(date)) ?? 0);
    }
    if (samples.length < 3) continue;

    const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
    const planned = profile.expectedSpend;
    // Only flag a clear mismatch (±40% and at least a meaningful amount)
    if (planned > 0 && avg < planned * 0.6 && planned - avg >= 50) {
      suggestions.push({
        profileId: profile.id,
        profileName: profile.name,
        weekday: format(addDays(today, (weekday - today.getDay() + 7) % 7), 'EEEE'),
        planned,
        averageActual: avg,
        direction: 'lower',
      });
    } else if (avg > planned * 1.4 && avg - planned >= 50) {
      suggestions.push({
        profileId: profile.id,
        profileName: profile.name,
        weekday: format(addDays(today, (weekday - today.getDay() + 7) % 7), 'EEEE'),
        planned,
        averageActual: avg,
        direction: 'raise',
      });
    }
  }

  return {
    days,
    totalPlanned,
    totalActual,
    variance: totalActual - totalPlanned,
    overDays: trackedDays.filter((d) => d.planned > 0 && d.actual > d.planned).length,
    noSpendDays: trackedDays.filter((d) => d.actual === 0).length,
    topCategory,
    suggestions,
  };
}
