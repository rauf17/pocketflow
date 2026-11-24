"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Plus, X, Calendar, Star, Zap } from "lucide-react";
import { format, subDays, set as setDateParts } from "date-fns";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useSnackbarStore } from "@/store/useSnackbarStore";
import { parseQuickEntry } from "@/lib/quickEntry";
import { categorySpentThisMonth, limitCrossingMessage } from "@/lib/categoryBudgets";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrencySymbol } from "@/lib/utils";

const DATE_FMT = "yyyy-MM-dd";
const todayStr = () => format(new Date(), DATE_FMT);
const yesterdayStr = () => format(subDays(new Date(), 1), DATE_FMT);

// new Date("yyyy-MM-dd") parses as UTC, which can roll the displayed day
// backward in negative-UTC-offset timezones. Parse as a local calendar
// date instead so the label always matches what was picked.
function parseLocalYMD(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Combine the picked calendar day with the current time-of-day, so a
// backdated expense still sorts/displays sensibly without ever landing
// on a future instant.
function toExpenseDate(pickedYMD: string): string {
  const [year, month, day] = pickedYMD.split("-").map(Number);
  return setDateParts(new Date(), { year, month: month - 1, date: day }).toISOString();
}

export function ExpenseInput() {
  const { addExpense, removeExpense, favorites, addFavorite, removeFavorite } = useExpenseStore();
  const { user, addDeposit, removeDeposit } = useUserStore();
  const categories = useBudgetStore((s) => s.categories);
  const showSnackbar = useSnackbarStore((s) => s.show);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"expense" | "income">("expense");
  const [quick, setQuick] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr());
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const currencySymbol = getCurrencySymbol(user?.currency);
  const controls = useAnimation();

  useEffect(() => setMounted(true), []);

  // The date must NEVER be remembered between visits — every time the
  // sheet opens, it defaults back to today.
  useEffect(() => {
    if (isOpen) {
      setDate(todayStr());
      setMode("expense");
      setQuick("");
      setCategoryId(undefined);
    }
  }, [isOpen]);

  // Global Keyboard shortcut (Shift + N or Alt + N to open Expense modal safely without browser conflicts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      // Check if user is currently typing in an input field
      const target = e.target as HTMLElement | null;
      const isInputActive = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      if (isInputActive) return;

      // Shift + N or Alt + N to open quick expense drawer
      if ((e.shiftKey || e.altKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!mounted) return null;

  const isToday = date === todayStr();
  const isYesterday = date === yesterdayStr();
  const isCustomDate = !isToday && !isYesterday;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      // Trigger error shake
      await controls.start({
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4, type: "spring", stiffness: 800 }
      });
      return;
    }
    
    // Trigger Success
    setIsSuccess(true);

    const value = Number(amount);
    setTimeout(() => {
      if (mode === "income") {
        const id = addDeposit({
          amount: value,
          date: toExpenseDate(date),
          label: description || "Income",
          kind: "manual",
        });
        showSnackbar({
          message: `Added ${formatMoney(value, user?.currency)} income`,
          actionLabel: "Undo",
          onAction: () => removeDeposit(id),
        });
      } else {
        const category = categories.find((c) => c.id === categoryId);
        const spentBefore = categoryId
          ? categorySpentThisMonth(useExpenseStore.getState().expenses, categoryId)
          : 0;
        const id = addExpense({
          amount: value,
          description: description || "Expense",
          date: toExpenseDate(date),
          categoryId,
        });
        const warning = limitCrossingMessage(category, spentBefore, value, (n) => formatMoney(n, user?.currency));
        showSnackbar({
          message: warning ?? `Added ${formatMoney(value, user?.currency)} expense`,
          tone: warning ? "warning" : "info",
          actionLabel: "Undo",
          onAction: () => removeExpense(id),
        });
      }
      setAmount("");
      setDescription("");
      setQuick("");
      setIsOpen(false);
      setIsSuccess(false);
    }, 600);
  };

  const applyQuick = (text: string) => {
    setQuick(text);
    const parsed = parseQuickEntry(text, categories);
    if (!parsed) return;
    setAmount(String(parsed.amount));
    setDescription(parsed.description);
    setCategoryId(parsed.categoryId);
    setDate(format(subDays(new Date(), parsed.daysAgo), DATE_FMT));
  };

  const applyFavorite = (fav: { description: string; amount: number; categoryId?: string }) => {
    setMode("expense");
    setAmount(String(fav.amount));
    setDescription(fav.description);
    setCategoryId(fav.categoryId);
  };

  const canSaveFavorite = mode === "expense" && Number(amount) > 0 && description.trim().length > 0;

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        data-tour="add-expense"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.5 }}
        className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-50 flex items-center gap-3 group/fab"
      >
        {/* Hover label */}
        <motion.span
          initial={{ opacity: 0, x: 8 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="hidden md:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full opacity-0 group-hover/fab:opacity-100 transition-all pointer-events-none select-none"
        >
          <span>Add Expense</span>
          <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-foreground/80">Shift+N</kbd>
        </motion.span>
        <Button
          onClick={() => setIsOpen(true)}
          title="Add Expense"
          aria-label="Add Expense"
          className="w-16 h-16 rounded-full bg-foreground text-background shadow-2xl hover:scale-105 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </Button>
      </motion.div>

      {/* Overlay Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            
            {/* Sheet Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-full max-w-lg bg-card/60 backdrop-blur-3xl border border-white/10 rounded-t-[3rem] md:rounded-[3rem] p-8 shadow-2xl relative z-10 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.04]">
                  {(["expense", "income"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-4 h-9 rounded-full text-sm font-medium capitalize transition-all ${
                        mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full w-10 h-10 bg-white/5 hover:bg-white/10"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative">
                
                {/* Success Overlay */}
                <AnimatePresence>
                  {isSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="absolute inset-0 z-20 flex items-center justify-center bg-card/40 backdrop-blur-md rounded-3xl"
                    >
                      <div className="w-20 h-20 bg-flow-emerald rounded-full flex items-center justify-center shadow-lg shadow-flow-emerald/20">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, delay: 0.2 }}
                        >
                          <svg className="w-10 h-10 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode === "expense" && (
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder='Quick add: "500 lunch" or "1.5k uber yesterday"'
                        value={quick}
                        onChange={(e) => applyQuick(e.target.value)}
                        className="pl-11 h-12 rounded-2xl text-sm placeholder:text-muted-foreground/40 border-white/5 bg-white/[0.02]"
                      />
                    </div>
                    {favorites.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {favorites.map((f) => (
                          <span key={f.id} className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/5 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => applyFavorite(f)}
                              className="pl-3 pr-2 h-8 text-xs font-medium text-foreground/80 hover:text-foreground"
                            >
                              {f.description} · {formatMoney(f.amount, user?.currency)}
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove favorite ${f.description}`}
                              onClick={() => removeFavorite(f.id)}
                              className="pr-2.5 pl-1 h-8 text-muted-foreground/50 hover:text-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <motion.div animate={controls} className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-light text-muted-foreground group-focus-within:text-foreground transition-colors">{currencySymbol}</span>
                  <Input
                    autoFocus
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-14 text-5xl font-light h-24 rounded-[2rem] placeholder:text-muted-foreground/20 border-white/5 bg-white/[0.02] focus-visible:bg-white/[0.05] focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                  />
                </motion.div>

                {/* Date selection */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDate(todayStr())}
                      className={`px-4 h-10 rounded-full text-sm font-medium transition-all ${
                        isToday
                          ? "bg-foreground text-background"
                          : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(yesterdayStr())}
                      className={`px-4 h-10 rounded-full text-sm font-medium transition-all ${
                        isYesterday
                          ? "bg-foreground text-background"
                          : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      }`}
                    >
                      Yesterday
                    </button>
                    <div
                      className={`flex items-center gap-1.5 h-10 pl-3 pr-2 rounded-full transition-all ${
                        isCustomDate
                          ? "bg-foreground text-background"
                          : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0 pointer-events-none" />
                      <input
                        type="date"
                        value={date}
                        max={todayStr()}
                        onChange={(e) => e.target.value && setDate(e.target.value)}
                        className="bg-transparent border-0 outline-none text-sm font-medium w-[112px] cursor-pointer"
                        aria-label="Pick an earlier date"
                      />
                    </div>
                  </div>
                  <AnimatePresence>
                    {!isToday && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-muted-foreground pl-1"
                      >
                        Recording expense for {format(parseLocalYMD(date), "MMM d")}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={mode === "income" ? "Where is this from?" : "What was this for?"}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-xl font-light h-16 rounded-[1.5rem] placeholder:text-muted-foreground/30 border-white/5 bg-white/[0.02] focus-visible:bg-white/[0.05] focus-visible:ring-1 focus-visible:ring-white/20 px-6 pr-14 transition-all"
                  />
                  {canSaveFavorite && (
                    <button
                      type="button"
                      title="Save as favorite"
                      aria-label="Save as favorite"
                      onClick={() => {
                        addFavorite({ description: description.trim(), amount: Number(amount), categoryId });
                        showSnackbar({ message: "Saved as a favorite" });
                      }}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-flow-amber transition-colors"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {mode === "expense" && categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
                        className={`px-3.5 h-9 rounded-full text-xs font-medium transition-all ${
                          categoryId === c.id
                            ? "bg-foreground text-background"
                            : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-4 h-16 rounded-[1.5rem] font-medium text-lg bg-foreground text-background hover:scale-[1.02] transition-transform shadow-xl"
                >
                  {mode === "income" ? "Record Income" : "Record Expense"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
