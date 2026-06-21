import React from "react";
import { AiFillMessage } from "react-icons/ai";

interface NewRoomProps {
  switchRoom: boolean;
  joinRoom: () => void;
  leaveRoom: () => void;
  setSwitchRoom: (switchRoom: boolean) => void;
}

const NewRoom: React.FC<NewRoomProps> = ({ joinRoom, leaveRoom, setSwitchRoom, switchRoom }) => {

  const handleSwitch = () => {
    if (switchRoom) {
      joinRoom();
      console.log("join");
      setSwitchRoom(!switchRoom);
    } else {
      leaveRoom();
      console.log("leave");
      setSwitchRoom(!switchRoom);
    }
  };

  return (
    <button className="bg-zinc-900/45 hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 px-4 sm:px-8 text-xl rounded-none transition-all duration-200 border-r border-zinc-800/80 select-none outline-none" onClick={handleSwitch}>
      <AiFillMessage />
    </button>
  );
};

export default NewRoom;
