export interface QuickStartCardProps {
  /** Starts matchmaking with gender filters forced to "any", bypassing saved preferences. */
  onQuickStart: () => void;
}

/**
 * @description Setup-screen card offering an instant, filter-free match.
 * Purely presentational.
 */
export function QuickStartCard({ onQuickStart }: QuickStartCardProps) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">Szybki start</h3>
          <p className="text-xs text-zinc-500">Losowy rozmówca - bez konfiguracji</p>
        </div>
      </div>
      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
        Kliknij i natychmiast zacznij rozmawiać z losową osobą.
      </p>
      <button
        onClick={onQuickStart}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer text-sm tracking-wide hover:scale-[1.01] active:scale-[0.98] outline-none shadow-[0_0_25px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 group"
      >
        <span>Zacznij rozmowę</span>
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
      <p className="mt-2 px-1 text-[10px] text-zinc-600 text-center leading-relaxed">
        Rozpoczynając rozmowę, akceptujesz{" "}
        <a
          href="/regulamin"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
        >
          Regulamin serwisu
        </a>
        .
      </p>
    </div>
  );
}
