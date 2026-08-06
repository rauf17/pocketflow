"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { X, Trash2, History } from "lucide-react";
import { usePocketStore } from "@/store/usePocketStore";
import { Button } from "@/components/ui/button";

interface TransactionHistoryProps {
  onClose: () => void;
}

export function TransactionHistory({ onClose }: TransactionHistoryProps) {
  const { expenses, removeExpense } = usePocketStore();

  return (
    <motion.div
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 left-0 w-full sm:w-96 bg-card/80 backdrop-blur-3xl border-r border-white/5 z-50 p-6 flex flex-col shadow-2xl"
    >
      <div className="flex justify-between items-center mb-8 mt-4">
        <h2 className="text-2xl font-light tracking-tight text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          History
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-20">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-50">
            <History className="w-12 h-12 mb-4 stroke-1" />
            <p className="font-light tracking-wide">The canvas is clear.</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -100 || velocity.x < -500) {
                  removeExpense(expense.id);
                }
              }}
              whileDrag={{ scale: 1.02, boxShadow: "0px 10px 30px rgba(0,0,0,0.5)" }}
              className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-white/5 cursor-grab active:cursor-grabbing group relative z-10"
            >
              <div className="flex flex-col">
                <span className="text-foreground font-medium">{expense.description}</span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(expense.date), "MMM d, h:mm a")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-light text-starlight">
                  ${expense.amount.toFixed(2)}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon-xs" 
                  onClick={() => removeExpense(expense.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
