"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  // Format the number to exactly 2 decimal places and split into an array of characters
  const formattedValue = value.toFixed(2);
  const characters = formattedValue.split('');

  // We want to animate only when the value changes, and we need to know direction
  // But a simple approach for an odometer is to just map each digit index to an AnimatePresence
  
  return (
    <div className={`flex overflow-hidden tabular-nums ${className || ''}`}>
      <span className="mr-1">$</span>
      <AnimatePresence mode="popLayout">
        {characters.map((char, index) => {
          // If it's the decimal point, just render it statically
          if (char === '.') {
            return <span key={`dot-${index}`}>.</span>;
          }
          
          return (
            <motion.span
              key={`${index}-${char}`}
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "100%", opacity: 0, position: "absolute" }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="inline-block"
            >
              {char}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
