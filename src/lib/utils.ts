import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
