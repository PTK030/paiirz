import React, { KeyboardEvent } from 'react';

interface InputProps {
  setMessage: (message: string) => void;
  message: string;
  room: string | null;
  sendMessage: () => void;
  isStrangerInRoom: boolean;
}

const Input: React.FC<InputProps> = ({ setMessage, message, sendMessage, room, isStrangerInRoom }) => {
  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };


  return (
    <input
      type="text"
      value={message}
      placeholder="Napisz wiadomość..."
      disabled={room === null || !isStrangerInRoom}
      className="flex-grow w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl sm:rounded-[1.5rem] px-3.5 sm:px-6 py-2.5 sm:py-4 text-xs sm:text-base text-zinc-100 placeholder-zinc-500 outline-none transition-all duration-300 focus:bg-zinc-900/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
      onChange={e => setMessage(e.target.value)}
      onKeyPress={handleKeyPress}
    />
  );
};

export default Input;
