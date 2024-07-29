import React, { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";

interface ChatWrapperProps {
  chat: { sid: string; message: string }[];
  socket: Socket | null;
  status: string;
}

const ChatWrapper: React.FC<ChatWrapperProps> = ({ chat, socket, status }) => {
  const messageEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  return (
    <div className="flex flex-col h-full max:h-full overflow-y-auto relative">
      <p className="text-center text-slate-200 text-lg w-3/4 md:text-2xl font-semibold fixed mt-12 left-1/2 -translate-x-1/2">
        {status}
      </p>
      <div className="flex flex-col p-4 mt-28 space-y-4">
        {socket &&
          chat.map((msg, index) => (
            <div key={index}>
              <div
                className={`flex items-center gap-2 ${
                  msg.sid === socket.id ? "justify-end" : "justify-start"
                }`}
              >
                <p className="text-white">
                  {msg.sid === socket.id ? "Ty" : "Obcy"}{" "}
                </p>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.sid === socket.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
              <div ref={messageEndRef}></div>
              <div />
            </div>
          ))}
      </div>
    </div>
  );
};

export default ChatWrapper;
