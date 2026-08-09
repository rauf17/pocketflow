"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Wallet, Calendar, DollarSign, School } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";

export default function WelcomePage() {
  const router = useRouter();
  const { setUser, setIncome } = useUserStore();
  const { addRecurringBudget } = useBudgetStore();

  const [step, setStep] = useState(0);

  // Form State
  const [balance, setBalance] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [hostelMode, setHostelMode] = useState(false);

  const steps = [
    {
      id: "welcome",
      title: "Welcome to PocketFlow",
      description: "The co-pilot for your wallet.",
      icon: <Wallet className="w-12 h-12 text-flow-emerald mb-6" />,
      content: (
        <div className="flex flex-col items-center text-center mt-6">
          <p className="text-xs text-muted-foreground/70 tracking-wide font-medium">
            Know today&apos;s limit. Protect tomorrow&apos;s goals.
          </p>
        </div>
      ),
      isValid: () => true,
    },
    {
      id: "balance",
      title: "Current Balance",
      description: "How much is in your primary checking account?",
      icon: <DollarSign className="w-12 h-12 text-foreground mb-6" />,
      content: (
        <div className="relative w-full max-w-xs mt-8">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">{getCurrencySymbol("PKR")}</span>
          <Input
            autoFocus
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
            className="pl-10 text-3xl font-light h-16 rounded-2xl placeholder:text-muted-foreground/30 text-center border-white/10"
          />
        </div>
      ),
      isValid: () => !isNaN(Number(balance)) && balance !== "",
    },
    {
      id: "income",
      title: "Next Payday",
      description: "When do you get paid next, and how much?",
      icon: <Calendar className="w-12 h-12 text-foreground mb-6" />,
      content: (
        <div className="flex flex-col gap-4 w-full max-w-xs mt-8">
          <Input
            type="date"
            value={incomeDate}
            onChange={(e) => setIncomeDate(e.target.value)}
            className="h-14 rounded-2xl border-white/10"
          />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol("PKR")}</span>
            <Input
              type="number"
              placeholder="Amount"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              className="pl-10 h-14 rounded-2xl border-white/10"
            />
          </div>
        </div>
      ),
      isValid: () => incomeDate !== "" && !isNaN(Number(incomeAmount)) && incomeAmount !== "",
    },
    {
      id: "student",
      title: "Student Mode",
      description: "Are you a student living in a hostel?",
      icon: <School className="w-12 h-12 text-foreground mb-6" />,
      content: (
        <div className="flex gap-4 mt-8 w-full max-w-xs">
          <Button 
            variant={hostelMode ? "default" : "glass"} 
            className="flex-1 h-14 rounded-2xl"
            onClick={() => setHostelMode(true)}
          >
            Yes
          </Button>
          <Button 
            variant={!hostelMode ? "default" : "glass"} 
            className="flex-1 h-14 rounded-2xl"
            onClick={() => setHostelMode(false)}
          >
            No
          </Button>
        </div>
      ),
      isValid: () => true,
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Finalize Onboarding
      setUser({
        name: "User",
        currency: "PKR",
        theme: "dark",
        hostelDaysMode: hostelMode,
        balance: Number(balance),
        isOnboarded: true
      });
      
      setIncome({
        id: crypto.randomUUID(),
        amount: Number(incomeAmount),
        nextDate: new Date(incomeDate).toISOString(),
        frequency: "monthly"
      });

      if (hostelMode) {
        addRecurringBudget({
          title: "Hostel Food",
          amount: 150,
          frequency: "weekly",
          nextDueDate: new Date().toISOString()
        });
      }

      router.replace("/dashboard");
    }
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-flow-emerald/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col items-center text-center w-full max-w-md z-10"
        >
          {currentStep.icon}
          <h1 className="text-4xl font-light tracking-tight mb-2 text-foreground">
            {currentStep.title}
          </h1>
          <p className="text-muted-foreground">
            {currentStep.description}
          </p>

          {currentStep.content}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-12 w-full max-w-md px-6 flex justify-between items-center z-10">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-foreground' : 'w-2 bg-white/20'}`} 
            />
          ))}
        </div>
        
        <Button 
          size="lg" 
          className="rounded-full gap-2 px-8"
          disabled={!currentStep.isValid()}
          onClick={handleNext}
        >
          {step === steps.length - 1 ? "Finish" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
