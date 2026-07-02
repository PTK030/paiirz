import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useNotificationSound } from "../../../hooks/ui/useNotificationSound";
import {
  playNotificationSound,
  startNotificationLoop,
  stopNotificationLoop,
  unlockSoundEngine,
} from "../../../utils/sound";

vi.mock("../../../utils/sound", () => ({
  playNotificationSound: vi.fn(),
  startNotificationLoop: vi.fn(),
  stopNotificationLoop: vi.fn(),
  unlockSoundEngine: vi.fn(),
}));

describe("useNotificationSound", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("defaults to sounds enabled", () => {
    const { result } = renderHook(() => useNotificationSound());
    expect(result.current.soundsEnabled).toBe(true);
  });

  it("reads initial value from localStorage", () => {
    localStorage.setItem("sounds_enabled", JSON.stringify(false));
    const { result } = renderHook(() => useNotificationSound());
    expect(result.current.soundsEnabled).toBe(false);
  });

  it("setSoundsEnabled persists to localStorage", () => {
    const { result } = renderHook(() => useNotificationSound());
    act(() => result.current.setSoundsEnabled(false));
    expect(result.current.soundsEnabled).toBe(false);
    expect(JSON.parse(localStorage.getItem("sounds_enabled")!)).toBe(false);
  });

  it("play() calls playNotificationSound with current setting", () => {
    const { result } = renderHook(() => useNotificationSound());
    act(() => result.current.play("send"));
    expect(playNotificationSound).toHaveBeenCalledWith("send", true);
  });

  it("play() respects disabled sounds", () => {
    const { result } = renderHook(() => useNotificationSound());
    act(() => result.current.setSoundsEnabled(false));
    act(() => result.current.play("receive"));
    expect(playNotificationSound).toHaveBeenCalledWith("receive", false);
  });

  it("starts a loop using the current preference and can stop it", () => {
    const { result } = renderHook(() => useNotificationSound());
    act(() => result.current.startLoop("incoming_ring"));
    expect(startNotificationLoop).toHaveBeenCalledWith("incoming_ring", true);

    act(() => result.current.stopLoop("incoming_ring"));
    expect(stopNotificationLoop).toHaveBeenCalledWith("incoming_ring");
  });

  it("stops active loops when sounds are disabled", () => {
    const { result } = renderHook(() => useNotificationSound());
    act(() => result.current.setSoundsEnabled(false));
    expect(stopNotificationLoop).toHaveBeenCalled();
  });

  it("unlocks browser audio on the first user gesture", () => {
    renderHook(() => useNotificationSound());
    window.dispatchEvent(new Event("pointerdown"));
    expect(unlockSoundEngine).toHaveBeenCalledOnce();
  });
});
