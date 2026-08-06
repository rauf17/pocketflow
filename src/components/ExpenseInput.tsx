"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { usePocketStore } from "@/store/usePocketStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.div
            key="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-full"
          >
            <Button
              variant="glass"
              size="lg"
              className="w-full text-lg tracking-wide gap-2 h-16 rounded-2xl"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="w-5 h-5" />
              <span>Add Expense</span>
            </Button>
          </motion.div>
        )}

        {isOpen && (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onSubmit={handleSubmit}
            className="w-full bg-card/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-glass flex flex-col gap-4 relative z-20"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-medium tracking-tight text-foreground/90">New Expense</h3>
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground -mr-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">$</span>
              <Input
                autoFocus
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-3xl font-light h-16 rounded-2xl placeholder:text-muted-foreground/30 border-white/10"
                required
              />
            </div>
            
            <Input
              type="text"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-lg font-light h-14 rounded-2xl placeholder:text-muted-foreground/50 border-white/10"
            />
            
            <Button
              type="submit"
              size="lg"
              disabled={!amount || isNaN(Number(amount))}
              className="w-full mt-2 h-14 rounded-2xl font-medium text-lg bg-foreground text-background hover:bg-foreground/90"
            >
              Confirm
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
