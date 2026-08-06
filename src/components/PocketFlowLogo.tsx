import { motion } from "framer-motion";

export const PocketFlowLogo = ({ className = "w-8 h-8", isHovered = false }: { className?: string, isHovered?: boolean }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="pf-gradient" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3b82f6" /> {/* Blue */}
        <stop offset="100%" stopColor="#10b981" /> {/* Emerald */}
      </linearGradient>
    </defs>
    
    {/* The Stem of the P */}
    <motion.path 
      d="M25 85 V 35 C 25 20, 35 15, 50 15 H 60 C 80 15, 90 30, 90 45 C 90 60, 80 75, 60 75 H 40 C 25 75, 25 55, 45 55 C 50 55, 54 50, 58 45" 
      stroke="url(#pf-gradient)" 
      strokeWidth="14" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      initial={{ pathLength: 1 }}
      animate={{ pathLength: isHovered ? [1, 0, 1] : 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    />
    
    {/* The Co-pilot Dot */}
    <motion.circle 
      cx="70" 
      cy="28" 
      r="10" 
      fill="url(#pf-gradient)"
      animate={{ scale: isHovered ? [1, 1.5, 1] : 1 }}
      transition={{ duration: 1, ease: "easeInOut", delay: 0.2 }}
    />
  </svg>
);
