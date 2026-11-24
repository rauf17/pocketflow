"use client";

import { useUserStore } from "@/store/useUserStore";

/** Shown while sample data is loaded. Clearing it returns to a clean first-run state. */
export function DemoBanner() {
  const isDemo = useUserStore((s) => !!s.user?.isDemo);
  if (!isDemo) return null;

  const startFresh = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="w-full bg-flow-emerald/10 border-b border-flow-emerald/20 text-xs text-foreground/80 flex items-center justify-center gap-3 px-4 py-2 text-center">
      <span>You&apos;re exploring sample data.</span>
      <button
        type="button"
        onClick={startFresh}
        className="font-medium underline underline-offset-4 hover:text-foreground min-h-[28px]"
      >
        Start fresh with my own
      </button>
    </div>
  );
}
