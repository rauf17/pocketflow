import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useProfileStore } from "@/store/useProfileStore";
import type { Expense, Goal, RecurringBudget } from "@/store/types";

const DAY = 86_400_000;

/** Small deterministic PRNG so the demo looks the same every time. */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/** Category id, description pool and typical amount range. */
const SPENDING: Array<[string, string[], number, number]> = [
  ["1", ["Lunch", "Groceries", "Coffee", "Dinner out", "Snacks"], 4, 28],
  ["2", ["Bus pass", "Ride share", "Fuel"], 3, 22],
  ["entertainment", ["Cinema", "Games", "Streaming"], 8, 24],
  ["shopping", ["T-shirt", "Headphones case", "Stationery"], 10, 45],
  ["health", ["Pharmacy"], 6, 18],
];

/**
 * Replaces the app's data with believable sample data so the app can be
 * explored (and screenshotted) without entering anything. Everything stays on
 * the device, like real data. `banner: false` skips the "sample data" banner.
 */
export function seedDemoData(opts: { banner?: boolean } = {}) {
  const banner = opts.banner ?? true;
  const now = Date.now();
  const rand = rng(42);
  const iso = (offsetDays: number, hour = 12) => {
    const d = new Date(now + offsetDays * DAY);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const expenses: Expense[] = [];
  // 75 days so "last month" has a realistic amount of history to compare against.
  for (let daysAgo = 75; daysAgo >= 0; daysAgo--) {
    // Skip some days so the history isn't suspiciously uniform.
    if (rand() < 0.22 && daysAgo !== 0) continue;
    const count = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      const [categoryId, names, lo, hi] = SPENDING[Math.floor(rand() * SPENDING.length)];
      const date = new Date(now - daysAgo * DAY);
      date.setHours(8 + Math.floor(rand() * 12), 0, 0, 0);
      // Never create an expense in the future.
      if (date.getTime() > now) date.setTime(now - 60_000);
      expenses.push({
        id: `demo-e-${daysAgo}-${i}`,
        amount: Math.round(lo + rand() * (hi - lo)),
        description: names[Math.floor(rand() * names.length)],
        date: date.toISOString(),
        categoryId,
      });
    }
  }
  expenses.sort((a, b) => b.date.localeCompare(a.date));
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const PAYDAY = 1400;
  const TARGET_BALANCE = 1530; // what the user has right now
  // balance = opening + deposits - expenses, so solve for the opening balance.
  const openingBalance = TARGET_BALANCE - 2 * PAYDAY + totalSpent;

  const bills: RecurringBudget[] = [
    { id: "demo-b-rent", title: "Rent", amount: 480, frequency: "monthly", nextDueDate: iso(5, 0) },
    { id: "demo-b-net", title: "Internet", amount: 35, frequency: "monthly", nextDueDate: iso(3, 0) },
    { id: "demo-b-stream", title: "Streaming", amount: 12, frequency: "monthly", nextDueDate: iso(11, 0) },
  ];

  const goal = (g: Omit<Goal, "createdAt" | "status">): Goal => ({
    status: "on-track",
    createdAt: iso(-60),
    ...g,
  });
  const goals: Goal[] = [
    goal({ id: "demo-g1", name: "Emergency fund", icon: "Shield", color: "emerald", priority: "critical", targetAmount: 1500, currentSaved: 620, monthlyContribution: 120 }),
    goal({ id: "demo-g2", name: "New laptop", icon: "Laptop", color: "blue", priority: "important", targetAmount: 900, currentSaved: 310, monthlyContribution: 90, targetDate: iso(180, 0) }),
    goal({ id: "demo-g3", name: "Summer trip", icon: "Plane", color: "amber", priority: "planned", targetAmount: 700, currentSaved: 140, monthlyContribution: 60 }),
  ];

  useExpenseStore.setState({
    expenses,
    favorites: [
      { id: "demo-f1", description: "Coffee", amount: 4, categoryId: "1" },
      { id: "demo-f2", description: "Lunch", amount: 12, categoryId: "1" },
    ],
  });
  useBudgetStore.setState((s) => ({
    recurringBudgets: bills,
    categories: s.categories.map((c) =>
      c.id === "1" ? { ...c, monthlyLimit: 220 } : c.id === "entertainment" ? { ...c, monthlyLimit: 60 } : c,
    ),
  }));
  useGoalStore.setState({ goals });
  useProfileStore.setState({
    profiles: [
      { id: "safe-day", name: "Safe Day", type: "safe", expectedSpend: 0, icon: "Shield", color: "emerald" },
      { id: "low-spend", name: "Low Spend", type: "low", expectedSpend: 10, icon: "Coffee", color: "blue" },
      { id: "normal-day", name: "Normal Day", type: "normal", expectedSpend: 20, icon: "Briefcase", color: "orange" },
      { id: "high-spend", name: "High Spend", type: "high", expectedSpend: 40, icon: "ShoppingBag", color: "rose" },
    ],
  });
  useUserStore.setState({
    user: {
      id: "demo-user",
      name: "Alex",
      currency: "USD",
      theme: "dark",
      hostelDaysMode: false,
      isOnboarded: true,
      hasSeenTour: true,
      openingBalance,
      isDemo: banner,
    },
    income: { id: "demo-income", amount: PAYDAY, nextDate: iso(9, 0), frequency: "monthly" },
    deposits: [
      { id: "demo-d0", amount: PAYDAY, date: iso(-52, 9), label: "Payday", kind: "payday" },
      { id: "demo-d1", amount: PAYDAY, date: iso(-21, 9), label: "Payday", kind: "payday" },
    ],
  });
}
