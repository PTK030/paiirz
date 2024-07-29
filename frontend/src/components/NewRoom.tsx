import React, { useState } from "react";
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
    <button className="bg-green-600 px-4 sm:px-8 text-xl rounded-none sm:rounded-bl-lg text-slate-900" onClick={handleSwitch}>
      <AiFillMessage />
    </button>
  );
};

export default NewRoom;
