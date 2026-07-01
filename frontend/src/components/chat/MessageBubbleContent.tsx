import { memo } from "react";

import type { Message } from "../../types/message";

import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { VoicePlayer } from "./VoicePlayer";

export interface MessageBubbleContentProps {
  msg: Message;
  isMe: boolean;
  /** True once the "view once" media has already been consumed and hidden. */
  isViewOnceHidden: boolean;
  onImageClick: () => void;
  onVideoClick: () => void;
}

/**
 * @description Renders a message's inner content (voice player, image, video,
 * or text) - shared by both the normal and "vanishing" bubble wrappers so the
 * two never drift out of sync. Purely presentational; media clicks are
 * delegated to the caller (which owns the lightbox state).
 */
function MessageBubbleContentImpl({
  msg,
  isMe,
  isViewOnceHidden,
  onImageClick,
  onVideoClick,
}: MessageBubbleContentProps) {
  if (msg.audio) {
    return <VoicePlayer audioUrl={msg.audio} isMyMessage={isMe} />;
  }

  return (
    <div className="flex flex-col gap-1 p-1">
      {msg.image &&
        (isViewOnceHidden ? (
          <ViewOnceLockedPlaceholder label="Wyświetl raz" />
        ) : (
          <div className="relative w-full max-w-[240px] sm:max-w-xs overflow-hidden rounded-[1.2rem]">
            <img
              src={msg.image}
              alt="Wysłane zdjęcie"
              className="w-full h-auto object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onImageClick();
              }}
            />
          </div>
        ))}
      {msg.video &&
        (isViewOnceHidden ? (
          <ViewOnceLockedPlaceholder label="Wyświetl raz (Wideo)" />
        ) : (
          <div className="relative w-full max-w-[240px] sm:max-w-xs overflow-hidden rounded-[1.2rem]">
            <CustomVideoPlayer src={msg.video} mode="inline" onPlayClick={onVideoClick} />
          </div>
        ))}
      {msg.message && (
        <div
          className={`px-4 py-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words ${isMe ? "text-indigo-50" : "text-zinc-200"}`}
        >
          {msg.message}
        </div>
      )}
    </div>
  );
}

function ViewOnceLockedPlaceholder({ label }: { label: string }) {
  return (
    <div className="px-6 py-8 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 rounded-2xl border border-zinc-800/50">
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</span>
    </div>
  );
}

export const MessageBubbleContent = memo(MessageBubbleContentImpl);
