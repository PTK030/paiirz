import { motion } from "framer-motion";

export interface SearchingScreenProps {
  isPrivateRoom: boolean;
  privateRoomCode: string;
  /** Cancels the in-progress search or waiting private room. */
  onCancel: () => void;
}

/**
 * @description Shown while waiting for a match (public search) or for a
 * guest to join a private room. Purely presentational.
 */
export function SearchingScreen({
  isPrivateRoom,
  privateRoomCode,
  onCancel,
}: SearchingScreenProps) {
  return (
    <div className="w-full max-w-md bg-zinc-950/40 border border-zinc-900 p-8 sm:p-10 rounded-2xl shadow-2xl flex flex-col gap-8 items-center text-center">
      <div className="relative flex items-center justify-center w-44 h-28">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-white/8 blur-2xl"
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg aria-hidden="true" viewBox="0 0 64 64" className="relative z-10 w-20 h-20">
          <path
            d="M16 37 A16 16 0 0 1 48 37"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          <motion.path
            d="M16 37 A16 16 0 0 1 48 37"
            pathLength={1}
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="0.14 0.86"
            initial={{ strokeDashoffset: 0, opacity: 0 }}
            animate={{
              strokeDashoffset: [0, -0.03, -0.86, -0.86, 0],
              opacity: [0, 0.68, 0.68, 0, 0],
            }}
            transition={{
              duration: 3,
              ease: "linear",
              repeat: Infinity,
              times: [0, 0.06, 0.84, 0.92, 1],
            }}
          />

          <circle cx="16" cy="37" r="6" fill="#FFFFFF" />
          <circle cx="48" cy="37" r="6" fill="#FFFFFF" />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {isPrivateRoom ? "Oczekiwanie na gościa" : "Dopasowywanie partnera"}
        </h2>
        <p className="text-sm text-zinc-400">
          {isPrivateRoom ? "Kod pokoju: " : "Szukanie rozmówcy według kryteriów…"}
        </p>
        {isPrivateRoom && privateRoomCode && (
          <div className="relative flex items-center justify-center mt-1 w-fit self-center">
            <span className="text-2xl font-black text-indigo-300 tracking-[0.3em] font-mono select-all pl-[0.3em]">
              {privateRoomCode}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(privateRoomCode)}
              title="Kopiuj kod"
              className="absolute left-full ml-3 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onCancel}
        className="w-full py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-semibold transition-all cursor-pointer text-sm"
      >
        Anuluj
      </button>
    </div>
  );
}
