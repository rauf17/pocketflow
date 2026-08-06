"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useProfileStore } from "@/store/useProfileStore";
import { useUserStore } from "@/store/useUserStore";
import { getCurrencySymbol } from "@/lib/utils";
import { Shield, Coffee, Briefcase, ShoppingBag, Zap, Check } from "lucide-react";

export default function PlannerPage() {
  const { profiles, weeklyPlan, setDayProfile } = useProfileStore();
  const { user } = useUserStore();
  const currencySymbol = getCurrencySymbol(user?.currency);

  const [activeDay, setActiveDay] = useState<number | null>(null);

  const daysOfWeek = [
    { index: 1, name: "Monday" },
    { index: 2, name: "Tuesday" },
    { index: 3, name: "Wednesday" },
    { index: 4, name: "Thursday" },
    { index: 5, name: "Friday" },
    { index: 6, name: "Saturday" },
    { index: 0, name: "Sunday" },
  ];

  // Helper for dynamic icon
  const getIcon = (name: string, className = "w-5 h-5") => {
    switch (name) {
      case 'Shield': return <Shield className={className} />;
      case 'Coffee': return <Coffee className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      default: return <Zap className={className} />;
    }
  };

  const getProfile = (profileId: string) => profiles.find(p => p.id === profileId) || profiles[0];

  const handleSelectProfile = (dayIndex: number, profileId: string) => {
    setDayProfile(dayIndex, profileId);
    setActiveDay(null);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto pt-16 px-6 pb-32">
      
      <header className="w-full flex justify-between items-end mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-3xl font-light tracking-tight">Weekly Planner</h2>
          <p className="text-sm text-muted-foreground mt-2">Design your ideal spending week.</p>
        </motion.div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full flex flex-col gap-4"
      >
        {daysOfWeek.map((day) => {
          const profile = getProfile(weeklyPlan[day.index]);
          const isEditing = activeDay === day.index;

          return (
            <motion.div 
              variants={itemVariants}
              key={day.index} 
              layout
              className="flex flex-col p-2 rounded-[2rem] bg-card/40 border border-white/5 backdrop-blur-md overflow-hidden relative transition-all"
            >
              {/* Day Header - Always visible */}
              <button 
                onClick={() => setActiveDay(isEditing ? null : day.index)}
                className="flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-white/5 transition-colors w-full text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {day.name.substring(0, 3)}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5">
                      {getIcon(profile.icon, "w-4 h-4 text-foreground/80")}
                    </div>
                    <span className="font-medium text-foreground/90">{profile.name}</span>
                  </div>
                </div>
                
                <span className="text-lg font-light text-muted-foreground">
                  {profile.expectedSpend === 0 ? "PKR 0" : `${currencySymbol}${profile.expectedSpend.toFixed(0)}`}
                </span>
              </button>

              {/* Edit Mode Selection Area */}
              <AnimatePresence>
                {isEditing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-2 pt-2 px-2 pb-2"
                  >
                    <div className="h-px w-full bg-white/5 mb-2" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {profiles.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProfile(day.index, p.id)}
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl gap-2 transition-all relative ${
                            weeklyPlan[day.index] === p.id 
                              ? 'bg-foreground text-background' 
                              : 'bg-white/5 hover:bg-white/10 text-foreground'
                          }`}
                        >
                          {weeklyPlan[day.index] === p.id && (
                            <div className="absolute top-2 right-2">
                              <Check className="w-3 h-3 text-background" />
                            </div>
                          )}
                          {getIcon(p.icon, "w-5 h-5")}
                          <span className="text-xs font-medium text-center">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
