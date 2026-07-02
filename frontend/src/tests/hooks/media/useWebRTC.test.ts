import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWebRTC } from "../../../hooks/media/useWebRTC";
import { createFakeSocket } from "../../fakeSocket";

describe("useWebRTC call teardown", () => {
  const stopTrack = vi.fn();
  const audioTrack = {
    enabled: true,
    kind: "audio",
    stop: stopTrack,
  } as unknown as MediaStreamTrack;
  const localStream = {
    getTracks: () => [audioTrack],
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => [],
  } as unknown as MediaStream;

  beforeEach(() => {
    stopTrack.mockClear();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([{ kind: "audioinput" }]),
        getUserMedia: vi.fn().mockResolvedValue(localStream),
      },
    });
  });

  it("sends call-hangup before clearing a locally ended call", async () => {
    const { socket } = createFakeSocket();
    const { result } = renderHook(() => useWebRTC(socket, "room-1"));

    await act(async () => result.current.startCall("voice"));
    expect(result.current.callState).toBe("calling");

    act(() => result.current.hangUp());

    expect(socket.emit).toHaveBeenCalledWith("webrtc_signal", {
      room: "room-1",
      signal: { type: "call-hangup" },
    });
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(result.current.callState).toBe("idle");
  });

  it("clears the local call when call-hangup arrives from the peer", async () => {
    const { socket, trigger } = createFakeSocket();
    const { result } = renderHook(() => useWebRTC(socket, "room-1"));

    await act(async () => result.current.startCall("voice"));

    await act(async () => {
      trigger("webrtc_signal", {
        sender_sid: "peer-sid",
        signal: { type: "call-hangup" },
      });
    });

    expect(result.current.callState).toBe("idle");
    expect(stopTrack).toHaveBeenCalledOnce();
  });
});
