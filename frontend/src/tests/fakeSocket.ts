import type { Socket } from "socket.io-client";
import { vi } from "vitest";

/**
 * @description Minimal in-memory `Socket` stand-in for hook tests: supports
 * `on`/`off`/`emit` with real listener dispatch, so tests can simulate the
 * server pushing an event via `trigger` without a real socket.io connection.
 */
export function createFakeSocket(id = "my-sid") {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const socket = {
    id,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return socket;
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler);
      return socket;
    }),
    emit: vi.fn(),
  };

  const trigger = (event: string, ...args: unknown[]) => {
    listeners.get(event)?.forEach((handler) => handler(...args));
  };

  return { socket: socket as unknown as Socket, trigger, listeners };
}
