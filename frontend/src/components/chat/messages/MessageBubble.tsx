import { motion, AnimatePresence } from "framer-motion";
import { memo } from "react";
import { BsEmojiSmile, BsTrash } from "react-icons/bs";

import type { Message } from "../../../types/message";
import { IcebreakerCard } from "../features/IcebreakerCard";

import { MessageBubbleContent } from "./MessageBubbleContent";
import { VanishingBubble } from "./VanishingBubble";

const POPULAR_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
  "🔥",
  "👏",
  "🎉",
  "🚀",
  "👀",
  "💯",
  "🤔",
  "💡",
  "👑",
  "🥳",
  "💔",
  "💩",
  "🌟",
  "🎈",
  "😎",
  "🤩",
  "😜",
  "🙄",
];

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export interface MessageBubbleProps {
  msg: Message;
  mySid: string;
  /** True while this message's reaction picker is open. */
  isActive: boolean;
  /** True while this message's picker is expanded to the full emoji grid. */
  isExpanded: boolean;
  onToggleActive: (msgId: string) => void;
  onExpand: (msgId: string) => void;
  /** Closes both the reaction picker and the expanded emoji grid. */
  onClose: () => void;
  onSendReaction: (messageId: string, reaction: string | null) => void;
  onOpenLightbox: (image: string | null, video: string | null, viewOnceId?: string) => void;
  onVanish: (msgId: string) => void;
  onRequestDelete: (msgId: string) => void;
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
}

/**
 * @description Renders a single chat message: system/icebreaker banners,
 * text/image/video/audio bubbles (optionally wrapped in a vanishing
 * countdown), the floating emoji-reaction picker, and reaction badges.
 * Wrapped in `React.memo` since it's rendered once per message in a
 * potentially long list - only the message whose picker state actually
 * changes needs to re-render.
 */
function MessageBubbleImpl({
  msg,
  mySid,
  isActive,
  isExpanded,
  onToggleActive,
  onExpand,
  onClose,
  onSendReaction,
  onOpenLightbox,
  onVanish,
  onRequestDelete,
  onIcebreakerAction,
}: MessageBubbleProps) {
  const isMe = msg.sid === mySid;

  if (msg.sid === "system") {
    return msg.icebreaker ? (
      <IcebreakerCard
        msgId={msg.id}
        icebreaker={msg.icebreaker}
        mySid={mySid}
        onAction={(messageId, action, actionType) =>
          onIcebreakerAction?.(messageId, action, actionType)
        }
      />
    ) : (
      <div className="mx-auto my-2 px-5 py-2.5 bg-zinc-900/60 border border-zinc-800/60 rounded-xl backdrop-blur-md text-xs text-zinc-400 max-w-sm text-center shadow-lg">
        {msg.message}
      </div>
    );
  }

  const isViewOnceHidden = Boolean((msg.image || msg.video) && msg.viewOnce && !isMe);

  const handleBubbleClick = () => {
    if (isViewOnceHidden) {
      onOpenLightbox(msg.image || null, msg.video || null, msg.id);
    } else {
      onToggleActive(msg.id);
    }
  };

  const bubbleClassName = `relative overflow-hidden cursor-pointer transition-all duration-300 max-w-[85vw] sm:max-w-[70vw] md:max-w-md ${
    isMe
      ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-50 rounded-[1.5rem] rounded-tr-sm"
      : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-200 rounded-[1.5rem] rounded-tl-sm shadow-xl"
  } hover:scale-[1.01]`;

  const content = msg.isUnsent ? (
    <div className="px-5 py-3.5 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl text-zinc-500 text-sm sm:text-base italic">
      {isMe ? "Cofnąłeś wysłanie wiadomości" : "Obcy cofnął wysłanie wiadomości"}
    </div>
  ) : (
    <div
      onClick={handleBubbleClick}
      className={
        msg.vanishing
          ? `${bubbleClassName} shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/30`
          : bubbleClassName
      }
    >
      <MessageBubbleContent
        msg={msg}
        isMe={isMe}
        isViewOnceHidden={isViewOnceHidden}
        onImageClick={() => onOpenLightbox(msg.image || null, null)}
        onVideoClick={() => onOpenLightbox(null, msg.video || null)}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col w-full mb-6 ${isMe ? "items-end" : "items-start"}`}
    >
      <div
        className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isMe ? "text-indigo-400 mr-1" : "text-zinc-400 ml-1"}`}
      >
        {isMe ? "Ty" : "Obcy"}
      </div>

      <div
        className={`message-container relative flex items-center gap-2 group ${isMe ? "flex-row-reverse" : "flex-row"}`}
      >
        <AnimatePresence>
          {isActive &&
            (isExpanded ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.12 }}
                className={`reaction-picker absolute bottom-full mb-2 flex flex-wrap gap-1 p-2 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl backdrop-blur-xl shadow-2xl z-30 w-[240px] ${isMe ? "right-0" : "left-0"}`}
              >
                {POPULAR_EMOJIS.map((emoji) => {
                  const hasReacted = msg.reactions[mySid] === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendReaction(msg.id, hasReacted ? null : emoji);
                        onClose();
                      }}
                      className={`p-1.5 text-lg hover:scale-125 transition-transform duration-200 outline-none cursor-pointer ${hasReacted ? "bg-indigo-500/20 rounded-lg" : ""}`}
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
                className={`reaction-picker absolute bottom-full mb-2 flex items-center gap-1 p-1.5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl backdrop-blur-xl shadow-2xl z-30 ${isMe ? "right-0" : "left-0"}`}
              >
                {QUICK_EMOJIS.map((emoji) => {
                  const hasReacted = msg.reactions[mySid] === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendReaction(msg.id, hasReacted ? null : emoji);
                        onClose();
                      }}
                      className={`p-1.5 text-lg hover:scale-125 transition-transform duration-200 outline-none cursor-pointer ${hasReacted ? "bg-indigo-500/20 rounded-lg" : ""}`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  );
                })}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpand(msg.id);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 transition-colors outline-none ml-1 cursor-pointer"
                  title="Więcej"
                >
                  +
                </button>
              </motion.div>
            ))}
        </AnimatePresence>

        {msg.vanishing && !msg.isUnsent ? (
          <VanishingBubble isMe={isMe} msgId={msg.id} onVanish={onVanish}>
            {content}
          </VanishingBubble>
        ) : (
          content
        )}

        {!msg.isUnsent && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isMe ? "right-full mr-2" : "left-full ml-2"}`}
          >
            {Object.keys(msg.reactions).length === 0 && (
              <button
                onClick={() => onToggleActive(msg.id)}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-full backdrop-blur-sm transition-all duration-200 outline-none hover:scale-110 shadow-lg cursor-pointer"
                title="Dodaj reakcję"
              >
                <BsEmojiSmile />
              </button>
            )}
            <button
              onClick={() => onRequestDelete(msg.id)}
              className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-full backdrop-blur-sm transition-all duration-200 outline-none hover:scale-110 shadow-lg cursor-pointer"
              title="Usuń wiadomość"
            >
              <BsTrash />
            </button>
          </div>
        )}
      </div>

      {Object.keys(msg.reactions).length > 0 && (
        <div
          className={`flex flex-wrap gap-1 mt-1 z-10 relative ${isMe ? "justify-end mr-2" : "justify-start ml-2"}`}
        >
          {Object.entries(msg.reactions).map(([reactionSid, emoji]) => (
            <motion.span
              key={reactionSid}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-zinc-900/90 border border-zinc-800/80 text-sm rounded-full shadow-md backdrop-blur-sm select-none"
              title={reactionSid === mySid ? "Ty" : "Obcy"}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
