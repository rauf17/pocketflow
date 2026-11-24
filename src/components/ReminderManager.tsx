"use client";

import { useEffect } from "react";
import { startOfDay } from "date-fns";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUserStore } from "@/store/useUserStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { dueReminders } from "@/lib/reminders";
import { formatMoney } from "@/lib/currency";

const SEEN_KEY = "pocketflow_reminders_seen";

function readSeen(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSeen(seen: Record<string, true>) {
  try {
    // Keep it small: only the most recent keys matter.
    const keys = Object.keys(seen).slice(-200);
    const trimmed: Record<string, true> = {};
    keys.forEach((k) => (trimmed[k] = true));
    localStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage unavailable */
  }
}

async function notify(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: title });
      return;
    }
  } catch {
    /* fall through */
  }
  new Notification(title, { body, icon: "/icon-192.png" });
}

/**
 * Fires local notifications for due bills, payday and a daily logging nudge.
 * With no server there is no push: reminders are checked whenever the app is
 * opened, brought back to the foreground, or left open.
 */
export function ReminderManager() {
  const enabled = useSettingsStore((s) => s.remindersEnabled);

  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const check = () => {
      const { user, income } = useUserStore.getState();
      if (!user?.isOnboarded) return;
      const now = new Date();
      const today = startOfDay(now).getTime();
      const expensesToday = useExpenseStore
        .getState()
        .expenses.filter((e) => startOfDay(new Date(e.date)).getTime() === today).length;

      const reminders = dueReminders({
        now,
        bills: useBudgetStore.getState().recurringBudgets,
        income,
        expensesToday,
        formatMoney: (n) => formatMoney(n, user.currency),
      });

      const seen = readSeen();
      let changed = false;
      for (const r of reminders) {
        if (seen[r.key]) continue;
        seen[r.key] = true;
        changed = true;
        void notify(r.title, r.body);
      }
      if (changed) writeSeen(seen);
    };

    check();
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(check, 30 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [enabled]);

  return null;
}
