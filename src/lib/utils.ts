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

/**
 * "2026-03-05" -> ISO instant at LOCAL midnight of that calendar day.
 * (new Date("2026-03-05") parses as UTC, which lands on the previous day in
 * timezones behind UTC and shifted every payday / due date by one day.)
 */
export function ymdToLocalISO(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

/** ISO instant -> "yyyy-MM-dd" for the LOCAL calendar day (for <input type="date">). */
export function isoToYMD(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export { getCurrencySymbol } from "./currency"
