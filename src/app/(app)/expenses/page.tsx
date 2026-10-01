"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  format, isToday, isYesterday, isSameMonth, subMonths,
  startOfMonth, isBefore, isAfter, endOfDay, startOfDay
} from "date-fns";
import { Search, Trash2, Receipt, Pencil, Sparkles, X } from "lucide-react";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { getCurrencySymbol } from "@/lib/utils";
import type { Expense } from "@/store/types";

export default function ExpensesPage() {
  const { expenses, removeExpense } = useExpenseStore();
  const { user, updateBalance } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<"this-month" | "last-month">("this-month");

  const [showRecapBanner, setShowRecapBanner] = useState(false);
  const [recapData, setRecapData] = useState<{ monthName: string; total: number; count: number } | null>(null);

  useEffect(() => {
    const today = new Date();
    const currentMonthKey = format(today, "yyyy-MM");
    const storedMonthKey = localStorage.getItem("pocketflow_last_seen_month");

    if (storedMonthKey && storedMonthKey !== currentMonthKey) {
      const lastMonthDate = subMonths(today, 1);
      const lastMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), lastMonthDate));
      if (lastMonthExpenses.length > 0) {
        const total = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        setRecapData({
          monthName: format(lastMonthDate, "MMMM"),
          total,
          count: lastMonthExpenses.length,
        });
        setShowRecapBanner(true);
      }
    }

    localStorage.setItem("pocketflow_last_seen_month", currentMonthKey);
  }, [expenses]);

  // Deleting an expense must give the money back — it isn't spent anymore.
  const handleDelete = (expense: Expense) => {
    updateBalance(expense.amount);
    removeExpense(expense.id);
  };

  const today = new Date();
  const startOfCurrentMonth = startOfMonth(today);

  // Check if any expenses exist prior to current month
  const hasPriorMonthExpenses = expenses.some(e =>
    isBefore(startOfDay(new Date(e.date)), startOfCurrentMonth)
  );

  // Tab filtering
  const tabFilteredExpenses = expenses.filter(e => {
    if (!hasPriorMonthExpenses) return true;
    const d = new Date(e.date);
    if (activeTab === "this-month") {
      return isSameMonth(d, today) && !isAfter(d, endOfDay(today));
    } else if (activeTab === "last-month") {
      return isSameMonth(d, subMonths(today, 1));
    }
    return true;
  });

  // Filter expenses by search query and sort chronologically descending
  const filteredExpenses = tabFilteredExpenses
    .filter(e => e.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date for timeline
  const groupedExpenses = filteredExpenses.reduce((groups, expense) => {
    const dateObj = new Date(expense.date);
    let dateStr = format(dateObj, "MMMM d, yyyy");
    if (isToday(dateObj)) dateStr = "Today";
    else if (isYesterday(dateObj)) dateStr = "Yesterday";
    
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(expense);
    return groups;
  }, {} as Record<string, typeof expenses>);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto pt-16 px-6 pb-32">
      
      {/* Monthly Recap Banner */}
      <AnimatePresence>
        {showRecapBanner && recapData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full mb-8 p-4 rounded-[1.25rem] bg-gradient-to-r from-flow-emerald/10 via-card/50 to-card/30 border border-flow-emerald/20 flex items-center justify-between gap-4 text-sm shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-flow-emerald shrink-0" />
              <span>
                <strong className="text-foreground">{recapData.monthName}</strong> wrapped up — you spent{" "}
                <strong className="text-foreground">{currencySymbol}{recapData.total.toFixed(0)}</strong> across{" "}
                <strong className="text-foreground">{recapData.count}</strong> expense{recapData.count === 1 ? "" : "s"}.
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRecapBanner(false)}
              className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="w-full flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-3xl font-light tracking-tight">Expenses</h2>
          <p className="text-sm text-muted-foreground mt-2">Track where your money flows.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 w-full md:w-auto"
        >
          <div className="relative flex-1 md:w-64 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input 
              placeholder="Search expenses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-card/40 border-white/5 rounded-[1.25rem] h-12 focus-visible:bg-white/[0.03] transition-all"
            />
          </div>
        </motion.div>
      </header>

      {/* Tabs Switcher: rendered ONLY if expenses dated prior to current month exist */}
      {hasPriorMonthExpenses && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center gap-2 p-1.5 bg-card/30 border border-white/5 rounded-[1.25rem] mb-8"
        >
          <button
            onClick={() => setActiveTab("this-month")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-medium transition-all ${
              activeTab === "this-month"
                ? "bg-foreground text-background shadow-md font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setActiveTab("last-month")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-medium transition-all ${
              activeTab === "last-month"
                ? "bg-foreground text-background shadow-md font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            Last Month
          </button>
        </motion.div>
      )}

      <div className="w-full">
        <AnimatePresence mode="wait">
          {filteredExpenses.length === 0 ? (
            <motion.div 
              key={`empty-${activeTab}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-card/30 border border-white/5 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-xl">
                <Receipt className="w-10 h-10 text-muted-foreground/50" strokeWidth={1} />
              </div>
              <h3 className="text-xl font-light tracking-tight mb-2">No expenses found</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                {searchQuery ? "Try a different search term to find what you're looking for." : activeTab === "last-month" ? "No expenses recorded for last month." : "You're doing great. Start by adding your first purchase."}
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key={`list-${activeTab}`}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="flex flex-col gap-10"
            >
              {Object.entries(groupedExpenses).map(([date, dayExpenses]) => (
                <div key={date} className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium tracking-widest text-muted-foreground uppercase sticky top-0 bg-background/80 backdrop-blur-xl py-2 z-10">
                    {date}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {dayExpenses.map((expense) => (
                      <motion.div 
                        variants={itemVariants}
                        layout
                        key={expense.id} 
                        className="flex items-center justify-between p-5 rounded-[1.5rem] bg-card/40 border border-white/5 hover:bg-card/60 transition-all hover:scale-[1.01] group relative overflow-hidden"
                      >
                        <div className="flex flex-col relative z-10">
                          <span className="font-medium text-foreground/90 text-lg">{expense.description}</span>
                          <span className="text-xs text-muted-foreground mt-1 tracking-wide">{format(new Date(expense.date), "h:mm a")}</span>
                        </div>
                        <div className="flex items-center gap-6 relative z-10">
                          <span className="text-2xl font-light text-foreground">
                            {currencySymbol}{expense.amount.toFixed(2)}
                          </span>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingExpense(expense)}
                              className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl w-10 h-10"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(expense)}
                              className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl w-10 h-10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EditExpenseDialog expense={editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)} />
    </div>
  );
}
