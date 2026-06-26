import React from "react";
import { AiFillMessage } from "react-icons/ai";

interface NewRoomProps {
  leaveRoom: () => void;
  joinRoom: () => void;
}

const NewRoom: React.FC<NewRoomProps> = ({ leaveRoom, joinRoom }) => {
  return (
    <div className="flex gap-2">
      <button
        className="p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all duration-300 outline-none shadow-lg cursor-pointer flex-shrink-0 bg-zinc-900/80 border border-zinc-800/80 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 hover:scale-105"
        onClick={leaveRoom}
        title="Rozłącz się"
      >
        <AiFillMessage size={20} />
      </button>
      <button
        className="p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all duration-300 outline-none shadow-lg cursor-pointer flex-shrink-0 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:scale-105"
        onClick={joinRoom}
        title="Pomiń i znajdź nowego"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default NewRoom;
