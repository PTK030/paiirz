import type React from "react";
import { IoSend } from "react-icons/io5";

interface SendButtonProps {
  sendMessage: () => void;
  isStrangerInRoom: boolean;
}

/** @description Send button for the chat composer; disabled until a stranger is connected. */
const SendButton: React.FC<SendButtonProps> = ({ sendMessage, isStrangerInRoom }) => {
  return (
    <button
      className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all duration-300 outline-none shadow-lg cursor-pointer flex-shrink-0 ${isStrangerInRoom ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-105" : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-600 cursor-not-allowed opacity-50"}`}
      onClick={sendMessage}
      disabled={!isStrangerInRoom}
      title="Wyślij wiadomość"
    >
      <IoSend size={20} className={isStrangerInRoom ? "translate-x-0.5" : ""} />
    </button>
  );
};

export default SendButton;
