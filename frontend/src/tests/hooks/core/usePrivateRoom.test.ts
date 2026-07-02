import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { usePrivateRoom, type UsePrivateRoomCallbacks } from "../../../hooks/core/usePrivateRoom";
import { createFakeSocket } from "../../fakeSocket";

function makeCallbacks(): UsePrivateRoomCallbacks {
  return { onRoomCreated: vi.fn() };
}

describe("usePrivateRoom", () => {
  it("starts outside a private room with no code or error", () => {
    const { socket } = createFakeSocket();
    const { result } = renderHook(() => usePrivateRoom(socket, vi.fn(), vi.fn(), makeCallbacks()));
    expect(result.current.isPrivateRoom).toBe(false);
    expect(result.current.privateRoomCode).toBe("");
    expect(result.current.privateRoomError).toBeNull();
  });

  it("generates a room code and asks the server to create the room", () => {
    const { socket } = createFakeSocket();
    const { result } = renderHook(() => usePrivateRoom(socket, vi.fn(), vi.fn(), makeCallbacks()));

    act(() => result.current.createPrivateRoom());

    expect(result.current.isPrivateRoom).toBe(true);
    expect(result.current.privateRoomCode).toMatch(/^[A-Z0-9]+$/);
    expect(socket.emit).toHaveBeenCalledWith(
      "create_private_room",
      expect.objectContaining({ roomCode: result.current.privateRoomCode })
    );
  });

  it("includes the current privacy options (noScreenshots/notifyOnTabLeave) when creating a room", () => {
    const { socket } = createFakeSocket();
    const { result } = renderHook(() => usePrivateRoom(socket, vi.fn(), vi.fn(), makeCallbacks()));

    act(() => {
      result.current.setNoScreenshots(true);
      result.current.setNotifyOnTabLeave(true);
    });
    act(() => result.current.createPrivateRoom());

    expect(socket.emit).toHaveBeenCalledWith(
      "create_private_room",
      expect.objectContaining({ noScreenshots: true, notifyOnTabLeave: true })
    );
    expect(result.current.tabNotifyEnabled).toBe(true);
  });

  it("uppercases and trims the code before joining, ignoring whitespace-only input", () => {
    const { socket } = createFakeSocket();
    const { result } = renderHook(() => usePrivateRoom(socket, vi.fn(), vi.fn(), makeCallbacks()));

    act(() => result.current.joinPrivateRoom("   "));
    expect(socket.emit).not.toHaveBeenCalledWith("join_private_room", expect.anything());

    act(() => result.current.joinPrivateRoom(" ab12cd "));
    expect(socket.emit).toHaveBeenCalledWith("join_private_room", { roomCode: "AB12CD" });
    expect(result.current.isPrivateRoom).toBe(true);
  });

  it("does nothing when the socket is not yet connected", () => {
    const { result } = renderHook(() => usePrivateRoom(null, vi.fn(), vi.fn(), makeCallbacks()));

    act(() => result.current.createPrivateRoom());
    act(() => result.current.joinPrivateRoom("AB12CD"));

    expect(result.current.isPrivateRoom).toBe(false);
  });

  it("enters the created room and notifies the caller on private_room_created", () => {
    const { socket, trigger } = createFakeSocket();
    const setRoom = vi.fn();
    const setStatus = vi.fn();
    const callbacks = makeCallbacks();
    renderHook(() => usePrivateRoom(socket, setRoom, setStatus, callbacks));

    act(() => trigger("private_room_created", { room: "room-1", code: "AB12CD" }));

    expect(setRoom).toHaveBeenCalledWith("room-1");
    expect(callbacks.onRoomCreated).toHaveBeenCalledWith("room-1");
  });

  it("surfaces a server error and exits private-room mode", () => {
    const { socket, trigger } = createFakeSocket();
    const { result } = renderHook(() => usePrivateRoom(socket, vi.fn(), vi.fn(), makeCallbacks()));
    act(() => result.current.createPrivateRoom());
    expect(result.current.isPrivateRoom).toBe(true);

    act(() => trigger("private_room_error", { message: "Pokój nie istnieje lub wygasł." }));

    expect(result.current.privateRoomError).toBe("Pokój nie istnieje lub wygasł.");
    expect(result.current.isPrivateRoom).toBe(false);
  });

  it("unsubscribes private-room listeners on unmount", () => {
    const { socket, listeners } = createFakeSocket();
    const { unmount } = renderHook(() => usePrivateRoom(socket, vi.fn(), vi.fn(), makeCallbacks()));
    expect(listeners.get("private_room_created")?.size).toBe(1);

    unmount();

    expect(listeners.get("private_room_created")?.size).toBe(0);
    expect(listeners.get("private_room_error")?.size).toBe(0);
  });
});
