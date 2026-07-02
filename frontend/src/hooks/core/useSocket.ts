import { useState, useEffect } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * @description Owns the lifecycle of a single socket.io connection: connects
 * on mount, disconnects on unmount. The returned socket is `null` until the
 * connection has been initiated - consumers must guard against `null`.
 *
 * Re-renders the caller whenever the socket's `id` changes (i.e. on
 * `connect` and `disconnect`) so that `socket.id` is never stale. Without
 * this, `socket.id` is `undefined` for the first render (the server assigns
 * it asynchronously) and both outgoing-message `sid` and the `mySid` prop
 * passed to `MessageBubble` resolve to `""`, making every message appear as
 * sent by the current user ("TY").
 *
 * @param url - the socket.io server URL to connect to
 * @returns the active `Socket` instance, or `null` before the first connect
 *
 * @example
 * const socket = useSocket(SOCKET_URL);
 * useEffect(() => {
 *   if (!socket) return;
 *   socket.on("message", handleMessage);
 *   return () => socket.off("message", handleMessage);
 * }, [socket]);
 */
export function useSocket(url: string): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);
  // Tracks socket.id separately so that a state update (→ re-render) is
  // triggered the moment the server assigns an id to the socket.
  const [, setSocketId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const s = io(url);

    const onConnect = () => setSocketId(s.id);
    const onDisconnect = () => setSocketId(undefined);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    setSocket(s);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.disconnect();
    };
  }, [url]);

  return socket;
}
