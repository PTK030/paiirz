import { useState, useRef, useEffect, useCallback } from "react";
import type { Socket } from "socket.io-client";

import { privateRoomCreatedSchema, privateRoomErrorSchema } from "../types/socket.schema";
import { generateRoomCode } from "../utils/roomCode";
import { withValidation } from "../utils/socketValidation";

export interface UsePrivateRoomCallbacks {
  /** Runs once the server confirms our private room is ready and waiting for a guest. */
  onRoomCreated: (roomId: string) => void;
}

export interface UsePrivateRoomReturn {
  isPrivateRoom: boolean;
  setIsPrivateRoom: (v: boolean) => void;
  privateRoomCode: string;
  privateRoomInputCode: string;
  setPrivateRoomInputCode: (v: string) => void;
  privateRoomError: string | null;
  privateRoomMode: null | "create" | "join";
  setPrivateRoomMode: (v: null | "create" | "join") => void;
  noScreenshots: boolean;
  setNoScreenshots: (v: boolean) => void;
  notifyOnTabLeave: boolean;
  setNotifyOnTabLeave: (v: boolean) => void;
  tabNotifyEnabled: boolean;
  /** Generates a new room code and asks the server to create the room. */
  createPrivateRoom: () => void;
  /** Attempts to join an existing private room by its code. */
  joinPrivateRoom: (code: string) => void;
}

/**
 * @description Owns the "private room" flow: generating/entering a room
 * code, the create/join UI mode, privacy options (screenshot detection,
 * tab-leave notifications), and the `private_room_created` /
 * `private_room_error` socket events. Entering the room itself (setting the
 * shared `room` id and resetting E2EE) is delegated to the caller via
 * `setRoom` and `callbacks.onRoomCreated`, since that state is owned by
 * `useRoom`.
 *
 * @param socket - active socket.io client (or null while connecting)
 * @param setRoom - setter for the shared room id (owned by `useRoom`)
 * @param setStatus - setter for the human-readable status message shown in the UI
 * @param callbacks - side effects to run once the private room is created
 * @returns Private-room state/options and the actions to create/join one.
 */
export function usePrivateRoom(
  socket: Socket | null,
  setRoom: (roomId: string) => void,
  setStatus: (status: string) => void,
  callbacks: UsePrivateRoomCallbacks
): UsePrivateRoomReturn {
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [privateRoomCode, setPrivateRoomCode] = useState("");
  const [privateRoomInputCode, setPrivateRoomInputCode] = useState("");
  const [privateRoomError, setPrivateRoomError] = useState<string | null>(null);
  const [privateRoomMode, setPrivateRoomMode] = useState<null | "create" | "join">(null);
  const [noScreenshots, setNoScreenshots] = useState(false);
  const [notifyOnTabLeave, setNotifyOnTabLeave] = useState(false);
  const [tabNotifyEnabled, setTabNotifyEnabled] = useState(false);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!socket) return;

    const onPrivateRoomCreated = ({ room: roomId }: { room: string; code: string }) => {
      setRoom(roomId);
      setStatus("Pokój prywatny gotowy - czekasz na gościa");
      callbacksRef.current.onRoomCreated(roomId);
    };

    const onPrivateRoomError = ({ message }: { message: string }) => {
      setPrivateRoomError(message);
      setIsPrivateRoom(false);
    };

    const validatedOnPrivateRoomCreated = withValidation(
      privateRoomCreatedSchema,
      onPrivateRoomCreated
    );
    const validatedOnPrivateRoomError = withValidation(privateRoomErrorSchema, onPrivateRoomError);

    socket.on("private_room_created", validatedOnPrivateRoomCreated);
    socket.on("private_room_error", validatedOnPrivateRoomError);

    return () => {
      socket.off("private_room_created", validatedOnPrivateRoomCreated);
      socket.off("private_room_error", validatedOnPrivateRoomError);
    };
  }, [socket, setRoom, setStatus]);

  const createPrivateRoom = useCallback(() => {
    if (!socket) return;
    const code = generateRoomCode();
    setPrivateRoomCode(code);
    setPrivateRoomError(null);
    setIsPrivateRoom(true);
    setTabNotifyEnabled(notifyOnTabLeave);
    socket.emit("create_private_room", {
      roomCode: code,
      noScreenshots,
      notifyOnTabLeave,
    });
  }, [socket, noScreenshots, notifyOnTabLeave]);

  const joinPrivateRoom = useCallback(
    (code: string) => {
      if (!socket || !code.trim()) return;
      setPrivateRoomError(null);
      setIsPrivateRoom(true);
      socket.emit("join_private_room", { roomCode: code.trim().toUpperCase() });
    },
    [socket]
  );

  return {
    isPrivateRoom,
    setIsPrivateRoom,
    privateRoomCode,
    privateRoomInputCode,
    setPrivateRoomInputCode,
    privateRoomError,
    privateRoomMode,
    setPrivateRoomMode,
    noScreenshots,
    setNoScreenshots,
    notifyOnTabLeave,
    setNotifyOnTabLeave,
    tabNotifyEnabled,
    createPrivateRoom,
    joinPrivateRoom,
  };
}
