export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
];

export function getCurrencySymbol(currencyCode: string | undefined): string {
  const code = currencyCode?.toUpperCase();
  const known = CURRENCIES.find((c) => c.code === code);
  if (known) return known.symbol;
  if (code) {
    // Fall back to the platform's symbol for any other ISO code.
    try {
      const part = new Intl.NumberFormat('en', { style: 'currency', currency: code })
        .formatToParts(0)
        .find((p) => p.type === 'currency');
      if (part) return part.value;
    } catch {
      /* invalid code */
    }
  }
  return '$';
}

/** "Rs 1,234" — grouped digits, no decimals unless needed. */
export function formatMoney(
  amount: number,
  currencyCode: string | undefined,
  opts: { decimals?: number } = {},
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const decimals = opts.decimals ?? 0;
  const abs = Math.abs(amount).toLocaleString('en', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sep = symbol.length > 1 && /^[A-Za-z]/.test(symbol) ? ' ' : '';
  return `${amount < 0 ? '-' : ''}${symbol}${sep}${abs}`;
}
