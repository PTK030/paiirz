import { motion, AnimatePresence } from "framer-motion";
import { BsMic, BsTrash, BsImage, BsFilm } from "react-icons/bs";

import type { UseMediaUploadReturn } from "../../../hooks/media/useMediaUpload";
import type { UseRecordingReturn } from "../../../hooks/media/useRecording";
import type { UseChatUIReturn } from "../../../hooks/ui/useChatUI";
import { GamesMenu } from "../features/GamesMenu";
import NewRoom from "../layout/NewRoom";

import ChatInput from "./ChatInput";
import SendButton from "./SendButton";

export interface MessageInputBarProps {
  room: string | null;
  isStrangerInRoom: boolean;
  onJoinRoom: () => void;
  onLeaveRoom: () => void;
  chatUI: UseChatUIReturn;
  media: UseMediaUploadReturn;
  message: string;
  setMessage: (v: string) => void;
  sendMessage: () => void;
  blockedTimeLeft: number;
  recording: Pick<
    UseRecordingReturn,
    "recordingMode" | "recordingTime" | "recordingWave" | "stopRecording"
  >;
  onMicMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  onMicMouseUp: (e: React.MouseEvent | React.TouchEvent) => void;
  onMicMouseLeave: (e: React.MouseEvent) => void;
  onTriggerIcebreaker: (type: "this_or_that" | "truth_or_dare", customData?: unknown) => void;
}

/**
 * @description The bottom composer bar: skip/leave-room buttons, the "more
 * actions" menu (mini-games, image, video), the message input (or the
 * in-progress voice recording UI), the hold-to-record mic button, and send.
 * Purely presentational - recording lifecycle lives in `useRecording`, media
 * selection in `useMediaUpload`, menu open state in `useChatUI`.
 */
export function MessageInputBar({
  room,
  isStrangerInRoom,
  onJoinRoom,
  onLeaveRoom,
  chatUI,
  media,
  message,
  setMessage,
  sendMessage,
  blockedTimeLeft,
  recording,
  onMicMouseDown,
  onMicMouseUp,
  onMicMouseLeave,
  onTriggerIcebreaker,
}: MessageInputBarProps) {
  const { recordingMode, recordingTime, recordingWave, stopRecording } = recording;
  const disabled = !isStrangerInRoom || !room || blockedTimeLeft > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex gap-1.5 sm:gap-2 items-end z-30 max-w-5xl mx-auto pointer-events-none">
      <div className="flex gap-1.5 sm:gap-2 shrink-0 pointer-events-auto">
        <NewRoom joinRoom={onJoinRoom} leaveRoom={onLeaveRoom} />

        <div className="relative actions-menu-container">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              chatUI.setActionsMenuOpen((prev) => !prev);
            }}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all outline-none shadow-lg flex-shrink-0 ${
              disabled
                ? "bg-zinc-900/50 border border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-50"
                : chatUI.actionsMenuOpen
                  ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                  : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:scale-105 cursor-pointer"
            }`}
            title="Więcej akcji"
            disabled={disabled}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <AnimatePresence>
            {chatUI.actionsMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute bottom-full left-0 mb-3 w-48 bg-zinc-950/95 border border-zinc-800/80 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chatUI.setActionsMenuOpen(false);
                    chatUI.setGamesMenuOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-indigo-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
                  </svg>
                  Mini-gry
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chatUI.setActionsMenuOpen(false);
                    media.imageInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                >
                  <BsImage size={14} className="text-indigo-300" />
                  Zdjęcie
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chatUI.setActionsMenuOpen(false);
                    media.videoInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                >
                  <BsFilm size={14} className="text-indigo-300" />
                  Wideo
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {chatUI.gamesMenuOpen && (
              <GamesMenu
                onTrigger={onTriggerIcebreaker}
                onClose={() => chatUI.setGamesMenuOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>

        <input
          ref={media.imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={media.handleImagePicked}
        />
        <input
          ref={media.videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={media.handleVideoPicked}
        />
      </div>

      <div className="flex items-end gap-1.5 sm:gap-2 flex-grow min-w-0 pointer-events-auto">
        {recordingMode !== "none" ? (
          <div className="flex-grow w-full flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 rounded-xl sm:rounded-[1.5rem] px-3.5 sm:px-6 py-2.5 sm:py-4 shadow-inner backdrop-blur-md">
            <div className="flex items-center gap-3 w-full overflow-hidden">
              <span
                className="rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] shrink-0"
                style={{
                  width: `${Math.max(10, 10 + ((recordingWave[recordingWave.length - 1] ?? 0) / 100) * 6)}px`,
                  height: `${Math.max(10, 10 + ((recordingWave[recordingWave.length - 1] ?? 0) / 100) * 6)}px`,
                  transition: "width 0.1s ease, height 0.1s ease",
                }}
              />
              <span className="font-mono text-xs sm:text-base font-bold text-red-400 w-10 sm:w-12 shrink-0">
                {Math.floor(recordingTime / 60)}:{recordingTime % 60 < 10 ? "0" : ""}
                {recordingTime % 60}
              </span>
              <div className="flex items-center gap-[2px] h-4 sm:h-6 flex-grow overflow-hidden shrink min-w-0 opacity-70">
                {recordingWave.map((vol, idx) => (
                  // Index-as-key is intentional: this is a fixed-size rolling
                  // window where position IS the bar's identity (ticks ago).
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className="w-1 bg-red-400/80 rounded-full"
                    style={{
                      height: `${Math.max(4, (vol / 100) * 24)}px`,
                      transition: "height 0.1s ease",
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] sm:text-sm text-zinc-500 hidden md:block shrink-0 whitespace-nowrap ml-2">
                {recordingMode === "holding"
                  ? "Zwolnij aby wysłać, zjedź myszką aby anulować"
                  : "Kliknij przycisk Wyślij lub Kosz"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="ml-2 sm:ml-4 p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg sm:rounded-xl transition-colors outline-none cursor-pointer shrink-0 -my-2"
              title="Anuluj nagrywanie"
            >
              <BsTrash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        ) : (
          <ChatInput
            room={room}
            setMessage={setMessage}
            message={message}
            sendMessage={sendMessage}
            isStrangerInRoom={isStrangerInRoom && blockedTimeLeft === 0}
          />
        )}

        {recordingMode === "none" && (
          <button
            onMouseDown={onMicMouseDown}
            onMouseUp={onMicMouseUp}
            onMouseLeave={onMicMouseLeave}
            onTouchStart={onMicMouseDown}
            onTouchEnd={onMicMouseUp}
            disabled={disabled}
            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all outline-none shadow-lg flex-shrink-0 ${
              disabled
                ? "bg-zinc-900/50 border border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-50"
                : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:scale-105 cursor-pointer"
            }`}
            title="Nagraj (kliknij lub przytrzymaj)"
          >
            <BsMic size={20} />
          </button>
        )}

        <SendButton
          sendMessage={recordingMode !== "none" ? () => stopRecording(true) : sendMessage}
          isStrangerInRoom={isStrangerInRoom && blockedTimeLeft === 0}
        />
      </div>
    </div>
  );
}
