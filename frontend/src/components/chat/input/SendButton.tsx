import type React from "react";
import { IoSend } from "react-icons/io5";

interface SendButtonProps {
  sendMessage: () => void;
  isStrangerInRoom: boolean;
}

/**
 * @description Send button for the chat composer. Only gates on
 * `isStrangerInRoom` (unlike `ChatInput`, which also disables on
 * `room === null`) because the message bar that hosts this button is itself
 * only mounted once a room exists (see `Chat.tsx`); the `isStrangerInRoom`
 * check still matters here because the stranger can disconnect (flipping it
 * to false) in the moment before that parent re-renders and unmounts this
 * subtree.
 */
const SendButton: React.FC<SendButtonProps> = ({ sendMessage, isStrangerInRoom }) => {
  return (
    <button
      className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all duration-300 outline-none shadow-lg cursor-pointer flex-shrink-0 ${isStrangerInRoom ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-105" : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-600 cursor-not-allowed opacity-50"}`}
      onClick={sendMessage}
      disabled={!isStrangerInRoom}
      title="Wyślij wiadomość"
    >
      {/* Nudge the icon 2px right only when active - the send-glyph's own
          whitespace otherwise reads as slightly off-center in the button. */}
      <IoSend size={20} className={isStrangerInRoom ? "translate-x-0.5" : ""} />
    </button>
  );
};

export default SendButton;
