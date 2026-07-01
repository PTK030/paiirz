import { motion, AnimatePresence } from "framer-motion";
import type React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";

import type { Message } from "../../types/message";

import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { MessageBubble } from "./MessageBubble";

interface ChatWrapperProps {
  /** Full conversation history for the current room, in send order. */
  chat: Message[];
  socket: Socket | null;
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
    actionType?:
      | "vote"
      | "complete_turn"
      | "skip_question"
      | "next_round"
      | "accept"
      | "decline"
      | "quit"
      | "reject_turn"
  ) => void;
  hasExtraBottomPanel?: boolean;
}

/**
 * @description Renders the scrollable message list: text/image/video/audio
 * bubbles, reactions, icebreaker cards, vanishing-message countdowns, and the
 * "stranger is typing" indicator. Purely presentational - all mutations
 * (reactions, unsend, icebreaker actions) are delegated to the callback props
 * and owned by the caller (`Chat.tsx` via `useChatMessages`).
 */
const ChatWrapper: React.FC<ChatWrapperProps> = ({
  chat,
  socket,
  isStrangerTyping,
  onSendReaction,
  onVanishMessage,
  onConsumeViewOnce,
  onScreenshotDetected,
  onUnsendMessage,
  onRemoveMessageForMe,
  onIcebreakerAction,
  hasExtraBottomPanel,
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
      const isMacScreenshot =
        e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5");

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
  }, [activeViewOnceId, lightboxImage, lightboxVideo, onScreenshotDetected, closeLightbox]);

  const openLightbox = useCallback(
    (image: string | null, video: string | null, viewOnceId?: string) => {
      setLightboxImage(image);
      setLightboxVideo(video);
      if (viewOnceId) setActiveViewOnceId(viewOnceId);
    },
    []
  );

  const toggleActiveMessage = useCallback((msgId: string) => {
    setActiveMessageId((prev) => (prev === msgId ? null : msgId));
  }, []);

  const expandMessage = useCallback((msgId: string) => {
    setExpandedMessageId(msgId);
  }, []);

  const closePickers = useCallback(() => {
    setActiveMessageId(null);
    setExpandedMessageId(null);
  }, []);

  const noopVanish = useCallback(() => {}, []);

  return (
    <div
      className={`flex-grow min-h-0 flex flex-col w-full h-full relative z-10 pt-[72px] overflow-y-auto overflow-x-hidden scroll-smooth overscroll-contain ${hasExtraBottomPanel ? "pb-[260px]" : "pb-24"}`}
    >
      <div className="flex-grow flex flex-col justify-end w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pb-4">
        <AnimatePresence initial={false}>
          {socket &&
            chat.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                mySid={socket.id || ""}
                isActive={activeMessageId === msg.id}
                isExpanded={expandedMessageId === msg.id}
                onToggleActive={toggleActiveMessage}
                onExpand={expandMessage}
                onClose={closePickers}
                onSendReaction={onSendReaction}
                onOpenLightbox={openLightbox}
                onVanish={onVanishMessage || noopVanish}
                onRequestDelete={setDeleteConfirmId}
                onIcebreakerAction={onIcebreakerAction}
              />
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
              className="flex flex-col items-start w-full mb-6"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 text-zinc-400 ml-1">
                Obcy
              </p>
              <div className="flex items-center gap-1.5 px-4 py-3.5 bg-zinc-900/80 border border-zinc-800/80 rounded-[1.5rem] rounded-tl-sm shadow-xl w-fit">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxImage ? (
                <>
                  <img
                    src={lightboxImage}
                    alt="Powiększone zdjęcie"
                    className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-zinc-800/50 select-none pointer-events-auto"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <button
                    onClick={closeLightbox}
                    className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
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
                    className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
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
        {deleteConfirmId &&
          (() => {
            const targetMsg = chat.find((m) => m.id === deleteConfirmId);
            if (!targetMsg) return null;
            const isOwnMessage = targetMsg.sid === socket?.id;

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4"
                onClick={() => setDeleteConfirmId(null)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="w-full max-w-sm bg-zinc-950/90 border border-zinc-800/80 rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Usuń wiadomość?</h3>
                    <p className="text-sm text-zinc-400">Wybierz sposób usunięcia wiadomości.</p>
                  </div>
                  <div className="w-full flex flex-col gap-0 border-t border-zinc-800/50">
                    {isOwnMessage && onUnsendMessage && (
                      <button
                        onClick={() => {
                          onUnsendMessage(deleteConfirmId);
                          setDeleteConfirmId(null);
                        }}
                        className="w-full py-4 text-sm font-semibold text-red-400 hover:bg-zinc-900/80 transition-colors border-b border-zinc-800/50"
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
                        className="w-full py-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-900/80 transition-colors border-b border-zinc-800/50"
                      >
                        Usuń dla mnie (tylko u mnie)
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="w-full py-4 text-sm font-semibold text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 transition-colors"
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
