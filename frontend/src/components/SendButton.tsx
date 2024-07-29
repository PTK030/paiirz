import React from "react";
import { IoSend } from "react-icons/io5";

interface SendButtonProps {
  sendMessage: () => void;
  isStrangerInRoom: boolean;
}

const SendButton: React.FC<SendButtonProps> = ({ sendMessage, isStrangerInRoom }) => {
  return (
    <button
      className="bg-yellow-500 px-4 sm:px-8  text-xl rounded-none sm:rounded-br-lg disabled:cursor-not-allowed"
      onClick={sendMessage}
      disabled={!isStrangerInRoom}
    >
      <IoSend className="text-slate-900" />
    </button>
  );
};

export default SendButton;
