"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useUserStore } from "@/store/useUserStore";
import { useSnackbarStore } from "@/store/useSnackbarStore";
import { categoryUsage } from "@/lib/categoryBudgets";
import { formatMoney, getCurrencySymbol } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#ef4444", "#0ea5e9", "#94a3b8"];

const STATUS_BAR: Record<string, string> = {
  none: "bg-white/20",
  ok: "bg-flow-emerald",
  warning: "bg-flow-amber",
  over: "bg-destructive",
};

/** Monthly category limits with progress, plus add / rename / delete. */
export function CategoryBudgets() {
  const { categories, addCategory, updateCategory, removeCategory } = useBudgetStore();
  const expenses = useExpenseStore((s) => s.expenses);
  const currency = useUserStore((s) => s.user?.currency);
  const showSnackbar = useSnackbarStore((s) => s.show);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [adding, setAdding] = useState(false);

  const usage = useMemo(() => categoryUsage(categories, expenses), [categories, expenses]);
  const symbol = getCurrencySymbol(currency);

  const startEdit = (id: string, currentName: string, currentLimit?: number) => {
    setEditingId(id);
    setName(currentName);
    setLimit(currentLimit ? String(currentLimit) : "");
    setAdding(false);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const monthlyLimit = Number(limit) > 0 ? Number(limit) : undefined;
    if (editingId) {
      updateCategory(editingId, { name: trimmed, monthlyLimit });
    } else {
      addCategory({
        name: trimmed,
        icon: "circle",
        color: COLORS[categories.length % COLORS.length],
        monthlyLimit,
      });
    }
    setEditingId(null);
    setAdding(false);
    setName("");
    setLimit("");
  };

  const remove = (id: string) => {
    const removed = categories.find((c) => c.id === id);
    if (!removed) return;
    removeCategory(id);
    showSnackbar({
      message: `Deleted ${removed.name}`,
      actionLabel: "Undo",
      onAction: () => useBudgetStore.setState((s) => ({ categories: [...s.categories, removed] })),
    });
  };

  const editor = (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="h-10 text-sm bg-black/20 sm:flex-1"
      />
      <div className="flex items-center gap-2 sm:w-44">
        <span className="text-xs text-muted-foreground">{symbol}</span>
        <Input
          type="number"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="Monthly limit"
          className="h-10 text-sm bg-black/20"
        />
      </div>
      <div className="flex items-center gap-1">
        <Button variant="glass" size="icon" aria-label="Save category" onClick={save} className="text-flow-emerald rounded-xl">
          <Check className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cancel"
          onClick={() => {
            setEditingId(null);
            setAdding(false);
          }}
          className="rounded-xl"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <section className="w-full mt-16">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-xl font-light tracking-tight">Category limits</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cap what you spend per category each month. You&apos;ll be warned at 80%.
          </p>
        </div>
        <Button
          variant="glass"
          className="rounded-full gap-2"
          onClick={() => {
            setAdding(true);
            setEditingId(null);
            setName("");
            setLimit("");
          }}
        >
          <Plus className="w-4 h-4" /> Category
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {adding && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">{editor}</div>
        )}

        {usage.map(({ category, spent, limit: cap, ratio, status }) => (
          <div key={category.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            {editingId === category.id ? (
              editor
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                    <span className="font-medium truncate">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-sm mr-2 ${
                        status === "over" ? "text-destructive" : status === "warning" ? "text-flow-amber" : "text-muted-foreground"
                      }`}
                    >
                      {formatMoney(spent, currency)}
                      {cap ? ` / ${formatMoney(cap, currency)}` : " this month"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => startEdit(category.id, category.name, category.monthlyLimit)}
                      className="text-muted-foreground hover:text-foreground rounded-xl w-8 h-8"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => remove(category.id)}
                      className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl w-8 h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {cap && (
                  <div
                    className="h-1.5 rounded-full bg-white/5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round((ratio ?? 0) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${category.name} budget used`}
                  >
                    <motion.div
                      className={`h-full rounded-full ${STATUS_BAR[status]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (ratio ?? 0) * 100)}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
