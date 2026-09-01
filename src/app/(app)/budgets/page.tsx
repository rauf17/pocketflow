"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Plus, X, Trash2, Wallet, RefreshCcw, Edit2, Check } from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useUserStore } from "@/store/useUserStore";
import { RecurringBudget } from "@/store/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

export default function BudgetsPage() {
  const { recurringBudgets, removeRecurringBudget, addRecurringBudget, updateRecurringBudget, payRecurringBudget } = useBudgetStore();
  const { user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "semester">("monthly");
  const [nextDate, setNextDate] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const openEditModal = (budget: RecurringBudget) => {
    setTitle(budget.title);
    setAmount(budget.amount.toString());
    setFrequency(budget.frequency);
    setNextDate(new Date(budget.nextDueDate).toISOString().split('T')[0]);
    setEditingBudgetId(budget.id);
    setIsModalOpen(true);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !nextDate) return;

    if (editingBudgetId) {
      updateRecurringBudget(editingBudgetId, {
        title,
        amount: Number(amount),
        frequency,
        nextDueDate: new Date(nextDate).toISOString()
      });
    } else {
      addRecurringBudget({
        title,
        amount: Number(amount),
        frequency,
        nextDueDate: new Date(nextDate).toISOString()
      });
    }

    setTitle("");
    setAmount("");
    setNextDate("");
    setEditingBudgetId(null);
    setIsModalOpen(false);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-16 px-6 pb-32">
      
      <header className="w-full flex justify-between items-end mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-3xl font-light tracking-tight">Budgets</h2>
          <p className="text-sm text-muted-foreground mt-2">Manage your recurring obligations.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Button 
            onClick={() => {
              setTitle("");
              setAmount("");
              setNextDate("");
              setEditingBudgetId(null);
              setIsModalOpen(true);
            }}
            className="rounded-full gap-2 px-6 shadow-xl"
          >
            <Plus className="w-4 h-4" />
            New Budget
          </Button>
        </motion.div>
      </header>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {recurringBudgets.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-card/30 border border-white/5 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-xl">
                <Wallet className="w-10 h-10 text-muted-foreground/50" strokeWidth={1} />
              </div>
              <h3 className="text-xl font-light tracking-tight mb-2">No active budgets</h3>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Set up recurring expenses like rent, subscriptions, or hostel food to reserve them from your daily safe limit.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {recurringBudgets.map((budget) => {
                const dueDate = new Date(budget.nextDueDate);
                const daysUntil = differenceInDays(dueDate, new Date());
                const isUrgent = daysUntil <= 3 && daysUntil >= 0;
                const isOverdue = daysUntil < 0;

                return (
                  <motion.div 
                    variants={itemVariants}
                    layout
                    key={budget.id} 
                    className="flex flex-col p-6 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-xl hover:bg-card/60 transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground text-lg">{budget.title}</span>
                        <div className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-muted-foreground">
                          <RefreshCcw className="w-3 h-3" />
                          {budget.frequency}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditModal(budget)}
                          className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all -mt-2 w-10 h-10"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeRecurringBudget(budget.id)}
                          className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all -mt-2 -mr-2 w-10 h-10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex flex-col gap-4">
                      <span className="text-4xl font-light text-foreground tracking-tight">
                        {currencySymbol}{budget.amount.toFixed(0)}
                      </span>

                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isOverdue ? 'bg-flow-amber' : isUrgent ? 'bg-flow-amber' : 'bg-flow-emerald'}`}
                          style={{ width: `${Math.max(10, Math.min(100, 100 - (daysUntil * 3)))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-foreground">{format(dueDate, "MMM d, yyyy")}</span>
                        <span className={isOverdue ? "text-flow-amber" : isUrgent ? "text-flow-amber" : "text-muted-foreground"}>
                          {isOverdue ? "Overdue" : daysUntil === 0 ? "Due today" : `In ${daysUntil} days`}
                        </span>
                      </div>

                      <Button
                        variant="glass"
                        onClick={() => payRecurringBudget(budget.id)}
                        className="w-full h-10 rounded-xl text-xs gap-2 font-medium hover:bg-flow-emerald/10 hover:text-flow-emerald hover:border-flow-emerald/30 transition-all mt-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark as Paid ({currencySymbol}{budget.amount.toFixed(0)})
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern Overlay Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-light tracking-tight text-foreground/90">{editingBudgetId ? "Edit Budget" : "New Budget"}</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full w-10 h-10 bg-white/5 hover:bg-white/10"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              <form onSubmit={handleAdd} className="flex flex-col gap-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Title</label>
                  <Input
                    autoFocus
                    type="text"
                    placeholder="e.g. Netflix, Rent, Groceries"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-14 rounded-2xl border-white/10 bg-white/[0.02]"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 h-14 rounded-2xl border-white/10 bg-white/[0.02]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Frequency</label>
                  <div className="flex gap-2">
                    {(["daily", "weekly", "monthly", "semester"] as const).map(freq => (
                      <Button
                        key={freq}
                        type="button"
                        variant={frequency === freq ? "default" : "glass"}
                        onClick={() => setFrequency(freq)}
                        className={`flex-1 h-12 rounded-xl capitalize ${frequency === freq ? 'bg-foreground text-background' : ''}`}
                      >
                        {freq}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Next Due Date</label>
                  <Input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="h-14 rounded-2xl border-white/10 bg-white/[0.02]"
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full mt-4 h-16 rounded-[1.5rem] text-lg font-medium shadow-xl"
                  disabled={!title || !amount || !nextDate}
                >
                  {editingBudgetId ? "Save Changes" : "Create Budget"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
