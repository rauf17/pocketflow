"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Plus, X, Trash2, Target, Edit2, Shield, Coffee, Briefcase, ShoppingBag, Zap, Plane, Laptop, Car, GraduationCap, Heart, Home, Star } from "lucide-react";
import { useGoalStore, computeCompletionDate, PRIORITY_ORDER } from "@/store/useGoalStore";
import { useUserStore } from "@/store/useUserStore";
import { getCurrencySymbol } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Goal, GoalPriority } from "@/store/types";

// ─── Config ───────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<GoalPriority, { label: string; dot: string; ring: string }> = {
  critical:      { label: "Critical",      dot: "bg-rose-500",   ring: "ring-rose-500/30" },
  important:     { label: "Important",     dot: "bg-orange-400", ring: "ring-orange-400/30" },
  planned:       { label: "Planned",       dot: "bg-yellow-400", ring: "ring-yellow-400/30" },
  "nice-to-have":{ label: "Nice to Have", dot: "bg-flow-emerald", ring: "ring-emerald-500/30" },
};

const STATUS_CONFIG = {
  "on-track": { label: "On Track",   color: "text-flow-emerald" },
  "ahead":    { label: "Ahead",      color: "text-flow-emerald" },
  "behind":   { label: "Behind",     color: "text-flow-amber" },
  "at-risk":  { label: "At Risk",    color: "text-flow-amber" },
  "completed":{ label: "Completed",  color: "text-muted-foreground" },
};

const ICONS = [
  { name: "Shield",     Icon: Shield },
  { name: "Target",     Icon: Target },
  { name: "Plane",      Icon: Plane },
  { name: "Laptop",     Icon: Laptop },
  { name: "Car",        Icon: Car },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "Heart",      Icon: Heart },
  { name: "Home",       Icon: Home },
  { name: "Star",       Icon: Star },
  { name: "Zap",        Icon: Zap },
  { name: "Coffee",     Icon: Coffee },
  { name: "Briefcase",  Icon: Briefcase },
  { name: "ShoppingBag",Icon: ShoppingBag },
];

const COLORS = ["emerald", "blue", "rose", "amber", "violet", "sky", "orange", "pink"];

const COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  blue:    "bg-blue-500/20 text-blue-400 border-blue-500/30",
  rose:    "bg-rose-500/20 text-rose-400 border-rose-500/30",
  amber:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
  violet:  "bg-violet-500/20 text-violet-400 border-violet-500/30",
  sky:     "bg-sky-500/20 text-sky-400 border-sky-500/30",
  orange:  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  pink:    "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

