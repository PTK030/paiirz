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
      placeholder="Wpisz wiadomość..."
      disabled={room === null || isStrangerInRoom === false}
      className={`flex-1 outline-none px-4 sm:px-6 bg-zinc-950/30 text-zinc-100 placeholder-zinc-500 py-3.5 sm:py-5 font-sans text-sm border-r border-zinc-800/80 transition-all focus:bg-zinc-950/60 ${room === null || isStrangerInRoom === false ? "cursor-not-allowed opacity-50" : "cursor-auto"}`}
      onChange={e => setMessage(e.target.value)}
      onKeyPress={handleKeyPress}
    />
  );
};

export default Input;
