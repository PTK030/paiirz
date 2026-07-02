import { waitFor } from "@testing-library/dom";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useSocket } from "../../../hooks/core/useSocket";

// ── Fake socket factory ────────────────────────────────────────────────────────
// Each call to `io()` now returns a fake socket that:
//   • supports `on` / `off` so the hook can register connect/disconnect handlers
//   • exposes `trigger` so tests can simulate server-pushed events
//   • has a writable `id` field (starts as undefined, just like a real socket
//     before the server assigns one)

type Handler = (...args: unknown[]) => void;

function makeFakeSocket() {
  const listeners = new Map<string, Set<Handler>>();
  let _id: string | undefined = undefined;

  const socket = {
    get id() {
      return _id;
    },
    on: vi.fn((event: string, handler: Handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return socket;
    }),
    off: vi.fn((event: string, handler: Handler) => {
      listeners.get(event)?.delete(handler);
      return socket;
    }),
    disconnect: vi.fn(),
  };

  const trigger = (event: string, newId?: string | null) => {
    // null explicitly clears the id (models socket.io disconnect behaviour
    // where socket.id becomes undefined); a string sets it; undefined leaves
    // the current value alone.
    if (newId === null) _id = undefined;
    else if (newId !== undefined) _id = newId;
    listeners.get(event)?.forEach((h) => h());
  };

  return { socket, trigger };
}

// ── Module-level mutable state so each test can get its own fake socket ────────
let currentFakeSocket = makeFakeSocket();
const disconnect = vi.fn();
const on = vi.fn();
const off = vi.fn();
const io = vi.fn((_url: string) => currentFakeSocket.socket);

vi.mock("socket.io-client", () => ({
  io: (url: string) => io(url),
  default: (url: string) => io(url),
}));

describe("useSocket", () => {
  beforeEach(() => {
    currentFakeSocket = makeFakeSocket();
    io.mockClear();
    disconnect.mockClear();
    on.mockClear();
    off.mockClear();
  });

  it("returns an active connection immediately after mount", () => {
    const { result } = renderHook(() => useSocket("http://localhost:5000"));
    expect(result.current).not.toBeNull();
  });

  it("connects to the given URL on mount", async () => {
    renderHook(() => useSocket("http://localhost:5000"));
    await waitFor(() => expect(io).toHaveBeenCalledWith("http://localhost:5000"));
  });

  it("disconnects the socket on unmount", () => {
    const { unmount } = renderHook(() => useSocket("http://localhost:5000"));
    unmount();
    expect(currentFakeSocket.socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects with a new socket when the URL changes", async () => {
    // Create a second fake socket for the second connection
    const secondFake = makeFakeSocket();
    io.mockImplementationOnce(() => currentFakeSocket.socket).mockImplementationOnce(
      () => secondFake.socket
    );

    const { rerender } = renderHook(({ url }) => useSocket(url), {
      initialProps: { url: "http://localhost:5000" },
    });
    await waitFor(() => expect(io).toHaveBeenCalledTimes(1));

    rerender({ url: "http://localhost:6000" });
    await waitFor(() => expect(io).toHaveBeenCalledTimes(2));
    expect(currentFakeSocket.socket.disconnect).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenLastCalledWith("http://localhost:6000");
  });

  it("exposes socket.id after the server fires the connect event", async () => {
    const { result } = renderHook(() => useSocket("http://localhost:5000"));

    // Before connect: id is undefined
    expect(result.current?.id).toBeUndefined();

    // Simulate server assigning a session id
    act(() => {
      currentFakeSocket.trigger("connect", "server-assigned-sid");
    });

    // After connect: id is propagated and the component re-renders
    await waitFor(() => expect(result.current?.id).toBe("server-assigned-sid"));
  });

  it("clears socket.id back to undefined when the socket disconnects", async () => {
    const { result } = renderHook(() => useSocket("http://localhost:5000"));

    act(() => {
      currentFakeSocket.trigger("connect", "my-sid");
    });
    await waitFor(() => expect(result.current?.id).toBe("my-sid"));

    act(() => {
      currentFakeSocket.trigger("disconnect", null);
    });
    await waitFor(() => expect(result.current?.id).toBeUndefined());
  });

  it("registers connect and disconnect listeners on the socket", () => {
    renderHook(() => useSocket("http://localhost:5000"));
    const onCalls = currentFakeSocket.socket.on.mock.calls.map(([event]) => event);
    expect(onCalls).toContain("connect");
    expect(onCalls).toContain("disconnect");
  });

  it("removes connect and disconnect listeners on unmount", () => {
    const { unmount } = renderHook(() => useSocket("http://localhost:5000"));
    unmount();
    const offCalls = currentFakeSocket.socket.off.mock.calls.map(([event]) => event);
    expect(offCalls).toContain("connect");
    expect(offCalls).toContain("disconnect");
  });
});
