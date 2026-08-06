"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { Search, Trash2, Receipt } from "lucide-react";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/utils";

export default function ExpensesPage() {
  const { expenses, removeExpense } = useExpenseStore();
  const { user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);
  
  const [searchQuery, setSearchQuery] = useState("");

  // Filter expenses
  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      
      <header className="w-full flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
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

      <div className="w-full">
        <AnimatePresence mode="wait">
          {filteredExpenses.length === 0 ? (
            <motion.div 
              key="empty"
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
                {searchQuery ? "Try a different search term to find what you're looking for." : "You're doing great. Start by adding your first purchase."}
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
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
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeExpense(expense.id)}
                            className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all w-10 h-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
    </div>
  );
}
