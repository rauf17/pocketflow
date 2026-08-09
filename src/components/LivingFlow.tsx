"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { startOfDay, differenceInDays } from "date-fns";

// ─── DayNode type (exported so dashboard can build trajectory) ────────────────
export interface DayNode {
  dateLabel: string;        // "Mon, 11 Aug"
  profileName: string;      // "Normal Day"
  profileType: string;      // "normal" | "safe" | "high" | "low"
  safeLimit: number;        // planned max spend for this day
  projectedSpend: number;   // expectedSpend from profile (or actualSpend if today)
  actualSpend?: number;     // only set for today
  remaining: number;        // safeLimit - spend
  isToday: boolean;
  status: "safe-day" | "on-track" | "approaching" | "over-budget";
}

// ─── Bezier helpers ───────────────────────────────────────────────────────────
// Match the SVG path: M0,startY C250,midY1 400,midY2 1000,endY
// ViewBox: 0 0 1000 150

function bezierPoint(
  t: number,
  startY: number, midY1: number, midY2: number, endY: number,
): { x: number; y: number } {
  const mt = 1 - t;
  const x = 3 * mt * mt * t * 250 + 3 * mt * t * t * 400 + t * t * t * 1000;
  const y =
    mt * mt * mt * startY +
    3 * mt * mt * t * midY1 +
    3 * mt * t * t * midY2 +
    t * t * t * endY;
  return { x, y };
}

// ─── Status chip colours ──────────────────────────────────────────────────────
function nodeColor(status: DayNode["status"], isToday: boolean): string {
  if (status === "over-budget") return "#f59e0b";    // amber
  if (status === "approaching") return "#f59e0b";
  if (status === "safe-day")    return "#10b981";    // emerald (dim for future)
  if (isToday)                  return "#10b981";
  return "#10b981";
}

