"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, CalendarDays, Trash2 } from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useUserStore } from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/utils";

export default function BudgetsPage() {
  const { recurringBudgets, removeRecurringBudget, addRecurringBudget } = useBudgetStore();
  const { user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "semester">("monthly");
  const [nextDate, setNextDate] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !nextDate) return;
    
    addRecurringBudget({
      title,
      amount: Number(amount),
      frequency,
      nextDueDate: new Date(nextDate).toISOString(),
    });

    setIsModalOpen(false);
    setTitle("");
    setAmount("");
    setNextDate("");
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-12 px-6">
      <header className="w-full flex justify-between items-center mb-12">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Recurring Budgets</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage fixed expenses and obligations</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-full px-6">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Budget</span>
        </Button>
      </header>

      {recurringBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 text-muted-foreground opacity-50">
          <CalendarDays className="w-16 h-16 mb-4 stroke-1" />
          <p className="font-light tracking-wide text-lg">No recurring budgets set.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          <AnimatePresence>
            {recurringBudgets.map((budget) => (
              <motion.div
                key={budget.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon-xs"
                    onClick={() => removeRecurringBudget(budget.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <h3 className="text-lg font-medium text-foreground">{budget.title}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 mb-6">
                  {budget.frequency}
                </p>
                
                <div className="mt-auto">
                  <span className="text-3xl font-light text-foreground">
                    {currencySymbol}{budget.amount.toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Budget Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 z-50 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium tracking-tight">Create Budget</h3>
                <Button variant="ghost" size="icon-sm" onClick={() => setIsModalOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <Input
                  autoFocus
                  placeholder="Title (e.g. Netflix, Petrol)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-14 rounded-2xl bg-background/50 border-white/10"
                />
                
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 h-14 rounded-2xl bg-background/50 border-white/10"
                  />
                </div>

                <div className="flex gap-2">
                  {(["daily", "weekly", "monthly", "semester"] as const).map((freq) => (
                    <Button
                      key={freq}
                      type="button"
                      variant={frequency === freq ? "default" : "glass"}
                      onClick={() => setFrequency(freq)}
                      className="flex-1 rounded-xl text-xs capitalize"
                    >
                      {freq}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2 mt-2">
                  <label className="text-xs text-muted-foreground ml-1">Next Due Date</label>
                  <Input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="h-14 rounded-2xl bg-background/50 border-white/10"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full h-14 rounded-2xl mt-4">
                  Save Budget
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
