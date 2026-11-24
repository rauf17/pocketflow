import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type { Income, RecurringBudget } from '@/store/types';

export interface Reminder {
  /** Stable per-day key so each reminder fires at most once a day. */
  key: string;
  title: string;
  body: string;
}

interface ReminderInput {
  now: Date;
  bills: RecurringBudget[];
  income: Income | null;
  /** Number of expenses logged today. */
  expensesToday: number;
  formatMoney: (n: number) => string;
}

/** Pure: which reminders apply right now. Notification delivery lives elsewhere. */
export function dueReminders({ now, bills, income, expensesToday, formatMoney }: ReminderInput): Reminder[] {
  const today = startOfDay(now);
  const day = format(today, 'yyyy-MM-dd');
  const out: Reminder[] = [];

  for (const bill of bills) {
    const due = startOfDay(new Date(bill.nextDueDate));
    if (isNaN(due.getTime())) continue;
    const diff = differenceInCalendarDays(due, today);
    if (diff < 0) {
      out.push({
        key: `bill-overdue-${bill.id}-${day}`,
        title: `${bill.title} is overdue`,
        body: `${formatMoney(bill.amount)} was due ${format(due, 'MMM d')}.`,
      });
    } else if (diff <= 1) {
      out.push({
        key: `bill-${bill.id}-${format(due, 'yyyy-MM-dd')}`,
        title: diff === 0 ? `${bill.title} is due today` : `${bill.title} is due tomorrow`,
        body: `${formatMoney(bill.amount)} — mark it paid once it's done.`,
      });
    }
  }

  if (income?.nextDate) {
    const payday = startOfDay(new Date(income.nextDate));
    const diff = differenceInCalendarDays(payday, today);
    if (diff === 1 || diff === 0) {
      out.push({
        key: `payday-${format(payday, 'yyyy-MM-dd')}`,
        title: diff === 0 ? 'Payday today' : 'Payday tomorrow',
        body: `${formatMoney(income.amount)} is expected ${diff === 0 ? 'today' : format(addDays(today, 1), 'EEEE')}.`,
      });
    }
  }

  // Evening nudge to log spending
  if (now.getHours() >= 20 && expensesToday === 0) {
    out.push({
      key: `log-${day}`,
      title: 'Log today’s spending',
      body: 'Nothing recorded yet today. Add it now to keep your safe limit accurate.',
    });
  }

  return out;
}
