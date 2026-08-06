"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Plus, Trash2 } from "lucide-react";
import { usePocketStore } from "@/store/usePocketStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { 
    balance, setBalance, 
    nextIncomeDate, nextIncomeAmount, setNextIncome,
    recurringBills, addRecurringBill, removeRecurringBill 
  } = usePocketStore();

  const [localBalance, setLocalBalance] = useState(balance.toString());
  const [localIncomeDate, setLocalIncomeDate] = useState(new Date(nextIncomeDate).toISOString().split('T')[0]);
  const [localIncomeAmount, setLocalIncomeAmount] = useState(nextIncomeAmount.toString());

  const [newBillTitle, setNewBillTitle] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBillDate, setNewBillDate] = useState("");

  const handleSaveConfig = () => {
    setBalance(Number(localBalance));
    setNextIncome(new Date(localIncomeDate).toISOString(), Number(localIncomeAmount));
  };

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillTitle || !newBillAmount || !newBillDate) return;
    
    addRecurringBill({
      title: newBillTitle,
      amount: Number(newBillAmount),
      dueDate: Number(newBillDate)
    });

    setNewBillTitle("");
    setNewBillAmount("");
    setNewBillDate("");
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card/80 backdrop-blur-3xl border-l border-white/5 z-50 flex flex-col shadow-2xl"
    >
      <div className="flex justify-between items-center p-6 mt-4">
        <h2 className="text-2xl font-light tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          Settings
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-20">
        
        {/* Basic Config */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Core Config</h3>
          
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground ml-1">Current Balance</label>
            <Input 
              type="number" 
              value={localBalance} 
              onChange={(e) => setLocalBalance(e.target.value)} 
              onBlur={handleSaveConfig}
            />
          </div>

          <div className="flex gap-2">
            <div className="space-y-2 flex-1">
              <label className="text-xs text-muted-foreground ml-1">Next Payday</label>
              <Input 
                type="date" 
                value={localIncomeDate} 
                onChange={(e) => setLocalIncomeDate(e.target.value)}
                onBlur={handleSaveConfig} 
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-xs text-muted-foreground ml-1">Amount</label>
              <Input 
                type="number" 
                value={localIncomeAmount} 
                onChange={(e) => setLocalIncomeAmount(e.target.value)}
                onBlur={handleSaveConfig} 
              />
            </div>
          </div>
        </section>

        <div className="w-full h-[1px] bg-white/5" />

        {/* Recurring Bills */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recurring Bills</h3>
          
          <div className="space-y-2">
            <AnimatePresence>
              {recurringBills.map(bill => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-white/5 group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{bill.title}</span>
                    <span className="text-xs text-muted-foreground">Due on the {bill.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium">${bill.amount}</span>
                    <Button 
                      variant="ghost" 
                      size="icon-xs" 
                      onClick={() => removeRecurringBill(bill.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <form onSubmit={handleAddBill} className="flex flex-col gap-2 mt-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <h4 className="text-xs text-muted-foreground mb-2">Add fixed monthly bill</h4>
            <Input 
              placeholder="Netflix" 
              value={newBillTitle}
              onChange={e => setNewBillTitle(e.target.value)}
              className="h-10 text-sm bg-background/30"
            />
            <div className="flex gap-2">
              <Input 
                type="number" 
                placeholder="Amount" 
                value={newBillAmount}
                onChange={e => setNewBillAmount(e.target.value)}
                className="h-10 text-sm bg-background/30"
              />
              <Input 
                type="number" 
                min="1" max="31"
                placeholder="Day" 
                value={newBillDate}
                onChange={e => setNewBillDate(e.target.value)}
                className="h-10 text-sm bg-background/30 w-24"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="mt-2 w-full">
              <Plus className="w-4 h-4 mr-1" /> Add Bill
            </Button>
          </form>
        </section>

      </div>
    </motion.div>
  );
}
