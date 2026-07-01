import type React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds hover/press affordances for cards that act like a clickable tile. */
  interactive?: boolean;
  /** Optional colored glow shown on hover. */
  glowColor?: "indigo" | "none";
}

/** @description Shared surface/panel primitive with consistent border, radius, and padding. */
export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  interactive = false,
  glowColor = "none",
}) => {
  const interactiveClasses = interactive
    ? "transition-all duration-300 hover:bg-zinc-900/40 cursor-pointer hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] shadow-lg hover:shadow-xl"
    : "shadow-lg";

  const glowClasses =
    glowColor === "indigo"
      ? "hover:border-indigo-500/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.03)]"
      : "hover:border-zinc-800/80";

  return (
    <div
      className={`bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 ${interactiveClasses} ${glowClasses} ${className}`}
    >
      {children}
    </div>
  );
};
