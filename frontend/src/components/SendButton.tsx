import React from "react";
import { IoSend } from "react-icons/io5";

interface SendButtonProps {
  sendMessage: () => void;
  isStrangerInRoom: boolean;
}

const SendButton: React.FC<SendButtonProps> = ({ sendMessage, isStrangerInRoom }) => {
  return (
    <button
      className="bg-zinc-900/45 hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 px-4 sm:px-8 text-xl rounded-none disabled:cursor-not-allowed disabled:opacity-30 transition-all duration-200 select-none outline-none"
      onClick={sendMessage}
      disabled={!isStrangerInRoom}
    >
      <IoSend className="text-current" />
    </button>
  );
};

export default SendButton;
