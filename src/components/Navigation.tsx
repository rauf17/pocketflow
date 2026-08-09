"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, PieChart, Settings, Brain, Clock, Map, Wallet, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PocketFlowLogo } from "./PocketFlowLogo";
import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useGoalStore } from "@/store/useGoalStore";
import { startOfDay, differenceInDays } from "date-fns";
import { getCurrencySymbol } from "@/lib/utils";

const navItems = [
  { name: "Dashboard",  href: "/dashboard", icon: Home },
  { name: "Planner",    href: "/planner",   icon: Map },
  { name: "Expenses",   href: "/expenses",  icon: Receipt },
  { name: "Budgets",    href: "/budgets",   icon: Clock },
  { name: "Goals",      href: "/goals",     icon: Target },
  { name: "Analytics",  href: "/analytics", icon: PieChart },
  { name: "Advisor",    href: "/advisor",   icon: Brain },
  { name: "Settings",   href: "/settings",  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  
  const { user, income } = useUserStore();
  const { expenses } = useExpenseStore();
  const { goals } = useGoalStore();
  const atRiskGoals = goals.filter(g => g.status === 'at-risk' || g.status === 'behind');
  const activeGoals = goals.filter(g => g.status !== 'completed');

  const getSafeSpendingLimit = () => {
    if (!user || !income) return 0;
    const today = startOfDay(new Date());
    const incomeDate = startOfDay(new Date(income.nextDate));
    const days = Math.max(0, differenceInDays(incomeDate, today));
    return days === 0 ? user.balance : user.balance / days;
  };

  const limit = getSafeSpendingLimit();
  const today = startOfDay(new Date());
  const expensesToday = expenses
    .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
    .reduce((sum, e) => sum + e.amount, 0);
  
  const remaining = limit - expensesToday;
  const isOverBudget = remaining < 0;
  const currencySymbol = getCurrencySymbol(user?.currency);

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen bg-background/60 backdrop-blur-3xl border-r border-white/[0.03] p-6 z-40 fixed left-0 top-0">
      
      {/* Brand */}
      <div 
        className="mb-14 flex flex-col relative"
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
      >
        <div className="flex items-center gap-4 cursor-help px-2">
          <PocketFlowLogo className="w-9 h-9" isHovered={isLogoHovered} />
          <h1 className="text-xl font-medium tracking-tight text-foreground/90">PocketFlow</h1>
        </div>
        
        <AnimatePresence>
          {isLogoHovered && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-14 left-0 w-64 bg-card/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 shadow-2xl z-50 pointer-events-none"
            >
              <h4 className="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest mb-4">The Concept</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-medium text-sm text-foreground">P</div>
                  <span className="text-xs text-muted-foreground">The letter P</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-medium text-sm text-flow-emerald">~</div>
                  <span className="text-xs text-muted-foreground">Flow & Trajectory</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-flow-emerald" />
                  </div>
                  <span className="text-xs text-muted-foreground">Guidance Co-pilot</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isGoals = item.href === '/goals';
          const goalBadge = isGoals && activeGoals.length > 0
            ? atRiskGoals.length > 0
              ? { text: `${atRiskGoals.length} at risk`, color: 'text-flow-amber' }
              : { text: `${activeGoals.length} active`, color: 'text-flow-emerald' }
            : null;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
              }`}
            >
              <item.icon className={`w-5 h-5 z-10 transition-colors ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="font-medium tracking-wide text-sm z-10 flex-1">{item.name}</span>
              {goalBadge && (
                <span className={`text-[10px] font-medium z-10 ${goalBadge.color}`}>{goalBadge.text}</span>
              )}
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/[0.04] rounded-2xl border border-white/[0.05]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mini Summary Card */}
      {user && (
        <div className="mt-auto pt-8">
          <div className="p-4 rounded-[1.5rem] bg-card/30 border border-white/[0.03] backdrop-blur-md">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Remaining Today</h4>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-1.5 rounded-lg ${isOverBudget ? 'bg-flow-amber/10' : 'bg-flow-emerald/10'}`}>
                <Wallet className={`w-3 h-3 ${isOverBudget ? 'text-flow-amber' : 'text-flow-emerald'}`} />
              </div>
              <span className={`text-xl font-light ${isOverBudget ? 'text-muted-foreground' : 'text-foreground'}`}>
                {currencySymbol}{Math.max(0, remaining).toFixed(0)}
              </span>
            </div>
            {isOverBudget ? (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-flow-amber" />
                <span className="text-xs text-flow-amber font-medium">
                  {currencySymbol}{Math.abs(remaining).toFixed(0)} over budget
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-flow-emerald" />
                <span className="text-xs text-muted-foreground">On Track</span>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  
  // Show 5 essential items on mobile: Dashboard, Planner, Goals, Advisor, Settings
  const mobileItems = [navItems[0], navItems[1], navItems[4], navItems[6], navItems[7]];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-background/80 backdrop-blur-3xl border-t border-white/[0.03] pb-safe z-40">
      <div className="flex items-center justify-around p-2">
        {mobileItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center p-3 relative w-16 h-16 ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-6 h-6 z-10 mb-1" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide z-10">{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="bottomnav-active"
                  className="absolute inset-2 bg-white/[0.04] rounded-2xl -z-0 border border-white/[0.05]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
