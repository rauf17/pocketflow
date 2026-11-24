"use client";

import { useEffect, useState } from "react";
import { Bell, Lock } from "lucide-react";
import { useLockStore } from "@/store/useLockStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { isValidPin } from "@/lib/pin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Reminders (local notifications) and the PIN app lock. */
export function DeviceSettings() {
  const remindersEnabled = useSettingsStore((s) => s.remindersEnabled);
  const setRemindersEnabled = useSettingsStore((s) => s.setRemindersEnabled);

  const hasPin = useLockStore((s) => !!s.pinHash);
  const autoLockMinutes = useLockStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useLockStore((s) => s.setAutoLockMinutes);
  const setPin = useLockStore((s) => s.setPin);
  const removePin = useLockStore((s) => s.removePin);

  const [notifSupported, setNotifSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [pinMode, setPinMode] = useState<"idle" | "set" | "remove">("idle");
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const toggleReminders = async () => {
    if (remindersEnabled) {
      setRemindersEnabled(false);
      return;
    }
    const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    setRemindersEnabled(result === "granted");
  };

  const submitPin = async () => {
    setMessage(null);
    if (pinMode === "set") {
      if (!isValidPin(pin)) return setMessage("Use 4 to 8 digits.");
      if (pin !== confirm) return setMessage("PINs don't match.");
      await setPin(pin);
      setMessage("PIN set. PocketFlow will lock when you leave the app.");
    } else if (pinMode === "remove") {
      const ok = await removePin(pin);
      if (!ok) return setMessage("Wrong PIN.");
      setMessage("PIN removed.");
    }
    setPinMode("idle");
    setPinValue("");
    setConfirm("");
  };

  return (
    <div className="flex flex-col gap-10 max-w-md">
      {/* Reminders */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground/90">Reminders</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Get a notification when a bill is due, payday is near, or you haven&apos;t logged spending by evening.
          With no server, reminders are checked whenever PocketFlow is open or brought back to the foreground.
        </p>
        {notifSupported ? (
          <div className="flex items-center gap-4">
            <Button variant="glass" onClick={toggleReminders} className="rounded-xl h-11 px-5">
              {remindersEnabled ? "Turn off reminders" : "Turn on reminders"}
            </Button>
            {permission === "denied" && (
              <span className="text-xs text-flow-amber">Notifications are blocked in your browser settings.</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/70">This browser doesn&apos;t support notifications.</p>
        )}
      </section>

      {/* PIN lock */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground/90">App lock</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Require a PIN to open PocketFlow. This keeps casual snoopers out on a shared or unlocked device; it doesn&apos;t
          encrypt the data stored in your browser.
        </p>

        {pinMode === "idle" && (
          <div className="flex flex-wrap items-center gap-3">
            {hasPin ? (
              <Button variant="glass" onClick={() => setPinMode("remove")} className="rounded-xl h-11 px-5">
                Remove PIN
              </Button>
            ) : (
              <Button variant="glass" onClick={() => setPinMode("set")} className="rounded-xl h-11 px-5">
                Set a PIN
              </Button>
            )}
            {hasPin && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Lock after
                <select
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                  className="h-10 rounded-xl bg-white/[0.04] border border-white/10 text-foreground px-3"
                >
                  <option value={0}>leaving the app</option>
                  <option value={1}>1 minute away</option>
                  <option value={5}>5 minutes away</option>
                  <option value={15}>15 minutes away</option>
                </select>
              </label>
            )}
          </div>
        )}

        {pinMode !== "idle" && (
          <div className="flex flex-col gap-3 max-w-xs">
            <Input
              autoFocus
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              placeholder={pinMode === "set" ? "New PIN (4–8 digits)" : "Current PIN"}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
              className="h-12 rounded-xl"
            />
            {pinMode === "set" && (
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={confirm}
                placeholder="Confirm PIN"
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                className="h-12 rounded-xl"
              />
            )}
            <div className="flex gap-2">
              <Button onClick={submitPin} className="rounded-xl h-11 px-5">
                {pinMode === "set" ? "Save PIN" : "Remove"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPinMode("idle");
                  setPinValue("");
                  setConfirm("");
                  setMessage(null);
                }}
                className="rounded-xl h-11"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {message && (
          <p className="text-xs text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
