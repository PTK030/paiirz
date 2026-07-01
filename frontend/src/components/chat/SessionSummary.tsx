import { motion } from "framer-motion";
import type { SessionStats } from "../../types/message";

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
 * Post-session statistics modal. Shown when a stranger disconnects.
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
    <div className="flex-grow flex items-center justify-center p-4 z-20">
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-[2rem] shadow-2xl flex flex-col gap-6 relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-white rounded-full transition-colors"
          title="Zamknij"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center gap-1">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Podsumowanie rozmowy
          </h2>
          <p className="text-sm text-zinc-400">Statystyki ostatniej sesji</p>
        </div>

        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 text-center italic text-zinc-300 font-medium text-sm shadow-inner">
          "{getDynamicFeedback()}"
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <StatCard label="Czas trwania" value={formatDuration()} />
          <StatCard
            label="Tempo pisania"
            value={`${calculateWPM()}`}
            suffix="sł/min"
          />
          <StatCard
            label="Wysłane (Ty)"
            value={`${getTotalSent()}`}
            color="indigo"
            sub={`${sessionStats.sentTextCount} txt • ${sessionStats.sentAudioCount} głos • ${sessionStats.sentImageCount} zdj`}
          />
          <StatCard
            label="Odebrane (Obcy)"
            value={`${getTotalReceived()}`}
            color="cyan"
            sub={`${sessionStats.receivedTextCount} txt • ${sessionStats.receivedAudioCount} głos • ${sessionStats.receivedImageCount} zdj`}
          />
        </div>

        <button
          onClick={onNewConversation}
          className="w-full relative overflow-hidden bg-white text-zinc-950 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer text-sm tracking-wider hover:scale-[1.02] active:scale-[0.98] outline-none shadow-[0_0_30px_rgba(255,255,255,0.15)] group flex items-center justify-center gap-2 mt-2"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Rozpocznij nową rozmowę
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>
      </motion.div>
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  suffix?: string;
  color?: "indigo" | "cyan";
  sub?: string;
}

function StatCard({ label, value, suffix, color, sub }: StatCardProps) {
  const valueColor =
    color === "indigo"
      ? "text-indigo-400"
      : color === "cyan"
      ? "text-cyan-400"
      : "text-white";
  const labelColor =
    color === "indigo"
      ? "text-indigo-400/80"
      : color === "cyan"
      ? "text-cyan-400/80"
      : "text-zinc-500";

  return (
    <div className="flex flex-col items-center justify-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${labelColor}`}>
        {label}
      </span>
      <span className={`text-xl font-black ${valueColor}`}>
        {value}
        {suffix && (
          <span className="text-xs font-medium text-zinc-500 ml-1">{suffix}</span>
        )}
      </span>
      {sub && (
        <span className="text-[10px] text-zinc-500 mt-1 font-medium">{sub}</span>
      )}
    </div>
  );
}
