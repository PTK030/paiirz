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
      disabled={room === null || isStrangerInRoom === false ? true : false}
      className={`flex-1 outline-none px-4 bg-slate-100 py-3 sm:py-5 ${room === null || isStrangerInRoom === false ? "cursor-not-allowed" : "cursor-auto"}`}
      onChange={e => setMessage(e.target.value)}
      onKeyPress={handleKeyPress}
    />
  );
};

export default Input;
