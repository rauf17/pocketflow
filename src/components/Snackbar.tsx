"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { useSnackbarStore } from "@/store/useSnackbarStore";

const DURATION_MS = 6000;

/** App-wide message bar. Used for Undo and for category-limit warnings. */
export function Snackbar() {
  const current = useSnackbarStore((s) => s.current);
  const dismiss = useSnackbarStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, DURATION_MS);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-28 md:bottom-8 z-[120] w-[calc(100%-2rem)] max-w-md pointer-events-none">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/95 backdrop-blur-3xl border border-white/10 shadow-2xl"
          >
            {current.tone === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-flow-amber shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm text-foreground/90 flex-1">{current.message}</span>
            {current.actionLabel && current.onAction && (
              <button
                type="button"
                onClick={() => {
                  current.onAction?.();
                  dismiss();
                }}
                className="text-sm font-semibold text-flow-emerald hover:underline underline-offset-4 shrink-0"
              >
                {current.actionLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
