"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PieChart, Sparkles, Settings, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PocketFlowLogo } from "./PocketFlowLogo";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Expenses", href: "/expenses", icon: List },
  { name: "Budgets", href: "/budgets", icon: CalendarDays },
  { name: "Analytics", href: "/analytics", icon: PieChart },
  { name: "Advisor", href: "/advisor", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-card/40 backdrop-blur-3xl border-r border-white/5 p-6 z-40 fixed left-0 top-0">
      <div 
        className="mb-12 flex flex-col relative"
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
      >
        <div className="flex items-center gap-3 cursor-help">
          <PocketFlowLogo className="w-8 h-8" isHovered={isLogoHovered} />
          <h1 className="text-xl font-medium tracking-tight text-foreground/90">PocketFlow</h1>
        </div>
        
        <AnimatePresence>
          {isLogoHovered && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-12 left-0 w-64 bg-background/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50 pointer-events-none"
            >
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">The Concept</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center font-bold text-foreground">P</div>
                  <span className="text-xs text-muted-foreground leading-tight">The letter P</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center font-bold text-flow-emerald">~</div>
                  <span className="text-xs text-muted-foreground leading-tight">Flow / Path to success</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-flow-emerald" />
                  </div>
                  <span className="text-xs text-muted-foreground leading-tight">Guidance / Co-pilot</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <item.icon className="w-5 h-5 z-10" />
              <span className="font-medium tracking-wide z-10">{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  
  // Show only 4 items on mobile
  const mobileItems = [navItems[0], navItems[1], navItems[4], navItems[5]];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-card/80 backdrop-blur-3xl border-t border-white/5 pb-safe z-40">
      <div className="flex items-center justify-around p-2">
        {mobileItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center p-3 relative ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-6 h-6 z-10 mb-1" />
              <span className="text-[10px] font-medium tracking-wide z-10">{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="bottomnav-active"
                  className="absolute inset-2 bg-white/10 rounded-xl -z-0"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
