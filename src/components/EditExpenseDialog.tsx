"use client";

import { useState, useEffect } from "react";
import { format, subDays, set as setDateParts } from "date-fns";
import { Calendar, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { getCurrencySymbol } from "@/lib/utils";
import type { Expense } from "@/store/types";

const DATE_FMT = "yyyy-MM-dd";
const todayStr = () => format(new Date(), DATE_FMT);
const yesterdayStr = () => format(subDays(new Date(), 1), DATE_FMT);

function parseLocalYMD(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toExpenseDate(pickedYMD: string, referenceIso: string): string {
  const [year, month, day] = pickedYMD.split("-").map(Number);
  // Preserve the original time-of-day when only the date changes.
  return setDateParts(new Date(referenceIso), { year, month: month - 1, date: day }).toISOString();
}

interface EditExpenseDialogProps {
  expense: Expense | null;
  onOpenChange: (open: boolean) => void;
}

export function EditExpenseDialog({ expense, onOpenChange }: EditExpenseDialogProps) {
  const { updateExpense, removeExpense } = useExpenseStore();
  const { updateBalance, user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setDescription(expense.description);
      setDate(format(new Date(expense.date), DATE_FMT));
    }
  }, [expense]);

  if (!expense) return null;

  const isToday = date === todayStr();
  const isYesterday = date === yesterdayStr();
  const isCustomDate = !isToday && !isYesterday;

  const handleSave = () => {
    const newAmount = Number(amount);
    if (!amount || isNaN(newAmount) || newAmount <= 0) return;

    const balanceDelta = expense.amount - newAmount; // e.g. amount went down -> money comes back
    if (balanceDelta !== 0) updateBalance(balanceDelta);

    updateExpense(expense.id, {
      amount: newAmount,
      description: description || "Expense",
      date: toExpenseDate(date, expense.date),
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    updateBalance(expense.amount); // give the money back
    removeExpense(expense.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!expense} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2rem] bg-card/95 backdrop-blur-3xl border border-white/10 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-light tracking-tight">Edit Expense</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-light text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-11 text-2xl font-light h-16 rounded-2xl border-white/5 bg-white/[0.02]"
            />
          </div>

          <Input
            type="text"
            placeholder="What was this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-12 rounded-2xl border-white/5 bg-white/[0.02]"
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDate(todayStr())}
                className={`px-4 h-9 rounded-full text-xs font-medium transition-all ${
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
                className={`px-4 h-9 rounded-full text-xs font-medium transition-all ${
                  isYesterday
                    ? "bg-foreground text-background"
                    : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                }`}
              >
                Yesterday
              </button>
              <div
                className={`flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-full transition-all ${
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
                  className="bg-transparent border-0 outline-none text-xs font-medium w-[104px] cursor-pointer"
                  aria-label="Pick an earlier date"
                />
              </div>
            </div>
            {!isToday && (
              <p className="text-xs text-muted-foreground pl-1">
                Recording expense for {format(parseLocalYMD(date), "MMM d")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="!bg-transparent !border-t-0 !mx-0 !mb-0 !p-0 mt-6 flex-row justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-foreground text-background hover:scale-[1.02] transition-transform rounded-xl px-6"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
