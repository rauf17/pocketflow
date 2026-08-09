import { motion } from "framer-motion";

/**
 * PocketFlow Logo — Concept B Refined Proportions
 *
 * Proportional updates:
 *  - Stem (`M28 76 V22`): Slightly shortened vertical stem so bowl & flow take visual priority.
 *  - Prominent Bowl → Flow (`M28 22 C58 14 78 28 72 48 C66 64 46 68 86 36`):
 *    Expanded bowl radius and smoother transition sweeping upward into financial trajectory.
 *  - Anchor Dot (`cx: 86, cy: 36`): Perfectly aligned terminus marker.
 */
export const PocketFlowLogo = ({ className = "w-8 h-8", isHovered = false }: { className?: string, isHovered?: boolean }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* P — vertical stem (shortened slightly for balanced P proportions) */}
    <motion.path
      d="M28 76 V22"
      stroke="hsl(var(--foreground))"
      strokeWidth="11"
      strokeLinecap="round"
      initial={{ pathLength: 1 }}
      animate={{ pathLength: isHovered ? [1, 0, 1] : 1 }}
      transition={{ duration: 1.4, ease: "easeInOut" }}
    />

    {/* The Wave P — expanded bowl & continuous upward flow curve */}
    <motion.path
      d="M28 22 C58 14 78 28 72 48 C66 64 46 68 86 36"
      stroke="hsl(var(--brand-flow-emerald))"
      strokeWidth="8"
      strokeLinecap="round"
      initial={{ pathLength: 1 }}
      animate={{ pathLength: isHovered ? [1, 0, 1] : 1 }}
      transition={{ duration: 1.5, ease: "easeInOut", delay: 0.05 }}
    />

    {/* Anchor dot at trajectory terminus */}
    <motion.circle
      cx="86"
      cy="36"
      r="7"
      fill="hsl(var(--brand-flow-emerald))"
      animate={{ scale: isHovered ? [1, 1.35, 1] : 1 }}
      transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
    />
  </svg>
);

