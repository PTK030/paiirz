import SendButton from "../components/SendButton";
import NewRoom from "../components/NewRoom";
import Input from "../components/Input";
import ChatWrapper from "../components/ChatWrapper";

import React, { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client";

const socketUrl = process.env.REACT_APP_BACKEND_API || "http://127.0.0.1:5000";

const Chat: React.FC = () => {
  const [switchRoom, setSwitchRoom] = useState<boolean>(true);
  const [isStrangerInRoom, setIsStrangerInRoom] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [chat, setChat] = useState<{ sid: string; message: string }[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [status, setStatus] = useState<string>(
    "Kliknij zielony przycisk, aby rozpocząć nową rozmowę"
  );

  useEffect(() => {
    const socket: Socket = io(socketUrl);
    setSocket(socket);

    socket.on("room_created", (room: string) => {
      setRoom(room);
      setChat([]);
      setIsStrangerInRoom(false);
      setStatus("Szukanie nowego obcego 😊");
    });

    socket.on("room_joined", ({ room, sid }: { room: string; sid: string }) => {
      if (room === room) {
        setRoom(room);
        setChat([]);
        setIsStrangerInRoom(true);
        if (sid !== socket.id) {
          setIsStrangerInRoom(true);
        }
        setStatus("Rozmawiasz obecnie z obcym 🗣️");
      }
    });

    socket.on("message", (messageData: { sid: string; message: string }) => {
      setChat((prevChat) => [...prevChat, messageData]);
    });

    socket.on("room_left", () => {
      setRoom(null);
      setIsStrangerInRoom(false);
      setSwitchRoom(true)
      setStatus("Obcy rozłączył się 🥹");
    });

    fetchUserCount();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const confirmationMessage = "Czy na pewno chcesz opuścić tę stronę?";
      event.preventDefault();

      if (window.confirm(confirmationMessage)) {
        leaveRoom();
      }
      return confirmationMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room]);

  const getUserCountText = (count: number): string => {
    if (count === 1) {
      return "1 osoba aktualnie";
    } else if (count > 1 && count < 5) {
      return `${count} osoby aktualnie`;
    } else {
      return `${count} osób aktualnie`;
    }
  };

  const joinRoom = () => {
    if (room && socket) {
      socket.emit("leave", { room });
      setRoom("");
      setStatus("Szukanie nowego obcego 😊");
      socket.emit("join");
    } else if (socket) {
      socket.emit("join");
      setStatus("Rozmawiasz obecnie z obcym 🗣️");
    }
  };

  const leaveRoom = () => {
    if (room && socket) {
      socket.emit("leave", { room });
      setRoom(null);
      if (!isStrangerInRoom) {
        setStatus("Przerwano szukanie nowego obcego 😦");
      }
      else {
        setStatus("Rozłączyłeś się z obcym 😦");
      }
      setIsStrangerInRoom(false);
    }
  };

  const sendMessage = () => {
    if (message && room && socket) {
      socket.emit("message", { room, message });
      setMessage("");
    }
  };

  const fetchUserCount = async () => {
    const response = await fetch(`${socketUrl}/api/user/counter`);
    const data = await response.json();
    setUserCount(data.user_count);
  };

  return (
    <div className="h-svh pt-[96px] w-full bg-deep-navy-blue flex flex-col sm:px-24 sm:pb-16">
      <div className="self-start py-8 text-slate-200 font-semibold text-lg sm:text-2xl flex w-full items-center fixed top-0 left-0 justify-around sm:justify-between sm:px-24">
        <h1>
          better 6<span className="text-yellow-500">Obcy</span>
        </h1>
        <p className="text-md sm:text-xl text-green-600">
          {userCount !== null ? getUserCountText(userCount) : "..."}
        </p>
      </div>
      <div className="bg-mid-night-blue h-full w-full rounded-none sm:rounded-lg shadow-2xl flex flex-col ">
        <ChatWrapper chat={chat} socket={socket} status={status} />
        <div className="flex">
          <NewRoom
            joinRoom={joinRoom}
            leaveRoom={leaveRoom}
            switchRoom={switchRoom}
            setSwitchRoom={setSwitchRoom}
          />
          <Input
            room={room}
            setMessage={setMessage}
            message={message}
            sendMessage={sendMessage}
            isStrangerInRoom={isStrangerInRoom}
          />
          <SendButton
            sendMessage={sendMessage}
            isStrangerInRoom={isStrangerInRoom}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
