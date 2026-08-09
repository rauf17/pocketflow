import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { isAfter, endOfDay } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Data-layer guard for expense dates.
 *
 * An expense represents money that has ALREADY been spent, so it can never
 * be dated later than "today". This is enforced here (not just in the date
 * picker UI) so a future date can't slip in through some other code path.
 * Anything past the end of today collapses to the current instant.
 */
export function clampExpenseDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  if (isNaN(date.getTime()) || isAfter(date, endOfDay(now))) {
    return now.toISOString();
  }
  return date.toISOString();
}

export function getCurrencySymbol(currencyCode: string | undefined): string {
  switch (currencyCode?.toUpperCase()) {
    case 'USD': return '$';
    case 'PKR': return 'Rs';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '$';
  }
}
