import type React from "react";
import { memo, useEffect, useState } from "react";

/** How long a "vanishing" message stays visible after being read (seconds). */
const VANISH_COUNTDOWN_SECONDS = 5;
/** Tick interval for the vanish countdown display (ms). */
const VANISH_COUNTDOWN_TICK_MS = 1000;

export interface VanishingBubbleProps {
  msgId: string;
  isMe: boolean;
  onVanish: (id: string) => void;
  children: React.ReactNode;
}

/**
 * @description Wraps a "vanishing" message bubble with a countdown label;
 * calls `onVanish` once the countdown reaches zero so the caller can remove
 * the message from the chat state.
 */
function VanishingBubbleImpl({ msgId, isMe, onVanish, children }: VanishingBubbleProps) {
  const [timeLeft, setTimeLeft] = useState(VANISH_COUNTDOWN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onVanish(msgId);
          return 0;
        }
        return prev - 1;
      });
    }, VANISH_COUNTDOWN_TICK_MS);

    return () => clearInterval(timer);
  }, [msgId, onVanish]);

  return (
    <div className={`relative flex flex-col group w-fit ${isMe ? "items-end" : "items-start"}`}>
      {children}
      <div
        className={`flex items-center gap-1.5 mt-1 mx-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300 ${isMe ? "flex-row-reverse" : ""}`}
      >
        <svg
          className="w-3 h-3 text-violet-400 animate-pulse-soft"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-[10px] font-bold text-violet-400 tracking-wider uppercase">
          Znika za {timeLeft}s
        </span>
      </div>
    </div>
  );
}

export const VanishingBubble = memo(VanishingBubbleImpl);
