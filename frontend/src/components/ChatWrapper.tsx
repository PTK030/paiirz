import React, { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { BsEmojiSmile, BsTrash } from "react-icons/bs";
import { VoicePlayer } from "./VoicePlayer";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { IcebreakerCard } from "./IcebreakerCard";

interface ChatWrapperProps {
  chat: {
    id: string;
    sid: string;
    message?: string;
    image?: string;
    video?: string;
    audio?: string;
    vanishing?: boolean;
    viewOnce?: boolean;
    reactions: { [sid: string]: string };
    isUnsent?: boolean;
    icebreaker?: {
      type: "this_or_that" | "truth_or_dare";
      question: string;
      options?: string[];
      votes: { [sid: string]: string | number };
      status: "pending" | "revealed" | "proposed" | "declined";
      result?: string;
      voter_sid?: string;
      round?: number;
      turn_sid?: string;
      accepted_users?: string[];
      ready_for_next?: string[];
    };
  }[];
  socket: Socket | null;
  status: string;
  isStrangerTyping: boolean;
  onSendReaction: (messageId: string, reaction: string | null) => void;
  onVanishMessage?: (messageId: string) => void;
  onConsumeViewOnce?: (messageId: string) => void;
  onScreenshotDetected?: (viewOnce: boolean) => void;
  onUnsendMessage?: (messageId: string) => void;
  onRemoveMessageForMe?: (messageId: string) => void;
  onIcebreakerAction?: (
    messageId: string, 
    action: string | number, 
    actionType?: "vote" | "complete_turn" | "skip_question" | "next_round" | "accept" | "decline" | "quit"
  ) => void;
}

const popularEmojis = [
  "👍", "❤️", "😂", "😮", "😢", "🙏", 
  "🔥", "👏", "🎉", "🚀", "👀", "💯", 
  "🤔", "💡", "👑", "🥳", "💔", "💩", 
  "🌟", "🎈", "😎", "🤩", "😜", "🙄"
];

interface VanishingBubbleProps {
  msgId: string;
  onVanish: (id: string) => void;
  children: React.ReactNode;
}

const VanishingBubble: React.FC<VanishingBubbleProps> = ({ msgId, onVanish, children }) => {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onVanish(msgId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [msgId, onVanish]);

  return (
    <div className="relative flex items-center gap-2 max-w-full">
      {children}
      <span className="text-[10px] text-purple-400 font-mono select-none animate-pulse shrink-0 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/20">
        {timeLeft}s
      </span>
    </div>
  );
};

const ChatWrapper: React.FC<ChatWrapperProps> = ({
  chat,
  socket,
  status,
  isStrangerTyping,
  onSendReaction,
  onVanishMessage,
  onConsumeViewOnce,
  onScreenshotDetected,
  onUnsendMessage,
  onRemoveMessageForMe,
  onIcebreakerAction,
}) => {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);
  const [activeViewOnceId, setActiveViewOnceId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat, isStrangerTyping]);

  // Click outside listener to close the picker (standard popover UX)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".message-container") && !target.closest(".reaction-picker")) {
        setActiveMessageId(null);
        setExpandedMessageId(null);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
    setLightboxVideo(null);
    if (activeViewOnceId) {
      onConsumeViewOnce?.(activeViewOnceId);
      setActiveViewOnceId(null);
    }
  }, [activeViewOnceId, onConsumeViewOnce]);

  // Active screenshot and focus-loss (blur) protection for view-once images/videos
  useEffect(() => {
    if (!activeViewOnceId || (!lightboxImage && !lightboxVideo)) return;

    const handleBlur = () => {
      onScreenshotDetected?.(true);
      closeLightbox();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen";
      const isWinShiftS = e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s");
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5");

      if (isPrintScreen || isWinShiftS || isMacScreenshot) {
        onScreenshotDetected?.(true);
        closeLightbox();
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeViewOnceId, lightboxImage, lightboxVideo, onScreenshotDetected]);

  return (
    <div className="flex flex-col h-full max-h-full overflow-y-auto relative scroll-container">
      <div className="sticky top-0 bg-black/40 backdrop-blur-md border-b border-zinc-850 py-2.5 text-center text-[10px] font-sans font-extrabold uppercase tracking-widest text-zinc-450 z-30 select-none">
        {status}
      </div>

      <div className="flex flex-col p-4 space-y-4 flex-grow">
        <AnimatePresence initial={false}>
          {socket &&
            chat.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${
                  msg.sid === "system"
                    ? "items-center w-full"
                    : msg.sid === socket.id
                      ? "items-end"
                      : "items-start"
                }`}
              >
                {msg.sid === "system" ? (
                  msg.icebreaker ? (
                    <IcebreakerCard
                      msgId={msg.id}
                      icebreaker={msg.icebreaker}
                      mySid={socket.id || ""}
                      onAction={(messageId, action, actionType) => onIcebreakerAction?.(messageId, action, actionType)}
                    />
                  ) : (
                    <div className={`rounded-xl px-4 py-2.5 text-xs font-sans font-semibold my-1.5 select-none max-w-[85%] text-center shadow-sm border ${
                      msg.message?.includes("zrzut") || msg.message?.includes("zrzutu")
                        ? "bg-amber-950/20 border-amber-900/30 text-amber-300"
                        : msg.message?.includes("znikających")
                        ? "bg-purple-950/20 border-purple-900/30 text-purple-300"
                        : msg.message?.includes("antyspam") || msg.message?.includes("Ograniczenie")
                        ? "bg-red-950/20 border-red-900/30 text-red-300"
                        : "bg-zinc-900/40 border-zinc-850/60 text-zinc-400"
                    }`}>
                      {msg.message}
                    </div>
                  )
                ) : (
                  <>
                    <div className="text-zinc-500 text-[9px] font-sans font-bold uppercase tracking-wider mb-1 px-1 select-none">
                      {msg.sid === socket.id ? "Ty" : "Obcy"}
                    </div>
                    
                    {/* Wrapping container holds trigger and message bubble */}
                    <div
                      className={`relative flex items-center gap-2 max-w-[85%] message-container ${
                        msg.sid === socket.id ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Floating Emoji Picker */}
                      <AnimatePresence>
                        {activeMessageId === msg.id && (
                          expandedMessageId === msg.id ? (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.12 }}
                              className={`absolute z-20 bottom-full mb-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 shadow-xl w-48 grid grid-cols-6 gap-2 reaction-picker after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-2 after:content-[''] ${
                                msg.sid === socket.id ? "right-0" : "left-0"
                              }`}
                            >
                              {popularEmojis.map((emoji) => {
                                const mySid = socket.id || "";
                                const hasReacted = msg.reactions[mySid] === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSendReaction(msg.id, hasReacted ? null : emoji);
                                      setExpandedMessageId(null);
                                      setActiveMessageId(null);
                                    }}
                                    className={`hover:scale-135 active:scale-95 transition-transform text-sm cursor-pointer p-0.5 text-center ${
                                      hasReacted ? "filter drop-shadow-[0_0_4px_rgba(255,255,255,0.7)] scale-110" : ""
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.12 }}
                              className={`absolute z-20 bottom-full mb-2 flex gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1 shadow-xl reaction-picker after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-2 after:content-[''] ${
                                msg.sid === socket.id ? "right-0" : "left-0"
                              }`}
                            >
                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => {
                                const mySid = socket.id || "";
                                const hasReacted = msg.reactions[mySid] === emoji;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSendReaction(msg.id, hasReacted ? null : emoji);
                                      setActiveMessageId(null);
                                    }}
                                    className={`hover:scale-130 active:scale-95 transition-transform text-sm px-0.5 cursor-pointer ${
                                      hasReacted ? "filter drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]" : ""
                                    }`}
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedMessageId(msg.id);
                                }}
                                className="hover:scale-130 active:scale-95 transition-transform text-sm px-1 cursor-pointer text-zinc-400 font-bold"
                                title="Więcej"
                              >
                                +
                              </button>
                            </motion.div>
                          )
                        )}
                      </AnimatePresence>

                      {/* Message Bubble rendering */}
                      {msg.isUnsent ? (
                        <div
                          className={`rounded-2xl shadow-sm border border-zinc-800/65 bg-transparent text-zinc-550 italic px-4 py-2.5 text-xs sm:text-sm select-none break-words ${
                            msg.sid === socket.id
                              ? "rounded-tr-none"
                              : "rounded-tl-none"
                          }`}
                        >
                          {msg.sid === socket.id ? "Cofnąłeś wysłanie wiadomości" : "Obcy cofnął wysłanie wiadomości"}
                        </div>
                      ) : msg.vanishing ? (
                        <VanishingBubble msgId={msg.id} onVanish={onVanishMessage || (() => {})}>
                          <div
                            onClick={() => {
                              if ((msg.image || msg.video) && msg.viewOnce && msg.sid !== socket.id) {
                                setLightboxImage(msg.image || null);
                                setLightboxVideo(msg.video || null);
                                setActiveViewOnceId(msg.id);
                              } else {
                                setActiveMessageId(activeMessageId === msg.id ? null : msg.id);
                              }
                            }}
                            className={`rounded-2xl shadow-md cursor-pointer overflow-hidden max-w-full select-none text-xs sm:text-sm break-words ${
                              msg.sid === socket.id
                                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-tr-none border border-purple-500/35 font-sans"
                                : "bg-purple-950/20 text-zinc-200 border border-purple-900/40 rounded-tl-none font-sans"
                            } ${(msg.image || msg.video) && !(msg.viewOnce && msg.sid !== socket.id) ? "p-1.5" : msg.audio ? "p-1" : "px-4 py-2.5"}`}
                          >
                            {msg.audio ? (
                              <VoicePlayer audioUrl={msg.audio} isMyMessage={msg.sid === socket.id} />
                            ) : (
                              <>
                                {msg.image && (
                                  (msg.viewOnce && msg.sid !== socket.id) ? (
                                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-400 bg-zinc-950/60 border border-zinc-800 rounded-xl font-sans tracking-wider uppercase select-none">
                                      <span>Wyświetl raz</span>
                                    </div>
                                  ) : (
                                    <div className="relative overflow-hidden rounded-xl bg-black/10 max-w-full">
                                      <img
                                        src={msg.image}
                                        alt="Wysłane zdjęcie"
                                        className="max-w-full max-h-72 object-contain hover:scale-[1.02] transition-transform duration-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLightboxImage(msg.image || null);
                                        }}
                                      />
                                    </div>
                                  )
                                )}
                                {msg.video && (
                                  (msg.viewOnce && msg.sid !== socket.id) ? (
                                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-400 bg-zinc-950/60 border border-zinc-800 rounded-xl font-sans tracking-wider uppercase select-none">
                                      <span>Wyświetl raz (Wideo)</span>
                                    </div>
                                  ) : (
                                    <div className="relative overflow-hidden rounded-xl bg-black/10 max-w-full">
                                      <CustomVideoPlayer
                                        src={msg.video}
                                        mode="inline"
                                        onPlayClick={() => {
                                          setLightboxVideo(msg.video || null);
                                        }}
                                      />
                                    </div>
                                  )
                                )}
                                {msg.message && (
                                  <div className={(msg.image || msg.video) && !(msg.viewOnce && msg.sid !== socket.id) ? "px-3 py-2 text-left" : ""}>
                                    {msg.message}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </VanishingBubble>
                      ) : (
                        <div
                          onClick={() => {
                            if ((msg.image || msg.video) && msg.viewOnce && msg.sid !== socket.id) {
                              setLightboxImage(msg.image || null);
                              setLightboxVideo(msg.video || null);
                              setActiveViewOnceId(msg.id);
                            } else {
                              setActiveMessageId(activeMessageId === msg.id ? null : msg.id);
                            }
                          }}
                          className={`rounded-2xl shadow-md cursor-pointer overflow-hidden max-w-full select-none text-xs sm:text-sm break-words ${
                            msg.sid === socket.id
                              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none border border-indigo-500/20 font-sans"
                              : "bg-zinc-900/60 text-zinc-155 border border-zinc-850/80 rounded-tl-none font-sans"
                          } ${(msg.image || msg.video) && !(msg.viewOnce && msg.sid !== socket.id) ? "p-1.5" : msg.audio ? "p-1" : "px-4 py-2.5"}`}
                        >
                          {msg.audio ? (
                            <VoicePlayer audioUrl={msg.audio} isMyMessage={msg.sid === socket.id} />
                          ) : (
                            <>
                              {msg.image && (
                                (msg.viewOnce && msg.sid !== socket.id) ? (
                                  <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-400 bg-zinc-950/60 border border-zinc-800 rounded-xl font-sans tracking-wider uppercase select-none">
                                    <span>Wyświetl raz</span>
                                  </div>
                                ) : (
                                  <div className="relative overflow-hidden rounded-xl bg-black/10 max-w-full">
                                    <img
                                      src={msg.image}
                                      alt="Wysłane zdjęcie"
                                      className="max-w-full max-h-72 object-contain hover:scale-[1.02] transition-transform duration-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImage(msg.image || null);
                                      }}
                                    />
                                  </div>
                                )
                              )}
                              {msg.video && (
                                (msg.viewOnce && msg.sid !== socket.id) ? (
                                  <div className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-400 bg-zinc-950/60 border border-zinc-800 rounded-xl font-sans tracking-wider uppercase select-none">
                                    <span>Wyświetl raz (Wideo)</span>
                                  </div>
                                ) : (
                                  <div className="relative overflow-hidden rounded-xl bg-black/10 max-w-full">
                                    <CustomVideoPlayer
                                      src={msg.video}
                                      mode="inline"
                                      onPlayClick={() => {
                                        setLightboxVideo(msg.video || null);
                                      }}
                                    />
                                  </div>
                                )
                              )}
                              {msg.message && (
                                <div className={(msg.image || msg.video) && !(msg.viewOnce && msg.sid !== socket.id) ? "px-3 py-2 text-left" : ""}>
                                  {msg.message}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Action buttons (Reactions & Trash) */}
                      {!msg.isUnsent && (
                        <div className={`flex items-center gap-1 shrink-0 ${
                          msg.sid === socket.id ? "flex-row-reverse" : "flex-row"
                        }`}>
                          {Object.keys(msg.reactions).length === 0 && (
                            <button
                              onClick={() => setActiveMessageId(activeMessageId === msg.id ? null : msg.id)}
                              className={`transition-all duration-200 text-zinc-400 hover:text-zinc-200 hover:scale-110 hover:opacity-100 text-base p-1 cursor-pointer select-none ${
                                activeMessageId === msg.id ? "opacity-100" : "opacity-40"
                              }`}
                              title="Dodaj reakcję"
                            >
                              <BsEmojiSmile />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirmId(msg.id)}
                            className="transition-all duration-200 text-zinc-400 hover:text-red-400 hover:scale-110 opacity-40 hover:opacity-100 text-base p-1 cursor-pointer select-none"
                            title="Usuń wiadomość"
                          >
                            <BsTrash />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reaction Badges */}
                    {Object.keys(msg.reactions).length > 0 && (
                      <div
                        className={`flex gap-1 mt-1 flex-wrap ${
                          msg.sid === socket.id ? "justify-end animate-fade-in" : "justify-start animate-fade-in"
                        }`}
                      >
                        {Object.entries(msg.reactions).map(([reactionSid, emoji]) => (
                          <motion.span
                            key={reactionSid}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 select-none ${
                              reactionSid === socket.id
                                ? "bg-zinc-800 border-zinc-700 text-zinc-100 font-sans font-semibold"
                                : "bg-white/5 border-white/10 text-zinc-200 font-sans font-semibold"
                            }`}
                            title={reactionSid === socket.id ? "Ty" : "Obcy"}
                          >
                            {emoji}
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Messenger-style Typing Indicator */}
        <AnimatePresence>
          {isStrangerTyping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 justify-start mt-2"
            >
              <p className="text-zinc-500 text-[9px] font-sans font-bold uppercase tracking-wider select-none">Obcy</p>
              <div className="bg-white/5 border border-white/10 backdrop-blur-sm px-4 py-3 rounded-2xl flex gap-1.5 items-center max-w-xs shadow-md rounded-tl-none">
                <span
                  className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messageEndRef} />
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {(lightboxImage || lightboxVideo) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative max-w-full max-h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxImage ? (
                <>
                  <img
                    src={lightboxImage}
                    alt="Powiększone zdjęcie"
                    className="max-w-[95vw] max-h-[80vh] object-contain rounded-lg shadow-2xl border border-zinc-700/50 select-none"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <button
                    onClick={closeLightbox}
                    className="mt-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-sans text-xs px-5 py-2.5 rounded-lg border border-zinc-800 transition-colors uppercase tracking-wider cursor-pointer select-none outline-none"
                  >
                    Zamknij
                  </button>
                </>
              ) : (
                <>
                  <CustomVideoPlayer
                    src={lightboxVideo!}
                    mode="lightbox"
                    onEnded={() => {
                      if (activeViewOnceId) {
                        closeLightbox();
                      }
                    }}
                  />
                  <button
                    onClick={closeLightbox}
                    className="mt-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-sans text-xs px-5 py-2.5 rounded-lg border border-zinc-800 transition-colors uppercase tracking-wider cursor-pointer select-none outline-none"
                  >
                    Zamknij
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (() => {
          const targetMsg = chat.find((m) => m.id === deleteConfirmId);
          if (!targetMsg) return null;
          const isOwnMessage = targetMsg.sid === socket?.id;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setDeleteConfirmId(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full flex flex-col gap-4 text-zinc-200 font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center select-none font-sans">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">Usuń wiadomość?</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Wybierz sposób usunięcia wiadomości.</p>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {isOwnMessage && onUnsendMessage && (
                    <button
                      onClick={() => {
                        onUnsendMessage(deleteConfirmId);
                        setDeleteConfirmId(null);
                      }}
                      className="w-full bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 font-semibold py-2.5 rounded-lg transition-colors cursor-pointer text-xs uppercase tracking-wider outline-none"
                    >
                      Cofnij wysłanie (u wszystkich)
                    </button>
                  )}
                  {onRemoveMessageForMe && (
                    <button
                      onClick={() => {
                        onRemoveMessageForMe(deleteConfirmId);
                        setDeleteConfirmId(null);
                      }}
                      className="w-full bg-zinc-950 hover:bg-zinc-800 text-zinc-300 font-semibold py-2.5 rounded-lg border border-zinc-800 transition-colors cursor-pointer text-xs uppercase tracking-wider outline-none"
                    >
                      Usuń dla mnie (tylko u mnie)
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="w-full bg-transparent hover:bg-zinc-950/40 text-zinc-500 hover:text-zinc-300 py-2 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer outline-none"
                  >
                    Anuluj
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default ChatWrapper;
