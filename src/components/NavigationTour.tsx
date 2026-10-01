"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X, Compass } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { Button } from "@/components/ui/button";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "This is your financial cockpit: your safe-to-spend number, at a glance.",
    target: "nav-dashboard",
  },
  {
    id: "planner",
    title: "Planner & Day Profiles",
    description: "Mark your Safe Days and spending days here.",
    target: "nav-planner",
  },
  {
    id: "expenses",
    title: "Expenses History",
    description: "Log anything you spend here — it takes two taps.",
    target: "nav-expenses",
  },
  {
    id: "budgets",
    title: "Recurring Budgets",
    description: "Your bills are reserved before anything else.",
    target: "nav-budgets",
  },
  {
    id: "goals",
    title: "Financial Goals",
    description: "Optional — protect money toward something you're saving for.",
    target: "nav-goals",
  },
  {
    id: "analytics",
    title: "Analytics & Insights",
    description: "See where your money actually goes.",
    target: "nav-analytics",
  },
  {
    id: "advisor",
    title: "AI Co-Pilot Advisor",
    description: "Ask it anything about your money, in plain language.",
    target: "nav-advisor",
  },
  {
    id: "add-expense",
    title: "Quick Add Expense",
    description: "Fastest way to log a spend.",
    target: "add-expense",
  },
];

interface NavigationTourProps {
  manualOpen?: boolean;
  onCloseManual?: () => void;
}

export function NavigationTour({ manualOpen, onCloseManual }: NavigationTourProps) {
  const { user, setHasSeenTour } = useUserStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const isTourActive = Boolean(
    manualOpen || (user?.isOnboarded && !user?.hasSeenTour)
  );

  const currentStep = TOUR_STEPS[currentStepIndex];

  const updateTargetRect = useCallback(() => {
    if (!isTourActive || !currentStep) return;

    const elements = Array.from(document.querySelectorAll(`[data-tour="${currentStep.target}"]`));
    const visibleEl = elements.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    }) || elements[0];

    if (visibleEl) {
      setTargetRect(visibleEl.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isTourActive, currentStep]);

  useEffect(() => {
    if (!isTourActive) return;
    updateTargetRect();
    const interval = setInterval(updateTargetRect, 100);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [isTourActive, updateTargetRect, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setHasSeenTour(true);
    setCurrentStepIndex(0);
    if (onCloseManual) onCloseManual();
  };

  if (!isTourActive || !user) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] pointer-events-auto">
        {/* SVG Spotlight Mask */}
        <svg className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer" onClick={handleComplete}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="16"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#tour-spotlight-mask)"
            className="transition-all duration-300"
          />
        </svg>

        {/* Highlight Ring around active element */}
        {targetRect && (
          <motion.div
            layoutId="tour-highlight-ring"
            initial={false}
            animate={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="absolute z-[201] pointer-events-none border-2 border-flow-emerald rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          />
        )}

        {/* Tooltip Card */}
        <div className="absolute inset-0 z-[202] pointer-events-none flex items-center justify-center p-4 md:p-8">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto max-w-sm w-full bg-card/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 text-foreground relative"
          >
            {/* Header / Counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-flow-emerald uppercase tracking-widest">
                <Compass className="w-4 h-4 animate-spin-slow" />
                <span>Tour • {currentStepIndex + 1} of {TOUR_STEPS.length}</span>
              </div>
              <button
                onClick={handleComplete}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-white/5 transition-colors"
                title="Skip tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-light tracking-tight">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button
                onClick={handleComplete}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tour
              </button>

              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="h-9 px-3 text-xs rounded-xl hover:bg-white/5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="h-9 px-4 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-all shadow-md"
                >
                  {currentStepIndex === TOUR_STEPS.length - 1 ? (
                    <>
                      Finish
                      <Check className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
