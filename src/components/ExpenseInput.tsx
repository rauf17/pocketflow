"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { usePocketStore } from "@/store/usePocketStore";

export function ExpenseInput() {
  const { addExpense } = usePocketStore();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    addExpense({
      amount: Number(amount),
      description: description || "Expense",
    });
    
    setAmount("");
    setDescription("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md mx-auto mt-8">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary-foreground py-4 rounded-2xl transition-colors border border-primary/20 backdrop-blur-md"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium text-lg tracking-wide">Add Expense</span>
          </motion.button>
        )}

        {isOpen && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onSubmit={handleSubmit}
            className="w-full bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-semibold tracking-tight text-foreground/90">New Expense</h3>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">$</span>
              <input
                autoFocus
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-background/50 border border-border/50 rounded-2xl py-4 pl-10 pr-4 text-3xl font-light text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/30"
                required
              />
            </div>
            
            <input
              type="text"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background/50 border border-border/50 rounded-2xl py-4 px-4 text-lg font-light text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
            />
            
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={!amount || isNaN(Number(amount))}
              className="w-full bg-foreground text-background py-4 rounded-2xl font-medium text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Confirm
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
