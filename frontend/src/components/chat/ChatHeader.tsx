import { Link } from "react-router-dom";

import { getUserCountText } from "../../utils/roomCode";
import { BrandLogo } from "../ui/BrandLogo";

interface ChatHeaderProps {
  userCount: number | null;
  isStrangerInRoom: boolean;
  e2eReady: boolean;
  soundsEnabled: boolean;
  onToggleSounds: () => void;
}

/** @description Floating top bar: logo, sound toggle, E2EE status badge, online user count. */
export function ChatHeader({
  userCount,
  isStrangerInRoom,
  e2eReady,
  soundsEnabled,
  onToggleSounds,
}: ChatHeaderProps) {
  return (
    <div className="relative z-20 flex flex-wrap items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-zinc-800/60 bg-zinc-950/30 backdrop-blur-md w-full gap-2">
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <Link
          to="/"
          className="flex items-center text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="flex items-center select-none mb-[2px]">
          <BrandLogo size="sm" />
        </h1>
      </div>

      <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-4 shrink-0">
        {/* Sound toggle */}
        <button
          onClick={onToggleSounds}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors duration-200 outline-none cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-zinc-800/50"
          title={soundsEnabled ? "Wyłącz dźwięki" : "Włącz dźwięki"}
        >
          {soundsEnabled ? (
            <>
              <svg
                className="w-4 h-4 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
              <span className="hidden sm:inline">Dźwięki: Wł</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
              <span className="hidden sm:inline">Dźwięki: Wył</span>
            </>
          )}
        </button>

        {/* E2EE Status Badge */}
        {isStrangerInRoom && (
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border select-none transition-all duration-500 ${
              e2eReady
                ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50"
                : "text-amber-400 bg-amber-950/40 border-amber-800/50"
            }`}
            title={
              e2eReady
                ? "Połączenie zaszyfrowane End-to-End (ECDH P-256 + AES-GCM 256)"
                : "Trwa negocjacja klucza E2EE…"
            }
          >
            <svg
              className={`w-3.5 h-3.5 ${!e2eReady ? "animate-pulse" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="hidden sm:inline">{e2eReady ? "E2EE" : "Szyfrowanie…"}</span>
          </div>
        )}

        {/* Online users counter */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800/50 select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{userCount !== null ? getUserCountText(userCount) : "…"}</span>
        </div>
      </div>
    </div>
  );
}
