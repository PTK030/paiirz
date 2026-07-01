import { motion, AnimatePresence } from "framer-motion";
import { BsTelephone, BsCameraVideo } from "react-icons/bs";

import type { UseContactExchangeReturn } from "../../hooks/useContactExchange";
import type { CallState } from "../../hooks/useWebRTC";

export interface ConversationTopBarProps {
  exchange: UseContactExchangeReturn;
  /** Sends `myContact` (from `exchange`) to the stranger, E2EE if a shared key is available. */
  onContactShare: () => void;
  contactMenuOpen: boolean;
  onToggleContactMenu: () => void;
  callState: CallState;
  onStartCall: (type: "voice" | "video") => void;
  vanishModeActive: boolean;
  onToggleVanish: () => void;
  onBlockStranger: () => void;
}

/**
 * @description Floating bar shown above the chat while a stranger is
 * connected: contact-exchange menu, voice/video call buttons, vanish-mode
 * toggle, and the block button. Purely presentational - all state
 * transitions live in `useContactExchange`, `useWebRTC` and the page-level
 * handlers passed in as props.
 */
export function ConversationTopBar({
  exchange,
  onContactShare,
  contactMenuOpen,
  onToggleContactMenu,
  callState,
  onStartCall,
  vanishModeActive,
  onToggleVanish,
  onBlockStranger,
}: ConversationTopBarProps) {
  const {
    exchangeState,
    setExchangeState,
    myContact,
    setMyContact,
    partnerContact,
    partnerWantsToExchange,
  } = exchange;

  return (
    <div className="absolute top-2 sm:top-4 left-0 right-0 z-20 flex flex-wrap justify-between items-center gap-y-2 px-2 sm:px-4 py-2 sm:py-2.5 mx-2 sm:mx-4 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-lg shadow-black/50">
      <div className="flex items-center gap-1.5 sm:gap-3">
        <span className="text-sm font-bold text-zinc-200 hidden sm:inline">
          Rozmowa z partnerem
        </span>
        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 select-none">
          Połączono
        </span>
      </div>

      <div className="flex items-center flex-wrap justify-end gap-1.5 sm:gap-2 relative contact-exchange-container">
        {/* Contact exchange button */}
        <div className="relative">
          <button
            onClick={onToggleContactMenu}
            className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer outline-none ${
              exchangeState === "exchanged"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : exchangeState === "waiting"
                  ? "border-zinc-800 bg-zinc-900 text-zinc-400"
                  : partnerWantsToExchange
                    ? "bg-indigo-600 text-white border-indigo-500 animate-pulse"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {exchangeState === "exchanged"
              ? "Kontakt 🫂"
              : exchangeState === "waiting"
                ? "Oczekiwanie..."
                : partnerWantsToExchange
                  ? "Odbierz"
                  : "Wymień"}
          </button>

          <AnimatePresence>
            {contactMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute top-full right-0 mt-2 w-72 bg-zinc-950/95 border border-zinc-800/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-3"
              >
                {exchangeState === "idle" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      {partnerWantsToExchange
                        ? "Rozmówca zaproponował wymianę kontaktów."
                        : "Możesz bezpiecznie wymienić się kontaktem."}
                    </p>
                    <button
                      onClick={() => setExchangeState("input")}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-2 text-xs transition-all shadow-lg shadow-indigo-500/20"
                    >
                      Udostępnij dane
                    </button>
                  </div>
                )}
                {exchangeState === "input" && (
                  <div className="flex flex-col gap-3 text-left">
                    <input
                      type="text"
                      value={myContact}
                      maxLength={50}
                      placeholder="np. IG: @nazwa, Discord: nick"
                      onChange={(e) => setMyContact(e.target.value)}
                      className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 [-webkit-tap-highlight-color:transparent]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={onContactShare}
                        disabled={!myContact.trim()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl py-2 text-xs transition-all"
                      >
                        Wyślij
                      </button>
                      <button
                        onClick={() => setExchangeState("idle")}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl py-2 text-xs transition-all"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}
                {exchangeState === "waiting" && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-zinc-300 text-center">
                      Propozycja wysłana. Oczekiwanie na ruch rozmówcy…
                    </span>
                  </div>
                )}
                {exchangeState === "exchanged" && partnerContact && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <span className="text-[11px] text-zinc-300">
                        Kontakt rozmówcy:{" "}
                        <strong className="text-emerald-400 block mt-1 text-sm break-all">
                          {partnerContact}
                        </strong>
                      </span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(partnerContact)}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl py-2 text-xs transition-all"
                    >
                      Skopiuj kontakt
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Call buttons */}
        {callState === "idle" && (
          <>
            <button
              onClick={() => onStartCall("voice")}
              title="Połączenie głosowe"
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer outline-none"
            >
              <BsTelephone size={14} />
            </button>
            <button
              onClick={() => onStartCall("video")}
              title="Połączenie wideo"
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer outline-none"
            >
              <BsCameraVideo size={14} />
            </button>
          </>
        )}

        <button
          onClick={onToggleVanish}
          className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border transition-all cursor-pointer outline-none ${
            vanishModeActive
              ? "bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          {vanishModeActive ? "Znikaj: ON" : "Znikaj: OFF"}
        </button>

        <button
          onClick={onBlockStranger}
          className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer outline-none"
        >
          Zablokuj
        </button>
      </div>
    </div>
  );
}
