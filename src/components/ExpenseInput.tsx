"use client";

import { useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getCurrencySymbol } from "@/lib/utils";

export function ExpenseInput() {
  const { addExpense } = useExpenseStore();
  const { updateBalance, user } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const currencySymbol = getCurrencySymbol(user?.currency);
  const controls = useAnimation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      // Trigger error shake
      await controls.start({
        x: [0, -4, 4, -4, 4, 0],
        transition: { duration: 0.3, type: "spring", stiffness: 800 }
      });
      return;
    }
    
    // Trigger Success
    setIsSuccess(true);
    
    setTimeout(() => {
      addExpense({
        amount: Number(amount),
        description: description || "Expense",
        date: new Date().toISOString()
      });
      updateBalance(-Number(amount));
      setAmount("");
      setDescription("");
      setIsOpen(false);
      setIsSuccess(false);
    }, 400); // Wait for collapse animation
  };

  return (
    <div className="relative w-full max-w-md mx-auto mt-8 flex flex-col items-center">
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.div
            key="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-full relative"
          >
            <Button
              variant="glass"
              size="lg"
              className="w-full text-lg tracking-wide gap-2 h-16 rounded-2xl relative z-10"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="w-5 h-5" />
              <span>Add Expense</span>
            </Button>
            
            {/* Success Ripple Ring */}
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0 rounded-2xl border-2 border-flow-emerald z-0"
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {isOpen && (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, height: "auto" }}
            exit={isSuccess ? { opacity: 0, scale: 0.9, y: 10 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onSubmit={handleSubmit}
            className="w-full bg-card/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-glass flex flex-col gap-4 relative z-20 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-medium tracking-tight text-foreground/90">New Expense</h3>
              <Button 
                type="button"
                variant="ghost" 
                size="icon-sm"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground -mr-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <motion.div animate={controls} className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">{currencySymbol}</span>
              <Input
                autoFocus
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-3xl font-light h-16 rounded-2xl placeholder:text-muted-foreground/30 border-white/10"
              />
            </motion.div>
            
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
              className="w-full mt-2 h-14 rounded-2xl font-medium text-lg bg-foreground text-background hover:bg-foreground/90 transition-transform"
            >
              Confirm
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
