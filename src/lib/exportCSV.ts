import { format } from "date-fns";
import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useGoalStore } from "@/store/useGoalStore";

/**
 * Escapes a single CSV field according to RFC 4180 rules.
 * Encloses the field in double quotes if it contains commas, double quotes, or newlines.
 */
function escapeCSVField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports all persisted user financial data to a robust, UTF-8 encoded CSV file.
 * Completely client-side read-only operation.
 */
export function exportPocketFlowCSV(): void {
  if (typeof window === "undefined") return;

  const { user, income } = useUserStore.getState();
  const { expenses } = useExpenseStore.getState();
  const { recurringBudgets, categories } = useBudgetStore.getState();
  const { profiles, weeklyPlan } = useProfileStore.getState();
  const { goals } = useGoalStore.getState();

  const lines: string[] = [];

  // UTF-8 BOM for Microsoft Excel / universal spreadsheet compatibility
  const BOM = "\uFEFF";

  // Section 1: User & Financial Configuration
  lines.push("--- USER & FINANCIAL CONFIGURATION ---");
  lines.push(["User ID", "Name", "Currency", "Current Balance", "Theme", "Hostel Days Mode", "Onboarded"].map(escapeCSVField).join(","));
  if (user) {
    lines.push([
      user.id,
      user.name,
      user.currency,
      user.balance,
      user.theme,
      user.hostelDaysMode ? "Yes" : "No",
      user.isOnboarded ? "Yes" : "No"
    ].map(escapeCSVField).join(","));
  }
  lines.push("");

  // Section 2: Income Schedule
  lines.push("--- INCOME SCHEDULE ---");
  lines.push(["Next Payday Date", "Next Payday Amount"].map(escapeCSVField).join(","));
  if (income) {
    lines.push([
      income.nextDate ? format(new Date(income.nextDate), "yyyy-MM-dd HH:mm:ss") : "",
      income.amount
    ].map(escapeCSVField).join(","));
  }
  lines.push("");

  // Section 3: Expenses
  lines.push("--- EXPENSES ---");
  lines.push(["Expense ID", "Date", "Description", "Amount", "Category"].map(escapeCSVField).join(","));
  if (expenses && expenses.length > 0) {
    expenses.forEach((e) => {
      const categoryObj = categories?.find((c) => c.id === e.categoryId);
      lines.push([
        e.id,
        e.date ? format(new Date(e.date), "yyyy-MM-dd HH:mm:ss") : "",
        e.description,
        e.amount,
        categoryObj ? categoryObj.name : (e.categoryId || "General")
      ].map(escapeCSVField).join(","));
    });
  } else {
    lines.push("No recorded expenses.");
  }
  lines.push("");

  // Section 4: Recurring Budgets / Bills
  lines.push("--- RECURRING BUDGETS & BILLS ---");
  lines.push(["Bill ID", "Title", "Amount", "Frequency", "Next Due Date"].map(escapeCSVField).join(","));
  if (recurringBudgets && recurringBudgets.length > 0) {
    recurringBudgets.forEach((b) => {
      lines.push([
        b.id,
        b.title,
        b.amount,
        b.frequency,
        b.nextDueDate ? format(new Date(b.nextDueDate), "yyyy-MM-dd") : ""
      ].map(escapeCSVField).join(","));
    });
  } else {
    lines.push("No recurring bills configured.");
  }

  lines.push("");

  // Section 5: Goals & Mission Control
  lines.push("--- FINANCIAL GOALS & MISSION CONTROL ---");
  lines.push(["Goal ID", "Goal Name", "Target Amount", "Current Saved", "Monthly Contribution", "Priority", "Target Date", "Status"].map(escapeCSVField).join(","));
  if (goals && goals.length > 0) {
    goals.forEach((g) => {
      lines.push([
        g.id,
        g.name,
        g.targetAmount,
        g.currentSaved,
        g.monthlyContribution,
        g.priority,
        g.targetDate ? format(new Date(g.targetDate), "yyyy-MM-dd") : "",
        g.status
      ].map(escapeCSVField).join(","));
    });
  } else {
    lines.push("No goals configured.");
  }
  lines.push("");

  // Section 6: Day Profiles & Weekly Planner
  lines.push("--- DAY PROFILES ---");
  lines.push(["Profile ID", "Name", "Type", "Expected Spend"].map(escapeCSVField).join(","));
  if (profiles && profiles.length > 0) {
    profiles.forEach((p) => {
      lines.push([p.id, p.name, p.type, p.expectedSpend].map(escapeCSVField).join(","));
    });
  }
  lines.push("");

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  lines.push("--- WEEKLY PLANNER ---");
  lines.push(["Day", "Assigned Profile Name", "Expected Spend"].map(escapeCSVField).join(","));
  if (weeklyPlan) {
    dayNames.forEach((dayName, idx) => {
      const profileId = weeklyPlan[idx];
      const profile = profiles.find((p) => p.id === profileId);
      lines.push([
        dayName,
        profile ? profile.name : profileId,
        profile ? profile.expectedSpend : 0
      ].map(escapeCSVField).join(","));
    });
  }

  const csvContent = BOM + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const a = document.createElement("a");
  a.href = url;
  a.download = `pocketflow-export-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
