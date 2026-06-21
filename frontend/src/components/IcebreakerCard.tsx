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
    actionType?: "vote" | "complete_turn" | "skip_question" | "next_round" | "accept" | "decline" | "quit"
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
  const partnerVoteKey = Object.keys(votes).find(k => k !== mySid);
  const isMyTurn = icebreaker.turn_sid === mySid;
  const currentRound = icebreaker.round || 1;

  const isThisOrThat = icebreaker.type === "this_or_that";
  const readyForNext = icebreaker.ready_for_next || [];

  // Card transition settings (no spring, linear fade-in)
  const containerVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.15, ease: "easeOut" as const }
    }
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
        className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-4 text-zinc-200 select-none my-3 backdrop-blur-md font-sans"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest text-zinc-400">{gameName}</span>
          <button
            onClick={() => onAction(msgId, "", "quit")}
            className="text-zinc-500 hover:text-zinc-350 text-xs transition-colors cursor-pointer select-none outline-none font-sans"
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
              className="flex flex-col items-center py-2 gap-3"
            >
              <p className="text-xs sm:text-sm text-zinc-400 text-center font-sans leading-relaxed">
                Wysłano zaproszenie do gry. Oczekiwanie na akceptację...
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 justify-center py-1 font-sans">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-650 animate-pulse"></div>
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
              className="flex flex-col gap-4"
            >
              <p className="text-xs sm:text-sm text-zinc-350 text-center font-sans font-medium">
                Rozmówca zaprosił Cię do gry.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => onAction(msgId, "", "accept")}
                  className="flex-1 bg-white hover:bg-zinc-150 text-zinc-950 font-sans font-extrabold py-2.5 px-3.5 rounded-xl text-xs transition-all duration-200 cursor-pointer text-center outline-none border border-transparent shadow-md"
                >
                  Dołącz
                </button>
                <button
                  onClick={() => onAction(msgId, "", "decline")}
                  className="flex-1 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 font-sans font-bold py-2.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all duration-200 text-center outline-none border border-transparent shadow-sm"
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
        className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-3 text-zinc-455 select-none my-3 backdrop-blur-md font-sans"
      >
        <div className="flex items-center gap-1.5 opacity-65 border-b border-zinc-800 pb-2">
          <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest">{gameName}</span>
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center italic py-2 text-zinc-550 font-sans font-medium"
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
        className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-3 text-zinc-455 select-none my-3 backdrop-blur-md font-sans"
      >
        <div className="flex items-center gap-1.5 opacity-65 border-b border-zinc-800 pb-2">
          <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest">{gameName}</span>
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center italic py-2 text-zinc-550 font-sans font-medium"
        >
          Gra została zakończona.
        </motion.p>
      </motion.div>
    );
  }

  if (isThisOrThat) {
    const options = icebreaker.options || ["Tak", "Nie"];
    const myVote = icebreaker.votes[mySid];
    const partnerVote = partnerVoteKey !== undefined ? icebreaker.votes[partnerVoteKey] : undefined;

    const amIReady = readyForNext.includes(mySid);
    const isPartnerReady = readyForNext.some(sid => sid !== mySid);

    return (
      <motion.div 
        layout 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-4 text-zinc-200 select-none my-3 backdrop-blur-md font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest text-zinc-400">To czy To</span>
            <span className="text-[9px] bg-zinc-900/60 text-zinc-450 border border-zinc-850/60 px-2 py-0.5 rounded-full font-mono">
              Runda {currentRound}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {icebreaker.status === "revealed" && myVote === partnerVote && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.1)]"
              >
                ZGODNOŚĆ
              </motion.span>
            )}
            <button
              onClick={() => onAction(msgId, "", "quit")}
              className="text-zinc-500 hover:text-zinc-350 text-xs transition-colors cursor-pointer outline-none"
              title="Wyjdź z gry"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Question */}
        <motion.h3 
          layout="position"
          className="font-extrabold text-zinc-100 text-sm sm:text-base leading-snug font-sans"
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
                className="flex flex-col gap-2"
              >
                {options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAction(msgId, idx, "vote")}
                    className="w-full bg-zinc-900/40 hover:bg-zinc-800/40 text-zinc-200 text-xs sm:text-sm font-bold py-3 px-4 rounded-xl border border-zinc-850 hover:border-indigo-500/35 transition-all cursor-pointer text-left flex items-center justify-between outline-none shadow-sm"
                  >
                    <span>{opt}</span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-extrabold">Wybierz</span>
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
                className="flex flex-col gap-3.5 py-1"
              >
                <div className="bg-zinc-950/60 border border-zinc-850 p-3.5 rounded-xl flex flex-col gap-1 text-xs shadow-inner">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px]">Twój wybór:</span>
                  <span className="text-zinc-200 font-extrabold text-sm font-sans">
                    {options[Number(myVote)]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 justify-center py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"></div>
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
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-2">
                {options.map((opt, idx) => {
                  const isMyChoice = Number(myVote) === idx;
                  const isPartnerChoice = Number(partnerVote) === idx;

                  return (
                    <motion.div
                      layout
                      key={idx}
                      className={`relative w-full rounded-xl border p-3.5 flex flex-col gap-1 text-xs sm:text-sm font-bold transition-all ${
                        isMyChoice && isPartnerChoice
                          ? "bg-green-500/5 border-green-500/35 text-green-300"
                          : isMyChoice
                          ? "bg-indigo-500/5 border-indigo-500/35 text-indigo-300"
                          : isPartnerChoice
                          ? "bg-zinc-900/30 border-zinc-800/80 text-zinc-400"
                          : "bg-zinc-950/10 border-zinc-900 text-zinc-650"
                      }`}
                    >
                      <div className="flex items-center justify-between z-10">
                        <span className="font-sans font-semibold">{opt}</span>
                        <div className="flex gap-1.5">
                          {isMyChoice && (
                            <span className="bg-indigo-500/10 border border-indigo-500/25 text-[8px] font-extrabold px-1.5 py-0.5 rounded text-indigo-400">
                              TY
                            </span>
                          )}
                          {isPartnerChoice && (
                            <span className="bg-zinc-900 border border-zinc-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded text-zinc-500">
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
                <div className="w-full mt-2 bg-zinc-900/60 text-zinc-550 border border-zinc-850/80 font-bold py-3 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2 shadow-inner">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"></div>
                  <span>Oczekiwanie na gotowość obcego (1/2)</span>
                </div>
              ) : (
                <button
                  onClick={() => onAction(msgId, "", "next_round")}
                  className="w-full mt-2 bg-white hover:bg-zinc-150 text-zinc-950 font-extrabold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer text-xs sm:text-sm text-center flex items-center justify-center gap-1.5 outline-none border border-transparent shadow-md"
                >
                  <span>{isPartnerReady ? "Obcy czeka! Następna runda" : "Następna runda"}</span>
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
      className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-4 text-zinc-200 select-none my-3 backdrop-blur-md font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-sans font-extrabold tracking-widest text-zinc-400">Prawda czy Wyzwanie</span>
          <span className="text-[9px] bg-zinc-900/60 text-zinc-450 border border-zinc-850/60 px-2 py-0.5 rounded-full font-mono">
            Runda {currentRound}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {icebreaker.status === "pending" && (
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
              isMyTurn 
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.1)] animate-pulse" 
                : "bg-zinc-900/60 text-zinc-450 border-zinc-850/60 border-transparent"
            }`}>
              {isMyTurn ? "TWÓJ RUCH" : "RUCH OBCEGO"}
            </span>
          )}
          <button
            onClick={() => onAction(msgId, "", "quit")}
            className="text-zinc-500 hover:text-zinc-350 text-xs transition-colors cursor-pointer outline-none"
            title="Wyjdź z gry"
          >
            ✕
          </button>
        </div>
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
              className="flex flex-col gap-3"
            >
              <p className="text-xs text-zinc-400 text-center font-medium leading-normal">
                Twoja kolej. Wybierz kategorię:
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => onAction(msgId, "truth", "vote")}
                  className="flex-1 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-850 hover:border-indigo-500/35 text-zinc-200 font-sans font-extrabold py-2.5 px-3.5 rounded-xl text-xs transition-all duration-200 cursor-pointer text-center outline-none shadow-sm"
                >
                  Prawda
                </button>
                <button
                  onClick={() => onAction(msgId, "dare", "vote")}
                  className="flex-1 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-850 hover:border-indigo-500/35 text-zinc-200 font-sans font-extrabold py-2.5 px-3.5 rounded-xl text-xs transition-all duration-200 cursor-pointer text-center outline-none shadow-sm"
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
              className="flex flex-col items-center justify-center py-4 gap-2.5"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"></div>
                <span className="font-medium text-zinc-450">
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
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className={`font-sans font-bold ${isMyChoice ? "text-zinc-300" : "text-zinc-500"}`}>
                {voterLabel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-900/60 border border-zinc-850/60 text-[9px] font-extrabold uppercase tracking-wider text-indigo-400">
                {icebreaker.question === "Prawda" ? "Prawda" : "Wyzwanie"}
              </span>
            </div>

            {/* Random Prompt Box */}
            <div className="relative overflow-hidden bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 border border-zinc-800/80 rounded-xl p-4 sm:p-5 italic text-zinc-100 text-sm sm:text-base leading-relaxed text-center font-sans shadow-inner shadow-black/40">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />
              "{icebreaker.result}"
            </div>

            {/* Dual Consent Complete Turn Action */}
            {!isVoterReady ? (
              // Voter hasn't clicked "Wykonane" yet
              amIVoter ? (
                <div className="flex flex-col gap-3 mt-1">
                  <p className="text-[10px] text-zinc-500 text-center leading-normal italic font-medium">
                    Odpowiedz na czacie, a następnie prześlij turę dalej:
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => onAction(msgId, "", "complete_turn")}
                      className="flex-1 bg-white hover:bg-zinc-150 text-zinc-950 font-sans font-extrabold py-2.5 px-3.5 rounded-xl text-xs transition-all duration-200 cursor-pointer text-center outline-none border border-transparent shadow-md"
                      title="Przekaż turę"
                    >
                      <span>Wykonane</span>
                    </button>
                    <button
                      onClick={() => onAction(msgId, "", "skip_question")}
                      className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 font-sans font-bold py-2.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all duration-200 text-center outline-none shadow-sm"
                      title="Wylosuj inne"
                    >
                      <span>Losuj inne</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center text-xs text-zinc-500 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"></div>
                  <span className="font-medium text-zinc-450">Oczekiwanie na ruch obcego...</span>
                </div>
              )
            ) : (
              // Voter clicked "Wykonane", waiting for partner to agree to transition
              amIVoter ? (
                <div className="w-full mt-2 bg-zinc-900/60 text-zinc-550 border border-zinc-850/80 font-bold py-3 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2 shadow-inner">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"></div>
                  <span>Oczekiwanie aż obcy przejdzie dalej (1/2)</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-1">
                  <p className="text-[10px] text-zinc-500 text-center leading-normal italic font-medium">
                    Obcy zakończył turę. Przejdź do kolejnego kroku:
                  </p>
                  <button
                    onClick={() => onAction(msgId, "", "complete_turn")}
                    className="w-full bg-white hover:bg-zinc-150 text-zinc-950 font-sans font-extrabold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer text-xs sm:text-sm text-center flex items-center justify-center gap-1.5 outline-none border border-transparent shadow-md"
                  >
                    <span>Następna tura</span>
                  </button>
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
