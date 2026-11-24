"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useLockStore } from "@/store/useLockStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LockScreen() {
  const unlock = useLockStore((s) => s.unlock);
  const lockedUntil = useLockStore((s) => s.lockedUntil);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick while a back-off is active so the countdown updates.
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const waitSeconds = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || waitSeconds > 0 || pin.length < 4) return;
    setBusy(true);
    const ok = await unlock(pin);
    setBusy(false);
    if (!ok) {
      setError(true);
      setPin("");
    }
  };

  const reset = () => {
    if (
      window.confirm(
        "Forgot your PIN? The only way in is to erase all PocketFlow data on this device. This cannot be undone."
      )
    ) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="flex flex-col items-center gap-6 w-full max-w-xs">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-foreground/80" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-light tracking-tight">PocketFlow is locked</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter your PIN to continue.</p>
        </div>
        <Input
          autoFocus
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          aria-label="PIN"
          onChange={(e) => {
            setError(false);
            setPin(e.target.value.replace(/\D/g, ""));
          }}
          className="h-14 text-center text-2xl tracking-[0.5em] rounded-2xl border-white/10"
        />
        <p className="text-xs h-4 text-flow-amber" role="alert">
          {waitSeconds > 0 ? `Too many attempts. Try again in ${waitSeconds}s.` : error ? "Wrong PIN." : ""}
        </p>
        <Button type="submit" disabled={busy || waitSeconds > 0 || pin.length < 4} className="w-full h-12 rounded-full">
          Unlock
        </Button>
        <button type="button" onClick={reset} className="text-xs text-muted-foreground/70 hover:text-foreground underline underline-offset-4">
          Forgot PIN?
        </button>
      </form>
    </div>
  );
}
