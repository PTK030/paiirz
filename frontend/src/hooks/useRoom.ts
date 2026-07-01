import { useState, useRef, useEffect, useCallback } from "react";
import type React from "react";
import type { Socket } from "socket.io-client";

import {
  roomIdSchema,
  roomJoinedSchema,
  roomLeftReasonSchema,
  userCountSchema,
} from "../types/socket.schema";
import { withValidation } from "../utils/socketValidation";

/** Matchmaking filters read from user preferences, used to build the `join` payload. */
export interface RoomJoinPreferences {
  peerId: string;
  myGender: string;
  targetGender: string;
  myAge: string;
  ageMin: string;
  ageMax: string;
  userLat: number | null;
  userLon: number | null;
  myRadius: string;
}

export interface UseRoomCallbacks {
  /** Runs before a join is requested - reset per-session UI left over from the previous room. */
  onBeforeJoin: () => void;
  /** Runs once the server confirms we're waiting as the searcher in a fresh room. */
  onRoomCreated: (roomId: string) => void;
  /** Runs once the server matches us into a room that already has a stranger. */
  onRoomJoined: (roomId: string) => void;
  /** Runs before we voluntarily leave/cancel the current room. */
  onBeforeLeave: () => void;
  /** Runs when the server ends the room (stranger left, or someone was blocked). */
  onRoomLeft: (reason?: string) => void;
}

export interface UseRoomReturn {
  room: string | null;
  setRoom: React.Dispatch<React.SetStateAction<string | null>>;
  isStrangerInRoom: boolean;
  setIsStrangerInRoom: React.Dispatch<React.SetStateAction<boolean>>;
  userCount: number | null;
  /** Latest room id, safe to read from async closures without stale capture. */
  currentRoomRef: React.RefObject<string | null>;
  /** Leaves the current room (if any) and asks the server to match into a new one. */
  joinRoom: (overrides?: { gender?: string; targetGender?: string }) => void;
  /** Leaves/cancels the current room. */
  leaveRoom: () => void;
}

/**
 * @description Owns matchmaking room state (room id, whether a stranger has
 * joined, the live user counter) and the socket lifecycle events that drive
 * it (`room_created`, `room_joined`, `room_left`, `user_count`). Side effects
 * that belong to other concerns (E2EE reset, resetting chat/session UI,
 * playing sounds) are delegated to the caller via `callbacks` so this hook
 * stays focused on a single responsibility: the room connection itself.
 *
 * @param socket - active socket.io client (or null while connecting)
 * @param prefs - matchmaking filters used to build the `join` payload
 * @param setStatus - setter for the human-readable status message shown in the UI
 * @param callbacks - side effects to run around room lifecycle transitions
 * @param socketUrl - base API URL, used to fetch the initial user counter
 */
export function useRoom(
  socket: Socket | null,
  prefs: RoomJoinPreferences,
  setStatus: (status: string) => void,
  callbacks: UseRoomCallbacks,
  socketUrl: string
): UseRoomReturn {
  const [room, setRoom] = useState<string | null>(null);
  const [isStrangerInRoom, setIsStrangerInRoom] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Always-fresh callbacks ref - lets the socket effect below subscribe only
  // once per `socket` change while still calling the latest closures.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    currentRoomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!socket) return;

    const onRoomCreated = (roomId: string) => {
      currentRoomRef.current = roomId;
      setRoom(roomId);
      setIsStrangerInRoom(false);
      setStatus("Szukanie nowego rozmówcy");
      callbacksRef.current.onRoomCreated(roomId);
    };

    const onRoomJoined = ({ room: roomId }: { room: string; sid: string }) => {
      currentRoomRef.current = roomId;
      setRoom(roomId);
      setIsStrangerInRoom(true);
      setStatus("Nawiązywanie bezpiecznego połączenia E2E…");
      callbacksRef.current.onRoomJoined(roomId);
    };

    const onRoomLeft = (reason?: string) => {
      setRoom(null);
      setIsStrangerInRoom(false);
      setStatus(
        reason === "blocked" ? "Rozmówca został zablokowany i zgłoszony" : "Rozmówca rozłączył się"
      );
      callbacksRef.current.onRoomLeft(reason);
    };

    const onUserCount = ({ count }: { count: number }) => setUserCount(count);

    const validatedOnRoomCreated = withValidation(roomIdSchema, onRoomCreated);
    const validatedOnRoomJoined = withValidation(roomJoinedSchema, onRoomJoined);
    const validatedOnRoomLeft = withValidation(roomLeftReasonSchema, onRoomLeft);
    const validatedOnUserCount = withValidation(userCountSchema, onUserCount);

    socket.on("room_created", validatedOnRoomCreated);
    socket.on("room_joined", validatedOnRoomJoined);
    socket.on("room_left", validatedOnRoomLeft);
    socket.on("user_count", validatedOnUserCount);

    fetch(`${socketUrl}/api/user/counter`)
      .then((r) => r.json())
      .then((d) => setUserCount(d.user_count))
      .catch(() => {});

    return () => {
      socket.off("room_created", validatedOnRoomCreated);
      socket.off("room_joined", validatedOnRoomJoined);
      socket.off("room_left", validatedOnRoomLeft);
      socket.off("user_count", validatedOnUserCount);
    };
  }, [socket, setStatus, socketUrl]);

  /**
   * @description Leaves the current room (if any) and asks the server to
   * match into a new one using the saved preference filters, unless
   * `overrides` are supplied (e.g. the "Quick start" button forces
   * gender/targetGender to "any" regardless of saved preferences).
   * @param overrides - optional one-off filter values that bypass the
   *   user's saved preferences for this single join request
   */
  const joinRoom = useCallback(
    (overrides?: { gender?: string; targetGender?: string }) => {
      if (!socket) return;
      callbacksRef.current.onBeforeJoin();
      const payload = {
        peerId: prefs.peerId,
        gender: overrides?.gender ?? prefs.myGender,
        targetGender: overrides?.targetGender ?? prefs.targetGender,
        age: prefs.myAge ? parseInt(prefs.myAge) : null,
        ageMin: prefs.ageMin ? parseInt(prefs.ageMin) : null,
        ageMax: prefs.ageMax ? parseInt(prefs.ageMax) : null,
        lat: prefs.userLat,
        lon: prefs.userLon,
        radius: prefs.myRadius !== "any" ? parseInt(prefs.myRadius) : null,
      };
      if (room) {
        socket.emit("leave", { room });
        setRoom("");
        setStatus("Szukanie nowego rozmówcy");
        socket.emit("join", payload);
      } else {
        socket.emit("join", payload);
        setStatus("Szukanie rozmówcy…");
      }
    },
    [socket, room, prefs, setStatus]
  );

  /**
   * @description Cancels an in-progress search or leaves the current room,
   * notifying the server so the stranger (if any) is informed.
   */
  const leaveRoom = useCallback(() => {
    callbacksRef.current.onBeforeLeave();
    if (room && socket) {
      socket.emit("leave", { room });
      setRoom(null);
      setStatus(isStrangerInRoom ? "Rozłączono" : "Przerwano szukanie");
      setIsStrangerInRoom(false);
    }
  }, [room, socket, isStrangerInRoom, setStatus]);

  return {
    room,
    setRoom,
    isStrangerInRoom,
    setIsStrangerInRoom,
    userCount,
    currentRoomRef,
    joinRoom,
    leaveRoom,
  };
}