function GoalIcon({ name, className }: { name: string; className?: string }) {
  const found = ICONS.find(i => i.name === name);
  if (!found) return <Target className={className} />;
  const { Icon } = found;
  return <Icon className={className} />;
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  currencySymbol,
  onEdit,
  onDelete,
  itemVariants,
}: {
  goal: Goal;
  currencySymbol: string;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  itemVariants: Variants;
}) {
  const progress = Math.min(100, (goal.currentSaved / goal.targetAmount) * 100);
  const completionDate = computeCompletionDate(goal);
  const colorClass = COLOR_CLASSES[goal.color] || COLOR_CLASSES.emerald;
  const priorityCfg = PRIORITY_CONFIG[goal.priority];
  const statusCfg = STATUS_CONFIG[goal.status];

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="flex flex-col p-6 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-xl hover:bg-card/60 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorClass}`}>
            <GoalIcon name={goal.icon} className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground/90 text-lg">{goal.name}</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${priorityCfg.dot}`} />
              <span className="text-xs text-muted-foreground">{priorityCfg.label}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <Button variant="ghost" size="icon" onClick={() => onEdit(goal)} className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl w-8 h-8">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(goal.id)} className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl w-8 h-8">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex justify-between items-end mb-3">
        <span className="text-3xl font-light tracking-tight">
          {currencySymbol}{goal.currentSaved.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground mb-1">
          / {currencySymbol}{goal.targetAmount.toLocaleString()}
        </span>
      </div>

      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${goal.status === 'at-risk' || goal.status === 'behind' ? 'bg-flow-amber' : 'bg-flow-emerald'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{progress.toFixed(0)}% saved</span>
        {completionDate ? (
          <span>Est. {format(new Date(completionDate), "MMM yyyy")}</span>
        ) : goal.status === 'completed' ? (
          <span className="text-flow-emerald">Completed!</span>
        ) : (
          <span className="text-flow-amber">No contribution set</span>
        )}
      </div>

      {/* Monthly Contribution */}
      {goal.monthlyContribution > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Monthly contribution</span>
          <span className="text-sm font-medium text-foreground/80">{currencySymbol}{goal.monthlyContribution.toLocaleString()}</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Goal Form Modal ──────────────────────────────────────────────────────────
function GoalModal({
  initial,
  currencySymbol,
  onSave,
  onClose,
}: {
  initial?: Goal;
  currencySymbol: string;
  onSave: (data: Omit<Goal, 'id' | 'status' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "Target");
  const [color, setColor] = useState(initial?.color ?? "emerald");
  const [priority, setPriority] = useState<GoalPriority>(initial?.priority ?? "planned");
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount?.toString() ?? "");
  const [currentSaved, setCurrentSaved] = useState(initial?.currentSaved?.toString() ?? "0");
  const [monthlyContribution, setMonthlyContribution] = useState(initial?.monthlyContribution?.toString() ?? "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ? new Date(initial.targetDate).toISOString().split("T")[0] : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    onSave({
      name,
      icon,
      color,
      priority,
      targetAmount: Number(targetAmount),
      currentSaved: Number(currentSaved),
      monthlyContribution: Number(monthlyContribution) || 0,
      targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-card/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-light tracking-tight">{initial ? "Edit Goal" : "New Goal"}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full w-10 h-10 bg-white/5">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Goal Name</label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund, Ireland Trip" className="h-14 rounded-2xl border-white/10 bg-white/[0.02]" />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(({ name: iName, Icon }) => (
                <button type="button" key={iName} onClick={() => setIcon(iName)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${icon === iName ? 'bg-foreground text-background' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${COLOR_CLASSES[c]?.split(' ')[0]} ${color === c ? 'ring-2 ring-white/50 scale-110' : 'opacity-60 hover:opacity-100'}`} />
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_ORDER.map(p => (
                <Button key={p} type="button" variant={priority === p ? "default" : "glass"}
                  onClick={() => setPriority(p)}
                  className={`flex-1 h-10 rounded-xl text-xs capitalize ${priority === p ? 'bg-foreground text-background' : ''}`}>
                  {PRIORITY_CONFIG[p].label}
                </Button>
              ))}
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Target</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="100000" className="pl-10 h-14 rounded-2xl border-white/10 bg-white/[0.02]" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Already Saved</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                <Input type="number" value={currentSaved} onChange={e => setCurrentSaved(e.target.value)} placeholder="0" className="pl-10 h-14 rounded-2xl border-white/10 bg-white/[0.02]" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Monthly Contribution</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
              <Input type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} placeholder="5000" className="pl-10 h-14 rounded-2xl border-white/10 bg-white/[0.02]" />
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Target Date <span className="normal-case text-muted-foreground/60">(optional)</span></label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="h-14 rounded-2xl border-white/10 bg-white/[0.02] px-4" />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Notes <span className="normal-case text-muted-foreground/60">(optional)</span></label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Motivational note or reminder..." className="h-14 rounded-2xl border-white/10 bg-white/[0.02]" />
          </div>

          <Button type="submit" size="lg" disabled={!name || !targetAmount} className="w-full mt-2 h-16 rounded-[1.5rem] text-lg font-medium shadow-xl">
            {initial ? "Save Changes" : "Create Goal"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Mission Control Page ──────────────────────────────────────────────────────
export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoalStore();
  const { user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const openCreate = () => { setEditingGoal(null); setModalOpen(true); };
  const openEdit = (g: Goal) => { setEditingGoal(g); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingGoal(null); };

  const handleSave = (data: Omit<Goal, 'id' | 'status' | 'createdAt'>) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, data);
    } else {
      addGoal(data);
    }
  };

  // Group goals by priority
  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    acc[p] = goals.filter(g => g.priority === p);
    return acc;
  }, {} as Record<GoalPriority, Goal[]>);

  const totalMonthly = goals.filter(g => g.status !== 'completed').reduce((s, g) => s + g.monthlyContribution, 0);
  const atRiskCount = goals.filter(g => g.status === 'at-risk' || g.status === 'behind').length;
  const completedCount = goals.filter(g => g.status === 'completed').length;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-16 px-6 pb-32">

      <header className="w-full flex justify-between items-end mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-3xl font-light tracking-tight">Mission Control</h2>
          <p className="text-sm text-muted-foreground mt-2">Your financial goals, protected and on track.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Button onClick={openCreate} className="rounded-full gap-2 px-6 shadow-xl">
            <Plus className="w-4 h-4" /> New Goal
          </Button>
        </motion.div>
      </header>

      {/* Summary Strip */}
      {goals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="w-full grid grid-cols-3 gap-4 mb-10"
        >
          <div className="flex flex-col p-4 rounded-[1.5rem] bg-card/30 border border-white/5 text-center">
            <span className="text-2xl font-light">{goals.length - completedCount}</span>
            <span className="text-xs text-muted-foreground mt-1">Active Goals</span>
          </div>
          <div className={`flex flex-col p-4 rounded-[1.5rem] border text-center ${atRiskCount > 0 ? 'bg-flow-amber/5 border-flow-amber/20' : 'bg-flow-emerald/5 border-flow-emerald/20'}`}>
            <span className={`text-2xl font-light ${atRiskCount > 0 ? 'text-flow-amber' : 'text-flow-emerald'}`}>{atRiskCount > 0 ? atRiskCount : '✓'}</span>
            <span className="text-xs text-muted-foreground mt-1">{atRiskCount > 0 ? 'At Risk' : 'All On Track'}</span>
          </div>
          <div className="flex flex-col p-4 rounded-[1.5rem] bg-card/30 border border-white/5 text-center">
            <span className="text-2xl font-light">{currencySymbol}{totalMonthly.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground mt-1">Reserved / Month</span>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 text-center w-full"
        >
          <div className="w-24 h-24 rounded-[2rem] bg-card/30 border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
            <Target className="w-10 h-10 text-muted-foreground/50" strokeWidth={1} />
          </div>
          <h3 className="text-xl font-light tracking-tight mb-2">No goals yet</h3>
          <p className="text-sm text-muted-foreground max-w-[260px] mb-8">
            Create your first financial goal. PocketFlow will automatically protect it from your daily spending.
          </p>
          <Button onClick={openCreate} className="rounded-full px-8 gap-2">
            <Plus className="w-4 h-4" /> Create First Goal
          </Button>
        </motion.div>
      )}

      {/* Goals grouped by priority */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full flex flex-col gap-10">
        {PRIORITY_ORDER.map(priority => {
          const group = grouped[priority];
          if (group.length === 0) return null;
          const cfg = PRIORITY_CONFIG[priority];
          return (
            <div key={priority}>
              <div className="flex items-center gap-3 mb-4">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{cfg.label}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    currencySymbol={currencySymbol}
                    onEdit={openEdit}
                    onDelete={deleteGoal}
                    itemVariants={itemVariants}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <GoalModal
            initial={editingGoal ?? undefined}
            currencySymbol={currencySymbol}
            onSave={handleSave}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
