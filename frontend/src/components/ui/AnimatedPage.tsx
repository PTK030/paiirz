import { motion } from "framer-motion";
import React from "react";

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -6 }
};

const pageTransition = {
  duration: 0.2,
  ease: "easeOut"
} as const;

export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, className = "" }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={`flex-grow flex flex-col w-full z-10 ${className}`}
    >
      {children}
    </motion.div>
  );
};
