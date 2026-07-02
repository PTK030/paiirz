import { motion } from "framer-motion";

import type { SessionStats } from "../../../types/message";

interface SessionSummaryProps {
  sessionStats: SessionStats;
  formatDuration: () => string;
  calculateWPM: () => number;
  getTotalSent: () => number;
  getTotalReceived: () => number;
  getDynamicFeedback: () => string;
  onClose: () => void;
  onNewConversation: () => void;
}

/**
 * @description Post-session statistics screen, shown when a stranger
 * disconnects. Styled to match the "Jak chcesz porozmawiać?" setup panel
 * aesthetic: dark zinc-950/40 cards with zinc-900 borders, coloured icon
 * badges, uppercase tracking labels, and the white CTA button.
 */
export function SessionSummary({
  sessionStats,
  formatDuration,
  calculateWPM,
  getTotalSent,
  getTotalReceived,
  getDynamicFeedback,
  onClose,
  onNewConversation,
}: SessionSummaryProps) {
  return (
    <div className="flex-grow flex flex-col p-4 sm:p-6 z-20 overflow-y-auto overscroll-contain">
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-[500px] flex flex-col gap-5 py-4 m-auto"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center relative">
          <button
            onClick={onClose}
            className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl border border-zinc-800/80 transition-colors cursor-pointer outline-none"
            title="Zamknij"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
            Podsumowanie rozmowy
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Statystyki ostatniej sesji</p>
        </div>

        {/* ── Feedback quote ───────────────────────────────────────────────── */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 shadow-lg flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed italic m-0">
            "{getDynamicFeedback()}"
          </p>
        </div>

        {/* ── Time + WPM row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={
              <svg
                className="w-4 h-4 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            iconBg="bg-zinc-800/80 border-zinc-700/50"
            label="Czas trwania"
            value={formatDuration()}
          />
          <StatCard
            icon={
              <svg
                className="w-4 h-4 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            }
            iconBg="bg-violet-500/15 border-violet-500/25"
            label="Tempo pisania"
            value={`${calculateWPM()}`}
            suffix="sł/min"
          />
        </div>

        {/* ── Sent / Received row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            }
            iconBg="bg-indigo-500/15 border-indigo-500/25"
            label="Wysłane (Ty)"
            value={`${getTotalSent()}`}
            valueColor="text-indigo-400"
            sub={`${sessionStats.sentTextCount} txt · ${sessionStats.sentAudioCount} głos · ${sessionStats.sentImageCount} zdj`}
          />
          <StatCard
            icon={
              <svg
                className="w-4 h-4 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            }
            iconBg="bg-cyan-500/15 border-cyan-500/25"
            label="Odebrane (Obcy)"
            value={`${getTotalReceived()}`}
            valueColor="text-cyan-400"
            sub={`${sessionStats.receivedTextCount} txt · ${sessionStats.receivedAudioCount} głos · ${sessionStats.receivedImageCount} zdj`}
          />
        </div>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={onNewConversation}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer text-sm tracking-wide hover:scale-[1.01] active:scale-[0.98] outline-none shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 group"
          >
            <span>Rozpocznij nową rozmowę</span>
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p className="mt-1 px-1 text-[10px] text-zinc-600 text-center leading-relaxed">
            Każda rozmowa jest anonimowa i szyfrowana end-to-end.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Internal helpers ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  suffix?: string;
  valueColor?: string;
  sub?: string;
}

/** @description Single labeled stat tile, styled to match the setup-panel cards. */
function StatCard({
  icon,
  iconBg,
  label,
  value,
  suffix,
  valueColor = "text-white",
  sub,
}: StatCardProps) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-tight">
          {label}
        </span>
      </div>
      <div className="pl-0.5">
        <span className={`text-2xl font-black tracking-tight ${valueColor}`}>
          {value}
          {suffix && <span className="text-xs font-medium text-zinc-500 ml-1.5">{suffix}</span>}
        </span>
        {sub && <p className="text-[10px] text-zinc-600 mt-1 font-medium leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}
