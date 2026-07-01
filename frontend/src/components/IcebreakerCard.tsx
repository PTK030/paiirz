import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IcebreakerCardProps {
  msgId: string;
  icebreaker: {
    type: "this_or_that" | "truth_or_dare";
    question: string;
    options?: string[];
    votes: { [sid: string]: string | number };
    status: "pending" | "revealed" | "proposed" | "declined" | "quit";
    result?: string;
    voter_sid?: string;
    round?: number;
    turn_sid?: string;
    accepted_users?: string[];
    ready_for_next?: string[];
  };
  mySid: string;
  onAction: (
    messageId: string,
    action: string | number,
    actionType?:
      | "vote"
      | "complete_turn"
      | "skip_question"
      | "next_round"
      | "accept"
      | "decline"
      | "quit"
      | "reject_turn",
  ) => void;
}

export const IcebreakerCard: React.FC<IcebreakerCardProps> = ({
  msgId,
  icebreaker,
  mySid,
  onAction,
}) => {
  const votes = icebreaker.votes || {};
  const hasVoted = mySid in votes;
  const partnerVoteKey = Object.keys(votes).find((k) => k !== mySid);
  const isMyTurn = icebreaker.turn_sid === mySid;
  const currentRound = icebreaker.round || 1;

  const isThisOrThat = icebreaker.type === "this_or_that";
  const readyForNext = icebreaker.ready_for_next || [];

  // Card transition settings
  const containerVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.15, ease: "easeOut" as const },
    },
  };

  const contentTransition = { duration: 0.15, ease: "easeOut" as const };

  // 1. Proposed / Invitation State
  if (icebreaker.status === "proposed") {
    const isProposer = icebreaker.accepted_users?.includes(mySid);
    const gameName = isThisOrThat ? "TO CZY TO" : "PRAWDA CZY WYZWANIE";

    return (
      <motion.div
        layout
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm bg-zinc-900/80 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl my-4 mx-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/50">
          <span className="text-xs font-bold text-zinc-300 tracking-wider uppercase">
            {gameName}
          </span>
          <button
            onClick={() => onAction(msgId, "", "quit")}
            className="text-zinc-500 hover:text-red-400 transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-800"
            title="Wyjdź z gry"
          >
            ✕
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isProposer ? (
            <motion.div
              key="proposer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={contentTransition}
              className="p-5 flex flex-col items-center text-center gap-4"
            >
              <p className="text-sm text-zinc-400">
                Wysłano zaproszenie do gry. Oczekiwanie na akceptację...
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0"></div>
                <span>Czekam na drugiego gracza</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="joiner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={contentTransition}
              className="p-5 flex flex-col items-center text-center gap-5"
            >
              <p className="text-sm font-medium text-zinc-200">
                Rozmówca zaprosił Cię do gry.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => onAction(msgId, "", "accept")}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                >
                  Dołącz
                </button>
                <button
                  onClick={() => onAction(msgId, "", "decline")}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
                >
                  Odrzuć
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // 2. Declined Invitation State
  if (icebreaker.status === "declined") {
    const gameName = isThisOrThat ? "TO CZY TO" : "PRAWDA CZY WYZWANIE";
    return (
      <motion.div
        layout
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 my-2 mx-auto flex flex-col items-center text-center gap-2 opacity-70"
      >
        <div className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
          <span>{gameName}</span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-zinc-500 italic"
        >
          Zaproszenie zostało odrzucone.
        </motion.p>
      </motion.div>
    );
  }

  // 2b. Quit State
  if (icebreaker.status === "quit") {
    const gameName = isThisOrThat ? "TO CZY TO" : "PRAWDA CZY WYZWANIE";
    return (
      <motion.div
        layout
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 my-2 mx-auto flex flex-col items-center text-center gap-2 opacity-70"
      >
        <div className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
          <span>{gameName}</span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-zinc-500 italic"
        >
          Gra została zakończona.
        </motion.p>
      </motion.div>
    );
  }

  if (isThisOrThat) {
    const options = icebreaker.options || ["Tak", "Nie"];
    const myVote = icebreaker.votes[mySid];
    const partnerVote =
      partnerVoteKey !== undefined
        ? icebreaker.votes[partnerVoteKey]
        : undefined;

    const amIReady = readyForNext.includes(mySid);
    const isPartnerReady = readyForNext.some((sid) => sid !== mySid);

    return (
      <motion.div
        layout
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm bg-zinc-900/90 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl my-4 mx-auto ring-1 ring-white/5"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-5 py-3 bg-gradient-to-r from-indigo-500/10 to-transparent border-b border-indigo-500/20 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-indigo-300 tracking-wider uppercase whitespace-nowrap">
              To czy To
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
              Runda {currentRound}
            </span>
            {icebreaker.status === "revealed" && myVote === partnerVote && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] font-extrabold text-emerald-400 tracking-wider bg-emerald-500/10 px-2 py-1 rounded whitespace-nowrap"
              >
                ZGODNOŚĆ
              </motion.span>
            )}
          </div>
          <button
            onClick={() => onAction(msgId, "", "quit")}
            className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 mt-0.5"
            title="Wyjdź z gry"
          >
            ✕
          </button>
        </div>

        {/* Question */}
        <motion.h3
          layout="position"
          className="text-lg font-bold text-white text-center py-6 px-4 bg-zinc-800/20 border-b border-zinc-800/40"
        >
          {icebreaker.question}
        </motion.h3>

        {/* Game State Logic */}
        <AnimatePresence mode="wait">
          {icebreaker.status === "pending" ? (
            !hasVoted ? (
              // User hasn't voted yet
              <motion.div
                key="voting"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={contentTransition}
                className="p-5 flex flex-col gap-3"
              >
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAction(msgId, idx, "vote")}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-zinc-800/50 hover:bg-indigo-500/20 border border-zinc-700/50 hover:border-indigo-500/50 rounded-xl transition-all group active:scale-[0.98]"
                  >
                    <span className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-100">
                      {opt}
                    </span>
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-indigo-400 uppercase tracking-wider">
                      Wybierz
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : (
              // User has voted, waiting for partner
              <motion.div
                key="waiting"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={contentTransition}
                className="p-6 flex flex-col items-center gap-5"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                    Twój wybór:
                  </span>
                  <span className="text-lg font-bold text-indigo-400">
                    {options[Number(myVote)]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 bg-zinc-800/50 px-4 py-2 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse shrink-0"></div>
                  <span>Oczekiwanie na odpowiedź obcego</span>
                </div>
              </motion.div>
            )
          ) : (
            // Revealed status
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={contentTransition}
              className="p-5 flex flex-col gap-5"
            >
              <div className="flex flex-col gap-3">
                {options.map((opt, idx) => {
                  const isMyChoice = Number(myVote) === idx;
                  const isPartnerChoice = Number(partnerVote) === idx;
                  const isMatch = isMyChoice && isPartnerChoice;

                  return (
                    <motion.div
                      layout
                      key={idx}
                      className={`relative overflow-hidden rounded-xl border ${isMatch ? "bg-emerald-500/10 border-emerald-500/30" : isMyChoice ? "bg-indigo-500/10 border-indigo-500/30" : isPartnerChoice ? "bg-cyan-500/10 border-cyan-500/30" : "bg-zinc-800/30 border-zinc-800/50 opacity-50"}`}
                    >
                      <div className="px-4 py-3 flex items-center justify-between">
                        <span
                          className={`text-sm font-bold ${isMatch ? "text-emerald-300" : isMyChoice || isPartnerChoice ? "text-zinc-200" : "text-zinc-500"}`}
                        >
                          {opt}
                        </span>
                        <div className="flex gap-1.5">
                          {isMyChoice && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${isMatch ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"}`}
                            >
                              TY
                            </span>
                          )}
                          {isPartnerChoice && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${isMatch ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"}`}
                            >
                              OBCY
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Next Round Button with Dual Consent */}
              {amIReady ? (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse shrink-0"></div>
                  <span>Oczekiwanie na gotowość obcego (1/2)</span>
                </div>
              ) : (
                <button
                  onClick={() => onAction(msgId, "", "next_round")}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${isPartnerReady ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 animate-pulse-soft" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`}
                >
                  <span>
                    {isPartnerReady
                      ? "Obcy czeka! Następna runda"
                      : "Następna runda"}
                  </span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Truth or Dare (Prawda czy Wyzwanie)
  const isMyChoice = icebreaker.voter_sid === mySid;
  const voterLabel = isMyChoice ? "Twój wybór:" : "Wybór obcego:";

  const voterSid = icebreaker.voter_sid || "";
  const isVoterReady = readyForNext.includes(voterSid);
  const amIVoter = voterSid === mySid;

  return (
    <motion.div
      layout
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm bg-zinc-900/90 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl my-4 mx-auto ring-1 ring-white/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 sm:px-5 py-3 bg-gradient-to-r from-rose-500/10 to-transparent border-b border-rose-500/20 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-rose-300 tracking-wider uppercase whitespace-nowrap">
            Prawda czy Wyzwanie
          </span>
          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
            Runda {currentRound}
          </span>
          {icebreaker.status === "pending" && (
            <span
              className={`text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded whitespace-nowrap ${isMyTurn ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-400"}`}
            >
              {isMyTurn ? "TWÓJ RUCH" : "RUCH OBCEGO"}
            </span>
          )}
        </div>
        <button
          onClick={() => onAction(msgId, "", "quit")}
          className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 mt-0.5"
          title="Wyjdź z gry"
        >
          ✕
        </button>
      </div>

      <AnimatePresence mode="wait">
        {icebreaker.status === "pending" ? (
          isMyTurn ? (
            // My turn to choose
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={contentTransition}
              className="p-5 flex flex-col gap-4"
            >
              <p className="text-sm font-semibold text-zinc-300 text-center mb-1">
                Twoja kolej. Wybierz kategorię:
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => onAction(msgId, "truth", "vote")}
                  className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                >
                  Prawda
                </button>
                <button
                  onClick={() => onAction(msgId, "dare", "vote")}
                  className="flex-1 py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                >
                  Wyzwanie
                </button>
              </div>
            </motion.div>
          ) : (
            // Partner's turn to choose
            <motion.div
              key="partner-choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={contentTransition}
              className="p-8 flex flex-col items-center justify-center gap-4"
            >
              <div className="flex items-center gap-3 bg-zinc-800/30 px-5 py-3 rounded-full border border-zinc-800/50">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0"></div>
                <span className="text-sm font-medium text-zinc-400">
                  Obcy wybiera pomiędzy Prawdą a Wyzwaniem...
                </span>
              </div>
            </motion.div>
          )
        ) : (
          // Revealed status
          <motion.div
            key="revealed-td"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={contentTransition}
            className="p-5 flex flex-col gap-5"
          >
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                {voterLabel}
              </span>
              <span
                className={`text-xl font-black uppercase tracking-widest ${icebreaker.question === "Prawda" ? "text-emerald-400" : "text-rose-400"}`}
              >
                {icebreaker.question === "Prawda" ? "Prawda" : "Wyzwanie"}
              </span>
            </div>

            {/* Random Prompt Box */}
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-6 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-zinc-700 rounded-full" />
              <p className="text-base sm:text-lg font-bold text-white text-center italic leading-relaxed">
                "{icebreaker.result}"
              </p>
            </div>

            {/* Peer confirmation flow for Truth or Dare */}
            {!isVoterReady ? (
              amIVoter ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-center text-zinc-400 mb-1">
                    Odpowiedz na czacie i wyślij do potwierdzenia rozmówcy:
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAction(msgId, "", "complete_turn")}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                      title="Wyślij do potwierdzenia"
                    >
                      <span>Wyślij do potwierdzenia</span>
                    </button>
                    <button
                      onClick={() => onAction(msgId, "", "skip_question")}
                      className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-3 rounded-xl transition-colors border border-zinc-700 active:scale-[0.98]"
                      title="Wylosuj inne"
                    >
                      <span>Losuj inne</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse shrink-0"></div>
                  <span className="italic">
                    Oczekiwanie na zgłoszenie wykonania...
                  </span>
                </div>
              )
            ) : amIVoter ? (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse shrink-0"></div>
                <span>Oczekiwanie na potwierdzenie obcego...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-center text-zinc-400 mb-1">
                  Obcy oznaczył wykonanie. Potwierdzasz?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAction(msgId, "", "complete_turn")}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                  >
                    <span>Potwierdzam</span>
                  </button>
                  <button
                    onClick={() => onAction(msgId, "", "reject_turn")}
                    className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-3 rounded-xl transition-colors border border-zinc-700 active:scale-[0.98]"
                  >
                    <span>Nie wykonane</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
