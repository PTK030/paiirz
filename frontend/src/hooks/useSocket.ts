import { useState, useEffect } from "react";
import io, { type Socket } from "socket.io-client";

/**
 * @description Owns the lifecycle of a single socket.io connection: connects
 * on mount, disconnects on unmount. The returned socket is `null` until the
 * connection has been initiated - consumers must guard against `null`.
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

  useEffect(() => {
    const s = io(url);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [url]);

  return socket;
}
