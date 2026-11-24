"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, TrendingDown, TrendingUp, Lightbulb } from "lucide-react";
import { useEngineInput } from "@/store/useBudget";
import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { simulateScenario } from "@/lib/budgetEngine";
import { buildWeeklyReview } from "@/lib/weeklyReview";
import { formatMoney } from "@/lib/currency";
import { Input } from "@/components/ui/input";

export default function ReviewPage() {
  const currency = useUserStore((s) => s.user?.currency);
  const input = useEngineInput();
  const expenses = useExpenseStore((s) => s.expenses);
  const { profiles, weeklyPlan } = useProfileStore();
  const categories = useBudgetStore((s) => s.categories);

  const [extraSpend, setExtraSpend] = useState("");
  const [oneOff, setOneOff] = useState("");
  const [delay, setDelay] = useState(0);

  const money = (n: number) => formatMoney(n, currency);

  const review = useMemo(
    () => buildWeeklyReview({ now: new Date(), expenses, profiles, weeklyPlan, categories }),
    [expenses, profiles, weeklyPlan, categories],
  );

  const sim = useMemo(
    () =>
      input
        ? simulateScenario(input, {
            extraSpendToday: Number(extraSpend) || 0,
            oneOffExpense: Number(oneOff) || 0,
            paydayDelayDays: delay,
          })
        : null,
    [input, extraSpend, oneOff, delay],
  );

  if (!input || !sim) return null;

  const touched = (Number(extraSpend) || 0) > 0 || (Number(oneOff) || 0) > 0 || delay > 0;
  const { before, after } = sim;
  const maxBar = Math.max(1, ...review.days.map((d) => Math.max(d.planned, d.actual)));

  let verdict: { tone: "good" | "warn" | "bad"; text: string };
  if (after.goalsProtectedMode && !before.goalsProtectedMode) {
    verdict = { tone: "bad", text: "This would eat into money reserved for bills and goals." };
  } else if (after.isOverBudget && !before.isOverBudget) {
    verdict = { tone: "bad", text: `This puts you ${money(Math.abs(after.remainingToday))} over today's safe limit.` };
  } else if (after.remainingToday < before.remainingToday * 0.35 && before.remainingToday > 0) {
    verdict = { tone: "warn", text: "Doable, but it leaves very little for the rest of today." };
  } else if (!touched) {
    verdict = { tone: "good", text: "Change a value above to see what happens." };
  } else {
    verdict = { tone: "good", text: "You can absorb this and stay on plan." };
  }

  const verdictColor = { good: "text-flow-emerald", warn: "text-flow-amber", bad: "text-destructive" }[verdict.tone];

  const rows: { label: string; before: string; after: string; worse: boolean }[] = [
    {
      label: "Left to spend today",
      before: money(Math.max(0, before.remainingToday)),
      after: money(Math.max(0, after.remainingToday)),
      worse: after.remainingToday < before.remainingToday,
    },
    {
      label: "Tomorrow's allowance",
      before: before.isTomorrowPayday ? "Payday" : money(before.tomorrowAllowance),
      after: after.isTomorrowPayday ? "Payday" : money(after.tomorrowAllowance),
      worse: after.tomorrowAllowance < before.tomorrowAllowance,
    },
    {
      label: "Spendable until payday",
      before: money(before.spendableBalance),
      after: money(after.spendableBalance),
      worse: after.spendableBalance < before.spendableBalance,
    },
    {
      label: "Average per day to payday",
      before: money(sim.perDayBefore),
      after: money(sim.perDayAfter),
      worse: sim.perDayAfter < sim.perDayBefore,
    },
  ];

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pt-16 px-6 pb-32 gap-16">
      <header>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-3xl font-light tracking-tight">Review &amp; What-if</h2>
          <p className="text-sm text-muted-foreground mt-2">Look back at your week, and test decisions before you make them.</p>
        </motion.div>
      </header>

      {/* ─── What-if simulator ─── */}
      <section aria-labelledby="whatif-title" className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-5 h-5 text-muted-foreground" />
          <h3 id="whatif-title" className="text-xl font-light tracking-tight">What if…</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">I spend today</span>
            <Input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="0"
              value={extraSpend}
              onChange={(e) => setExtraSpend(e.target.value)}
              className="h-14 rounded-[1.25rem] bg-white/[0.02] border-white/10"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">A one-off cost comes up</span>
            <Input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="0"
              value={oneOff}
              onChange={(e) => setOneOff(e.target.value)}
              className="h-14 rounded-[1.25rem] bg-white/[0.02] border-white/10"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">
              Payday is delayed by {delay} day{delay === 1 ? "" : "s"}
            </span>
            <input
              type="range"
              min={0}
              max={14}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="h-14 accent-[hsl(var(--flow-emerald,160_84%_39%))] cursor-pointer"
              aria-label="Days payday is delayed"
            />
          </label>
        </div>

        <div className="rounded-[2rem] bg-card/30 border border-white/5 backdrop-blur-xl p-6 flex flex-col gap-5">
          <p className={`text-sm font-medium ${verdictColor}`} role="status">{verdict.text}</p>
          <div className="flex flex-col divide-y divide-white/5">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-3 gap-4">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground/70">{r.before}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  <span className={touched && r.worse ? "text-flow-amber font-medium" : "text-foreground font-medium"}>{r.after}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70">
            Calculated with the same engine as your dashboard. Nothing is saved.
          </p>
        </div>
      </section>

      {/* ─── Weekly review ─── */}
      <section aria-labelledby="review-title" className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-muted-foreground" />
          <h3 id="review-title" className="text-xl font-light tracking-tight">Your last 7 days</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Spent" value={money(review.totalActual)} />
          <Stat label="Planned" value={money(review.totalPlanned)} />
          <Stat
            label={review.variance <= 0 ? "Under plan" : "Over plan"}
            value={money(Math.abs(review.variance))}
            tone={review.variance <= 0 ? "good" : "warn"}
            icon={review.variance <= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          />
          <Stat label="No-spend days" value={String(review.noSpendDays)} />
        </div>

        <div className="rounded-[2rem] bg-card/30 border border-white/5 backdrop-blur-xl p-6">
          <div className="flex items-end gap-2 h-40" role="img" aria-label="Planned versus actual spending for each of the last 7 days">
            {review.days.map((d) => (
              <div key={d.date.toISOString()} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="flex items-end gap-1 w-full h-full justify-center">
                  <div
                    className="w-1/3 max-w-3 rounded-t bg-white/15"
                    style={{ height: `${(d.tracked ? d.planned / maxBar : 0) * 100}%` }}
                    title={`Planned ${money(d.planned)}`}
                  />
                  <div
                    className={`w-1/3 max-w-3 rounded-t ${d.planned > 0 && d.actual > d.planned ? "bg-flow-amber" : "bg-flow-emerald"}`}
                    style={{ height: `${(d.actual / maxBar) * 100}%` }}
                    title={`Spent ${money(d.actual)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-white/15" /> Planned</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-flow-emerald" /> Spent</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-flow-amber" /> Over plan</span>
          </div>
        </div>

        {review.topCategory && (
          <p className="text-sm text-muted-foreground">
            Biggest category: <strong className="text-foreground">{review.topCategory.name}</strong> at{" "}
            <strong className="text-foreground">{money(review.topCategory.total)}</strong>.
            {review.overDays > 0 && ` You went over plan on ${review.overDays} day${review.overDays === 1 ? "" : "s"}.`}
          </p>
        )}

        {review.suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Suggested tweaks</h4>
            {review.suggestions.map((s) => (
              <div key={s.profileId + s.weekday} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-sm">
                <strong className="text-foreground">{s.weekday}s</strong> are planned as <em>{s.profileName}</em> ({money(s.planned)}) but
                you average {money(s.averageActual)}.{" "}
                {s.direction === "lower"
                  ? "Lowering that profile frees money for other days."
                  : "Raising it will keep your daily limit honest."}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
  icon?: React.ReactNode;
}) {
  const color = tone === "good" ? "text-flow-emerald" : tone === "warn" ? "text-flow-amber" : "text-foreground";
  return (
    <div className="p-5 rounded-[1.5rem] bg-card/30 border border-white/5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className={`flex items-center gap-2 text-2xl font-light ${color}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}
