import { waitFor } from "@testing-library/dom";
import { renderHook, act } from "@testing-library/react";
import type { Socket } from "socket.io-client";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  useRoom,
  type RoomJoinPreferences,
  type UseRoomCallbacks,
} from "../../../hooks/core/useRoom";
import { createFakeSocket } from "../../fakeSocket";

const prefs: RoomJoinPreferences = {
  peerId: "peer-1",
  myGender: "any",
  targetGender: "any",
  myAge: "",
  ageMin: "",
  ageMax: "",
  userLat: null,
  userLon: null,
  myRadius: "any",
};

function makeCallbacks(): UseRoomCallbacks {
  return {
    onBeforeJoin: vi.fn(),
    onRoomCreated: vi.fn(),
    onRoomJoined: vi.fn(),
    onBeforeLeave: vi.fn(),
    onRoomLeft: vi.fn(),
  };
}

/** Mounts `useRoom` and flushes the initial user-counter fetch before returning. */
async function renderRoom(
  socket: Socket,
  setStatus: (status: string) => void,
  callbacks: UseRoomCallbacks
) {
  const rendered = renderHook(() =>
    useRoom(socket, prefs, setStatus, callbacks, "http://localhost:5000")
  );
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
}

describe("useRoom", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve({ user_count: 3 }) })
    );
  });

  it("starts with no room and fetches the initial user counter", async () => {
    const { socket } = createFakeSocket();
    const { result } = await renderRoom(socket, vi.fn(), makeCallbacks());
    expect(result.current.room).toBeNull();
    await waitFor(() => expect(result.current.userCount).toBe(3));
  });

  it("emits join with the saved preference filters", async () => {
    const { socket } = createFakeSocket();
    const callbacks = makeCallbacks();
    const { result } = await renderRoom(socket, vi.fn(), callbacks);

    act(() => result.current.joinRoom());

    expect(callbacks.onBeforeJoin).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith(
      "join",
      expect.objectContaining({ peerId: "peer-1", gender: "any", targetGender: "any" })
    );
  });

  it("applies one-off overrides without touching saved preferences", async () => {
    const { socket } = createFakeSocket();
    const { result } = await renderRoom(socket, vi.fn(), makeCallbacks());

    act(() => result.current.joinRoom({ gender: "female", targetGender: "male" }));

    expect(socket.emit).toHaveBeenCalledWith(
      "join",
      expect.objectContaining({ gender: "female", targetGender: "male" })
    );
  });

  it("leaves the current room before joining a new one", async () => {
    const { socket, trigger } = createFakeSocket();
    const setStatus = vi.fn();
    const { result } = await renderRoom(socket, setStatus, makeCallbacks());

    act(() => trigger("room_created", "room-1"));
    expect(result.current.room).toBe("room-1");

    act(() => result.current.joinRoom());
    expect(socket.emit).toHaveBeenCalledWith("leave", { room: "room-1" });
    expect(socket.emit).toHaveBeenCalledWith("join", expect.any(Object));
  });

  it("transitions into a created room and notifies the caller", async () => {
    const { socket, trigger } = createFakeSocket();
    const callbacks = makeCallbacks();
    const { result } = await renderRoom(socket, vi.fn(), callbacks);

    act(() => trigger("room_created", "room-abc"));

    expect(result.current.room).toBe("room-abc");
    expect(result.current.isStrangerInRoom).toBe(false);
    expect(result.current.currentRoomRef.current).toBe("room-abc");
    expect(callbacks.onRoomCreated).toHaveBeenCalledWith("room-abc");
  });

  it("transitions into a joined room with the stranger already present", async () => {
    const { socket, trigger } = createFakeSocket();
    const callbacks = makeCallbacks();
    const { result } = await renderRoom(socket, vi.fn(), callbacks);

    act(() => trigger("room_joined", { room: "room-xyz", sid: "abc" }));

    expect(result.current.room).toBe("room-xyz");
    expect(result.current.isStrangerInRoom).toBe(true);
    expect(callbacks.onRoomJoined).toHaveBeenCalledWith("room-xyz");
  });

  it("clears room state and forwards the reason when the room is left", async () => {
    const { socket, trigger } = createFakeSocket();
    const callbacks = makeCallbacks();
    const { result } = await renderRoom(socket, vi.fn(), callbacks);
    act(() => trigger("room_created", "room-1"));

    act(() => trigger("room_left", "blocked"));

    expect(result.current.room).toBeNull();
    expect(result.current.isStrangerInRoom).toBe(false);
    expect(callbacks.onRoomLeft).toHaveBeenCalledWith("blocked");
  });

  it("reports a generic disconnect message when room_left has no 'blocked' reason", async () => {
    const { socket, trigger } = createFakeSocket();
    const setStatus = vi.fn();
    const { result } = await renderRoom(socket, setStatus, makeCallbacks());
    act(() => trigger("room_created", "room-1"));

    act(() => trigger("room_left", undefined));

    expect(result.current.room).toBeNull();
    expect(setStatus).toHaveBeenCalledWith("Rozmówca rozłączył się");
  });

  it("updates the live user counter on user_count events", async () => {
    const { socket, trigger } = createFakeSocket();
    const { result } = await renderRoom(socket, vi.fn(), makeCallbacks());

    act(() => trigger("user_count", { count: 42 }));
    expect(result.current.userCount).toBe(42);
  });

  it("ignores a malformed user_count payload instead of throwing", async () => {
    const { socket, trigger } = createFakeSocket();
    const { result } = await renderRoom(socket, vi.fn(), makeCallbacks());
    // The initial fetch already resolved userCount to 3 (see beforeEach mock).
    expect(result.current.userCount).toBe(3);

    expect(() => trigger("user_count", { count: "not-a-number" })).not.toThrow();
    expect(result.current.userCount).toBe(3);
  });

  it("emits leave and notifies the caller when leaving a room", async () => {
    const { socket, trigger } = createFakeSocket();
    const callbacks = makeCallbacks();
    const { result } = await renderRoom(socket, vi.fn(), callbacks);
    act(() => trigger("room_created", "room-1"));

    act(() => result.current.leaveRoom());

    expect(callbacks.onBeforeLeave).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith("leave", { room: "room-1" });
    expect(result.current.room).toBeNull();
  });

  it("parses numeric age/radius preferences before joining", async () => {
    const { socket } = createFakeSocket();
    const numericPrefs: RoomJoinPreferences = {
      ...prefs,
      myAge: "28",
      ageMin: "18",
      ageMax: "40",
      myRadius: "50",
    };
    const { result } = renderHook(() =>
      useRoom(socket, numericPrefs, vi.fn(), makeCallbacks(), "http://localhost:5000")
    );
    await act(async () => {
      await Promise.resolve();
    });

    act(() => result.current.joinRoom());

    expect(socket.emit).toHaveBeenCalledWith(
      "join",
      expect.objectContaining({ age: 28, ageMin: 18, ageMax: 40, radius: 50 })
    );
  });

  it("does nothing when joinRoom is called with no connected socket", async () => {
    const callbacks = makeCallbacks();
    const { result } = renderHook(() =>
      useRoom(null, prefs, vi.fn(), callbacks, "http://localhost:5000")
    );
    await act(async () => {
      await Promise.resolve();
    });

    act(() => result.current.joinRoom());

    expect(callbacks.onBeforeJoin).not.toHaveBeenCalled();
  });

  it("reports 'Rozłączono' when leaving a room the stranger already joined", async () => {
    const { socket, trigger } = createFakeSocket();
    const setStatus = vi.fn();
    const { result } = await renderRoom(socket, setStatus, makeCallbacks());
    act(() => trigger("room_joined", { room: "room-1", sid: "stranger" }));

    act(() => result.current.leaveRoom());

    expect(setStatus).toHaveBeenCalledWith("Rozłączono");
  });

  it("does nothing when leaving with no active room", async () => {
    const { socket } = createFakeSocket();
    const callbacks = makeCallbacks();
    const { result } = await renderRoom(socket, vi.fn(), callbacks);

    act(() => result.current.leaveRoom());

    expect(callbacks.onBeforeLeave).toHaveBeenCalledTimes(1);
    expect(socket.emit).not.toHaveBeenCalledWith("leave", expect.anything());
  });

  it("unsubscribes all room listeners on unmount", async () => {
    const { socket, listeners } = createFakeSocket();
    const { unmount } = await renderRoom(socket, vi.fn(), makeCallbacks());
    expect(listeners.get("room_created")?.size).toBe(1);

    unmount();

    expect(listeners.get("room_created")?.size).toBe(0);
    expect(listeners.get("room_joined")?.size).toBe(0);
    expect(listeners.get("room_left")?.size).toBe(0);
    expect(listeners.get("user_count")?.size).toBe(0);
  });

  it("does not crash when the initial user-counter fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const { socket } = createFakeSocket();
    const { result } = await renderRoom(socket, vi.fn(), makeCallbacks());
    // userCount stays null because the fetch failed silently
    expect(result.current.userCount).toBeNull();
  });

  it("reports 'Przerwano szukanie' when leaving before a stranger joins", async () => {
    const { socket, trigger } = createFakeSocket();
    const setStatus = vi.fn();
    const { result } = await renderRoom(socket, setStatus, makeCallbacks());
    act(() => trigger("room_created", "room-1"));
    // stranger hasn't joined yet
    expect(result.current.isStrangerInRoom).toBe(false);

    act(() => result.current.leaveRoom());

    expect(setStatus).toHaveBeenCalledWith("Przerwano szukanie");
  });
});
