import { useState } from "react";
import { motion } from "framer-motion";

type GameType = "this_or_that" | "truth_or_dare";
type TdChoice = "truth" | "dare";

interface GamesMenuProps {
  onTrigger: (type: GameType, customData?: unknown) => void;
  onClose: () => void;
}

/**
 * Floating dropdown with icebreaker game options.
 * Provides both standard random games and custom user-defined games.
 */
export function GamesMenu({ onTrigger, onClose }: GamesMenuProps) {
  const [tab, setTab] = useState<"standard" | "custom">("standard");
  const [customGameType, setCustomGameType] =
    useState<GameType>("this_or_that");
  const [customQ, setCustomQ] = useState("");
  const [customOpt1, setCustomOpt1] = useState("");
  const [customOpt2, setCustomOpt2] = useState("");
  const [customTdChoice, setCustomTdChoice] = useState<TdChoice>("truth");
  const [customTdText, setCustomTdText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSendThisOrThat = () => {
    if (!customQ.trim()) {
      setValidationError("Wpisz pytanie!");
      return;
    }
    setValidationError(null);
    onTrigger("this_or_that", {
      question: customQ.trim(),
      options: [customOpt1.trim() || "Opcja A", customOpt2.trim() || "Opcja B"],
    });
    setCustomQ("");
    setCustomOpt1("");
    setCustomOpt2("");
    onClose();
  };

  const handleSendTruthOrDare = () => {
    if (!customTdText.trim()) {
      setValidationError("Wpisz treść!");
      return;
    }
    setValidationError(null);
    onTrigger("truth_or_dare", {
      choice: customTdChoice,
      text: customTdText.trim(),
    });
    setCustomTdText("");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute bottom-full left-0 mb-4 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-zinc-950/95 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 flex flex-col games-menu-container"
    >
      {/* Tabs */}
      <div className="flex border-b border-zinc-800/50">
        <TabBtn active={tab === "standard"} onClick={() => setTab("standard")}>
          Standardowe
        </TabBtn>
        <TabBtn active={tab === "custom"} onClick={() => setTab("custom")}>
          Własne
        </TabBtn>
      </div>

      {validationError && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
          {validationError}
        </div>
      )}

      {tab === "standard" ? (
        <div className="p-2 flex flex-col gap-1">
          <GameBtn
            onClick={() => {
              onTrigger("this_or_that");
              onClose();
            }}
          >
            To czy To
          </GameBtn>
          <GameBtn
            onClick={() => {
              onTrigger("truth_or_dare");
              onClose();
            }}
          >
            Prawda czy Wyzwanie
          </GameBtn>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-4">
          {/* Game type toggle */}
          <div className="flex bg-zinc-900/80 rounded-xl p-1 border border-zinc-800/50">
            <ToggleBtn
              active={customGameType === "this_or_that"}
              onClick={() => setCustomGameType("this_or_that")}
            >
              To czy To
            </ToggleBtn>
            <ToggleBtn
              active={customGameType === "truth_or_dare"}
              onClick={() => setCustomGameType("truth_or_dare")}
            >
              Prawda/Wyzwanie
            </ToggleBtn>
          </div>

          {customGameType === "this_or_that" ? (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={customQ}
                onChange={(e) => setCustomQ(e.target.value)}
                placeholder="Pytanie (np. Kawa czy herbata?)"
                maxLength={80}
                className="w-full appearance-none bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 [-webkit-tap-highlight-color:transparent]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customOpt1}
                  onChange={(e) => setCustomOpt1(e.target.value)}
                  placeholder="Opcja A"
                  maxLength={25}
                  className="w-1/2 appearance-none bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 [-webkit-tap-highlight-color:transparent]"
                />
                <input
                  type="text"
                  value={customOpt2}
                  onChange={(e) => setCustomOpt2(e.target.value)}
                  placeholder="Opcja B"
                  maxLength={25}
                  className="w-1/2 appearance-none bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 [-webkit-tap-highlight-color:transparent]"
                />
              </div>
              <button
                type="button"
                onClick={handleSendThisOrThat}
                className="w-full bg-white text-zinc-950 font-bold py-3 px-6 rounded-xl transition-all duration-300 cursor-pointer text-xs sm:text-base text-center tracking-wider hover:scale-[1.01] active:scale-[0.99] outline-none shadow-md"
              >
                Wyślij to czy to
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex bg-zinc-900/80 rounded-xl p-1 border border-zinc-800/50">
                <ToggleBtn
                  active={customTdChoice === "truth"}
                  onClick={() => setCustomTdChoice("truth")}
                >
                  Prawda
                </ToggleBtn>
                <ToggleBtn
                  active={customTdChoice === "dare"}
                  onClick={() => setCustomTdChoice("dare")}
                >
                  Wyzwanie
                </ToggleBtn>
              </div>
              <textarea
                value={customTdText}
                onChange={(e) => setCustomTdText(e.target.value)}
                placeholder={
                  customTdChoice === "truth"
                    ? "Zadaj pytanie (Prawda)"
                    : "Wpisz wyzwanie"
                }
                rows={3}
                maxLength={120}
                className="w-full appearance-none bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 resize-none [-webkit-tap-highlight-color:transparent]"
              />
              <button
                type="button"
                onClick={handleSendTruthOrDare}
                className="mt-1 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-lg shadow-indigo-500/20"
              >
                Wyślij wyzwanie
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Internal UI helpers ───────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition-colors ${
        active
          ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
      }`}
    >
      {children}
    </button>
  );
}

function GameBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-3 text-left text-sm text-zinc-300 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl transition-all font-medium"
    >
      {children}
    </button>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
        active
          ? "bg-zinc-800 text-indigo-400 shadow-md"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
