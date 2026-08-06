"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Brain, ArrowRight, Target, TrendingDown, RefreshCcw, Loader2 } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useGoalStore } from "@/store/useGoalStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdvisorPage() {
  const { user, income } = useUserStore();
  const { expenses } = useExpenseStore();
  const { weeklyPlan, profiles } = useProfileStore();
  const { goals } = useGoalStore();

  const [customScenario, setCustomScenario] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{title: string, impact: "positive" | "negative" | "neutral", summary: string} | null>(null);

  const scenarios = [
    {
      id: "afford",
      title: "Can I afford this?",
      description: "Check if a specific purchase is safe.",
      icon: Target,
      prompt: "I want to buy something for [AMOUNT]. Can I afford it today?",
      actionText: "Check Purchase"
    },
    {
      id: "delayed",
      title: "Salary Delayed",
      description: "What happens if income is late?",
      icon: ClockIcon, // Need to define or import Clock, replacing with RefreshCcw for now
      prompt: "What happens to my safe limit if my salary is delayed by 5 days?",
      actionText: "Simulate Delay"
    },
    {
      id: "inflation",
      title: "Cost Increase",
      description: "If recurring bills increase by 20%.",
      icon: TrendingDown,
      prompt: "Simulate a 20% increase in my upcoming bills. What is the impact?",
      actionText: "Simulate Increase"
    }
  ];

  const runSimulation = async (prompt: string) => {
    setIsSimulating(true);
    setSimulationResult(null);

    // Call actual Gemini API here
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          history: [],
          context: {
            balance: user?.balance,
            income: income?.amount,
            recentExpenses: expenses.slice(0, 5),
            weeklyPlan,
            profiles,
            goals: goals.map(g => ({ name: g.name, priority: g.priority, status: g.status, targetAmount: g.targetAmount, currentSaved: g.currentSaved, monthlyContribution: g.monthlyContribution }))
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        setSimulationResult({
          title: "Simulation Error",
          impact: "negative",
          summary: data.error
        });
        setIsSimulating(false);
        return;
      }

      const text = data.response || "";
      const lowerText = text.toLowerCase();
      let impact: "positive" | "negative" | "neutral" = "neutral";
      
      if (lowerText.includes("no") || lowerText.includes("cannot") || lowerText.includes("caution") || lowerText.includes("careful") || lowerText.includes("warning") || lowerText.includes("negative") || lowerText.includes("reduce") || lowerText.includes("overspend")) {
        impact = "negative";
      } else if (lowerText.includes("yes") || lowerText.includes("can afford") || lowerText.includes("safe") || lowerText.includes("positive") || lowerText.includes("good")) {
        impact = "positive";
      }

      setSimulationResult({
        title: "Simulation Complete",
        impact,
        summary: text
      });
      setIsSimulating(false);

    } catch (error) {
      console.error(error);
      setIsSimulating(false);
    }
  };

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
      
      <header className="w-full flex flex-col mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-foreground" />
          <h2 className="text-3xl font-light tracking-tight">Decision Center</h2>
        </motion.div>
        <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-sm text-muted-foreground mt-2">
          Run financial simulations powered by Gemini before making a move.
        </motion.p>
      </header>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {simulationResult ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex flex-col p-8 rounded-[2rem] border backdrop-blur-xl relative overflow-hidden ${
                simulationResult.impact === 'negative' ? 'bg-flow-amber/10 border-flow-amber/20' : 
                simulationResult.impact === 'positive' ? 'bg-flow-emerald/10 border-flow-emerald/20' : 
                'bg-card/40 border-white/10'
              }`}
            >
              <h3 className="text-xl font-medium tracking-tight mb-4">{simulationResult.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{simulationResult.summary}</p>
              
              <div className="mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => setSimulationResult(null)}
                  className="rounded-full px-6 bg-transparent border-white/20 hover:bg-white/5"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Run Another Scenario
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="scenarios"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="flex flex-col gap-8"
            >
              
              {/* Custom Scenario */}
              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute inset-0 bg-white/5 blur-xl rounded-[2rem] -z-10 group-focus-within:bg-white/10 transition-colors duration-500" />
                <div className="flex items-center relative">
                  <Input
                    value={customScenario}
                    onChange={(e) => setCustomScenario(e.target.value)}
                    placeholder="Ask 'What if I buy a laptop for 100k today?'"
                    className="h-16 pl-6 pr-32 rounded-[2rem] bg-card/60 border border-white/10 text-lg font-light placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-white/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customScenario) {
                        runSimulation(customScenario);
                      }
                    }}
                  />
                  <Button 
                    size="sm"
                    className="absolute right-2 h-12 rounded-xl bg-foreground text-background px-6"
                    onClick={() => runSimulation(customScenario)}
                    disabled={!customScenario || isSimulating}
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simulate"}
                  </Button>
                </div>
              </motion.div>

              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2 mt-4">
                Common Scenarios
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenarios.map((scenario) => (
                  <motion.button
                    key={scenario.id}
                    variants={itemVariants}
                    onClick={() => runSimulation(scenario.prompt)}
                    disabled={isSimulating}
                    className="flex flex-col text-left p-6 rounded-[2rem] bg-card/40 border border-white/5 hover:bg-card/60 transition-all hover:scale-[1.02] group"
                  >
                    <div className="p-3 rounded-2xl bg-white/5 mb-6 group-hover:bg-foreground group-hover:text-background transition-colors w-min">
                      <scenario.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-medium text-foreground/90 mb-2">{scenario.title}</h3>
                    <p className="text-xs text-muted-foreground mb-6 line-clamp-2">{scenario.description}</p>
                    
                    <div className="mt-auto flex items-center text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                      {scenario.actionText}
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                ))}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Temporary icon fallback if missing
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