// ─── Select representative nodes from the full trajectory ────────────────────
function selectNodes(trajectory: DayNode[]): Array<{ node: DayNode; t: number }> {
  if (trajectory.length === 0) return [];
  const result: Array<{ node: DayNode; t: number }> = [];

  // Today is always at the left
  result.push({ node: trajectory[0], t: 0.06 });

  const future = trajectory.slice(1);
  const maxFuture = Math.min(6, future.length);
  for (let i = 0; i < maxFuture; i++) {
    const idx = Math.round((i / Math.max(1, maxFuture - 1)) * (future.length - 1));
    const t = 0.18 + (i / Math.max(1, maxFuture - 1)) * 0.76;
    result.push({ node: future[idx], t: Math.min(0.94, t) });
  }
  return result;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function NodeTooltip({ node, x, y }: { node: DayNode; x: number; y: number }) {
  const isLeft = x < 20;
  const isRight = x > 80;
  const translateX = isLeft ? "0%" : isRight ? "-100%" : "-50%";
  // Flip tooltip above the line
  const translateY = y > 50 ? "-110%" : "10%";

  const statusLabel: Record<DayNode["status"], string> = {
    "safe-day":   "Safe Day",
    "on-track":   "On Track",
    "approaching":"Approaching",
    "over-budget":"Over Budget",
  };
  const statusColor: Record<DayNode["status"], string> = {
    "safe-day":   "text-flow-emerald",
    "on-track":   "text-flow-emerald",
    "approaching":"text-flow-amber",
    "over-budget":"text-flow-amber",
  };

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(${translateX}, ${translateY})`,
      }}
    >
      <div className="bg-background/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl min-w-[160px]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          {node.isToday ? "Today" : node.dateLabel}
        </p>
        <p className="text-xs font-medium text-foreground/80 mb-2">{node.profileName}</p>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Safe Limit</span>
            <span className="text-foreground font-medium">Rs{node.safeLimit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{node.isToday ? "Spent" : "Expected"}</span>
            <span className="text-foreground font-medium">Rs{node.projectedSpend.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Remaining</span>
            <span className={`font-medium ${node.remaining < 0 ? "text-flow-amber" : "text-foreground"}`}>
              {node.remaining < 0 ? "-" : ""}Rs{Math.abs(node.remaining).toLocaleString()}
            </span>
          </div>
        </div>
        <div className={`mt-2 pt-2 border-t border-white/5 text-[10px] font-semibold uppercase tracking-widest ${statusColor[node.status]}`}>
          {statusLabel[node.status]}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LivingFlow({
  profileType = "normal",
  dayTrajectory = [],
}: {
  profileType?: string;
  dayTrajectory?: DayNode[];
}) {
  const { user, income } = useUserStore();
  const { expenses } = useExpenseStore();
  const [mounted, setMounted] = useState(false);
  const [hoveredNodeIdx, setHoveredNodeIdx] = useState<number | null>(null);

  const rippleControls = useAnimation();
  const prevExpensesLength = useRef(expenses.length);

  const getSafeSpendingLimit = () => {
    if (!user || !income) return 0;
    const today = startOfDay(new Date());
    const incomeDate = startOfDay(new Date(income.nextDate));
    const days = Math.max(0, differenceInDays(incomeDate, today));
    return days === 0 ? user.balance : user.balance / days;
  };

  const getRemainingBudgetToday = () => {
    const limit = getSafeSpendingLimit();
    const today = startOfDay(new Date());
    const spentToday = expenses
      .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
      .reduce((sum, e) => sum + e.amount, 0);
    return limit - spentToday;
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && expenses.length > prevExpensesLength.current) {
      rippleControls.set({ scale: 0, opacity: 0.8 });
      rippleControls.start({
        scale: [0, 4, 10],
        opacity: [0.8, 0.4, 0],
        transition: { duration: 1.2, ease: "easeOut" },
      });
    }
    prevExpensesLength.current = expenses.length;
  }, [expenses.length, mounted, rippleControls]);

  if (!mounted) return <div className="h-32 w-full" />;

  const remaining = getRemainingBudgetToday();
  const limit = getSafeSpendingLimit();
  const ratio = limit > 0 ? remaining / limit : 0;
  const isOverBudget = remaining < 0;

  const color = isOverBudget ? "text-flow-amber" : "text-flow-emerald";

  // Path coordinates — identical to original
  const startY = 80;
  const endY   = isOverBudget ? 90  : 20;
  const midY1  = isOverBudget ? 95  : 40 + (1 - ratio) * 40;
  const midY2  = isOverBudget ? 100 : 30 + (1 - ratio) * 50;

  const smoothPath = `M0,${startY} C250,${midY1} 400,${midY2} 1000,${endY}`;
  const breathePath = `M0,${startY} C250,${midY1 - 5} 400,${midY2 + 5} 1000,${endY}`;
  const baseDuration = profileType === "safe" ? 6 : profileType === "high" ? 2 : 4;

  // Compute node positions along the bezier
  const selectedNodes = selectNodes(dayTrajectory);
  const nodePoints = selectedNodes.map(({ node, t }) => {
    const pt = bezierPoint(t, startY, midY1, midY2, endY);
    return {
      node,
      svgX: pt.x,
      svgY: pt.y,
      pctX: (pt.x / 1000) * 100,
      pctY: (pt.y / 150) * 100,
    };
  });

  return (
    <div className="relative w-full h-32">
      {/* Flow SVG — overflow hidden */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-flow-emerald/5 to-transparent transition-colors duration-1000"
          style={{ background: isOverBudget ? "linear-gradient(to top, rgba(245,158,11,0.05), transparent)" : undefined }}
        />
        <svg
          viewBox="0 0 1000 150"
          preserveAspectRatio="none"
          className={`w-full h-full ${color} mix-blend-screen drop-shadow-2xl transition-colors duration-700`}
        >
          <defs>
            <linearGradient id="flow-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="currentColor" stopOpacity="0.2" />
              <stop offset="50%"  stopColor="currentColor" stopOpacity="1" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Breathing line */}
          <motion.path
            d={smoothPath}
            animate={{ d: [smoothPath, breathePath, smoothPath] }}
            transition={{ duration: baseDuration, repeat: Infinity, ease: "easeInOut" }}
            fill="none" stroke="url(#flow-gradient)" strokeWidth="4" strokeLinecap="round"
            filter="url(#glow)"
          />
          {/* Depth shadow */}
          <motion.path
            d={smoothPath}
            animate={{ d: [smoothPath, breathePath, smoothPath] }}
            transition={{ duration: baseDuration, repeat: Infinity, ease: "easeInOut" }}
            fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
            className="opacity-10 blur-md"
          />
          {/* Ripple */}
          <motion.circle
            cx="500" cy="50" r="10"
            fill="none" stroke="currentColor" strokeWidth="2"
            initial={{ opacity: 0 }} animate={rippleControls}
            className="origin-center"
          />

          {/* Day node circles — render inside SVG for precise positioning */}
          {nodePoints.map((pt, i) => {
            const isHovered = hoveredNodeIdx === i;
            const col = nodeColor(pt.node.status, pt.node.isToday);
            const r = pt.node.isToday ? 7 : 4;
            return (
              <g key={i}>
                {/* Hover hit area */}
                <circle
                  cx={pt.svgX} cy={pt.svgY} r={20}
                  fill="transparent"
                  style={{ pointerEvents: "all", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredNodeIdx(i)}
                  onMouseLeave={() => setHoveredNodeIdx(null)}
                />
                {/* Glow ring on hover */}
                {(isHovered || pt.node.isToday) && (
                  <circle
                    cx={pt.svgX} cy={pt.svgY} r={r + 6}
                    fill={col} fillOpacity={0.15}
                    style={{ pointerEvents: "none" }}
                  />
                )}
                {/* Node dot */}
                <motion.circle
                  cx={pt.svgX} cy={pt.svgY} r={r}
                  fill={col}
                  fillOpacity={pt.node.isToday ? 1 : (isHovered ? 0.9 : 0.45)}
                  stroke={col} strokeWidth={pt.node.isToday ? 2 : 1}
                  strokeOpacity={0.6}
                  animate={pt.node.isToday ? { r: [r, r + 1.5, r], fillOpacity: [1, 0.8, 1] } : {}}
                  transition={pt.node.isToday ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltips — rendered outside overflow-hidden so they don't clip */}
      {nodePoints.map((pt, i) =>
        hoveredNodeIdx === i ? (
          <NodeTooltip key={i} node={pt.node} x={pt.pctX} y={pt.pctY} />
        ) : null
      )}
    </div>
  );
}
