import { subDays } from 'date-fns';
import type { Category } from '@/store/types';

export interface QuickEntry {
  amount: number;
  description: string;
  categoryId?: string;
  /** Days before today (0 = today, 1 = yesterday). */
  daysAgo: number;
}

// Words that hint at a category when the category name itself isn't typed.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['lunch', 'dinner', 'breakfast', 'chai', 'tea', 'coffee', 'snack', 'meal', 'pizza', 'burger', 'biryani', 'grocery', 'groceries', 'juice', 'canteen', 'cafe', 'restaurant', 'food'],
  transport: ['uber', 'careem', 'bus', 'taxi', 'cab', 'rickshaw', 'fuel', 'petrol', 'diesel', 'metro', 'train', 'ride', 'parking', 'bike'],
  bills: ['bill', 'rent', 'electricity', 'internet', 'wifi', 'gas', 'water', 'subscription', 'netflix', 'spotify', 'recharge', 'load', 'phone'],
  shopping: ['shopping', 'clothes', 'shoes', 'shirt', 'amazon', 'daraz', 'mall', 'bag'],
  entertainment: ['movie', 'cinema', 'game', 'games', 'concert', 'party', 'outing'],
  health: ['medicine', 'doctor', 'pharmacy', 'hospital', 'clinic', 'gym', 'dentist'],
  education: ['book', 'books', 'tuition', 'course', 'fee', 'fees', 'stationery', 'print', 'printing', 'photocopy'],
};

/** "1.5k" → 1500, "2m" → 2,000,000, "500" → 500 */
function parseAmountToken(token: string): number | null {
  const m = token.toLowerCase().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!m) return null;
  const base = parseFloat(m[1]);
  const mult = m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : 1;
  const value = base * mult;
  return isFinite(value) && value > 0 ? value : null;
}

function guessCategory(text: string, categories: Category[]): string | undefined {
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);

  // 1. The user typed a category name directly.
  const byName = categories.find((c) => words.includes(c.name.toLowerCase()));
  if (byName) return byName.id;

  // 2. A keyword maps to a category that exists.
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => words.includes(k))) {
      const cat = categories.find((c) => c.name.toLowerCase() === catName);
      if (cat) return cat.id;
    }
  }
  return undefined;
}

/**
 * Parses free text like "500 lunch", "lunch 500", "rs 1.5k uber yesterday".
 * Returns null when no amount can be found.
 */
export function parseQuickEntry(input: string, categories: Category[] = []): QuickEntry | null {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let daysAgo = 0;
  let amount: number | null = null;
  const rest: string[] = [];

  for (const raw of tokens) {
    const token = raw.replace(/^(rs\.?|pkr|usd|\$|€|£|₹)/i, '');
    const lower = raw.toLowerCase();

    if (lower === 'yesterday') {
      daysAgo = 1;
      continue;
    }
    if (lower === 'today') {
      daysAgo = 0;
      continue;
    }
    if (/^(rs\.?|pkr|usd|inr|eur|gbp)$/i.test(raw)) continue; // bare currency word

    if (amount === null && token) {
      const parsed = parseAmountToken(token);
      if (parsed !== null) {
        amount = parsed;
        continue;
      }
    }
    rest.push(raw);
  }

  if (amount === null) return null;

  const description = rest.join(' ').trim();
  return {
    amount,
    description,
    categoryId: guessCategory(description, categories),
    daysAgo,
  };
}

export function quickEntryDate(daysAgo: number, now: Date = new Date()): string {
  return (daysAgo > 0 ? subDays(now, daysAgo) : now).toISOString();
}
