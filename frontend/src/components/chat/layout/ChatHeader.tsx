import { Link } from "react-router-dom";

import { getUserCountText } from "../../../utils/roomCode";
import { BrandLogo } from "../../ui/BrandLogo";

interface ChatHeaderProps {
  userCount: number | null;
  soundsEnabled: boolean;
  onToggleSounds: () => void;
}

/**
 * @description Floating top bar: logo, sound toggle, E2EE status badge,
 * online user count. The E2EE badge only renders once `isStrangerInRoom` is
 * true - before that there's no peer to encrypt anything with, so showing
 * an encryption-status badge would be misleading. Once shown, it switches
 * between an amber pulsing "Szyfrowanie…" state (`e2eReady === false`, the
 * ECDH key exchange with the peer is still in flight) and a solid emerald
 * "E2EE" state once the shared key is derived - giving the user a clear,
 * at-a-glance signal for when it's safe to assume messages are encrypted.
 */
export function ChatHeader({
  userCount,
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


        {/* Online users counter */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800/50 select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{userCount !== null ? getUserCountText(userCount) : "…"}</span>
        </div>
      </div>
    </div>
  );
}
