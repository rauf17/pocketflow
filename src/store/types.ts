export interface User {
  id: string;
  name: string;
  currency: string;
  theme: 'dark' | 'light' | 'system';
  hostelDaysMode: boolean; // Special mode for students
  isOnboarded: boolean;
  balance: number; // Current balance
}

export interface Income {
  id: string;
  amount: number;
  nextDate: string; // ISO String
  frequency: 'monthly' | 'bi-weekly' | 'weekly';
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string;
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
  contextUsed: Record<string, unknown>; // Snapshot of finances at the time
}
