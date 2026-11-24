export interface User {
  id: string;
  name: string;
  currency: string;
  theme: 'dark' | 'light' | 'system';
  hostelDaysMode: boolean;
  isOnboarded: boolean;
  hasSeenTour?: boolean;
  /** Balance at the start of the ledger. Current balance is derived, never stored. */
  openingBalance: number;
}

/** Money coming in: paydays, manual income, and balance corrections (can be negative). */
export interface Deposit {
  id: string;
  amount: number;
  date: string; // ISO String
  label: string;
  kind: 'payday' | 'manual' | 'adjustment';
}

export interface Income {
  id: string;
  amount: number;
  nextDate: string; // ISO String
  frequency: 'monthly' | 'bi-weekly' | 'weekly' | 'semester';
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Optional monthly spending cap for this category. */
  monthlyLimit?: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO String
  categoryId?: string;
}

export interface RecurringBudget {
  id: string;
  title: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'semester';
  nextDueDate: string; // ISO String
}

export interface AIConversation {
  id: string;
  messages: Array<{ role: 'user' | 'ai'; content: string; timestamp: string }>;
  contextUsed: Record<string, unknown>;
}

export interface DayProfile {
  id: string;
  name: string;
  type: 'safe' | 'low' | 'normal' | 'high' | 'custom';
  expectedSpend: number;
  icon: string;
  color: string;
}

// --- Financial Goals (Core Pillar) ---

export type GoalPriority = 'critical' | 'important' | 'planned' | 'nice-to-have';
export type GoalStatus = 'on-track' | 'ahead' | 'behind' | 'at-risk' | 'completed';

export interface Goal {
  id: string;
  name: string;
  icon: string;           // Lucide icon name
  color: string;          // Tailwind color key e.g. 'emerald', 'blue', 'amber', 'rose'
  priority: GoalPriority;
  targetAmount: number;
  currentSaved: number;
  monthlyContribution: number; // How much to reserve per month/pay cycle
  targetDate?: string;         // ISO String (optional)
  notes?: string;
  status: GoalStatus;
  createdAt: string;           // ISO String
}

export interface Favorite {
  id: string;
  description: string;
  amount: number;
  categoryId?: string;
}
