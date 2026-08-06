"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Search, Filter, CalendarDays, Trash2, List as ListIcon, Calendar as CalendarIcon, Copy, Edit2 } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto pt-12 px-6">
      
      {/* Header & Controls */}
      <header className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Timeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Your entire financial history.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50 border-white/10 rounded-full h-10"
            />
          </div>
          <Button variant="glass" size="icon" className="rounded-full">
            <Filter className="w-4 h-4" />
          </Button>
          <div className="bg-card/50 border border-white/10 p-1 rounded-full flex gap-1">
            <Button 
              variant={viewMode === "list" ? "default" : "ghost"} 
              size="icon-sm" 
              className="rounded-full h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "calendar" ? "default" : "ghost"} 
              size="icon-sm" 
              className="rounded-full h-8 w-8"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full pb-20">
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-muted-foreground opacity-50">
            <Search className="w-16 h-16 mb-4 stroke-1" />
            <p className="font-light tracking-wide text-lg">No expenses found.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {filteredExpenses.map((expense) => (
                <motion.div
                  key={expense.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-5 rounded-2xl bg-card/40 backdrop-blur-md border border-white/5 group hover:bg-card/60 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground">
                      {/* Placeholder for category icon */}
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium text-lg tracking-tight">{expense.description}</span>
                      <span className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(expense.date), "MMM d, yyyy • h:mm a")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <span className="text-2xl font-light text-foreground">
                      {currencySymbol}{expense.amount.toFixed(2)}
                    </span>
                    
                    {/* Action Menu (Visible on hover/focus) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        onClick={() => removeExpense(expense.id)}
                        className="text-destructive hover:bg-destructive/10 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center mt-32 text-muted-foreground opacity-50">
            <CalendarIcon className="w-16 h-16 mb-4 stroke-1" />
            <p className="font-light tracking-wide text-lg">Calendar View Coming Soon in V3.1</p>
          </div>
        )}
      </div>

    </div>
  );
}
