import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  disposeSoundEngine,
  playNotificationSound,
  startNotificationLoop,
  stopNotificationLoop,
} from "../../utils/sound";

describe("playNotificationSound", () => {
  let mockCtx: {
    createOscillator: ReturnType<typeof vi.fn>;
    createGain: ReturnType<typeof vi.fn>;
    destination: object;
    currentTime: number;
    state: string;
    close: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
  };
  let mockOsc: {
    type: string;
    frequency: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let mockGain: {
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    disposeSoundEngine();
    mockOsc = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    mockCtx = {
      createOscillator: vi.fn().mockReturnValue(mockOsc),
      createGain: vi.fn().mockReturnValue(mockGain),
      destination: {},
      currentTime: 0,
      state: "running",
      close: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal(
      "AudioContext",
      vi.fn().mockImplementation(function () {
        return mockCtx;
      })
    );
    vi.useFakeTimers();
  });

  it("does nothing when soundsEnabled is false", () => {
    playNotificationSound("send", false);
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it("does nothing when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);
    expect(() => playNotificationSound("send", true)).not.toThrow();
  });

  it("plays send sound", () => {
    playNotificationSound("send", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
    expect(mockOsc.start).toHaveBeenCalledOnce();
    expect(mockOsc.stop).toHaveBeenCalledOnce();
  });

  it("plays receive sound as two scheduled notes", () => {
    playNotificationSound("receive", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("plays match sound as four scheduled notes", () => {
    playNotificationSound("match", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it("plays leave sound (two notes)", () => {
    playNotificationSound("leave", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("plays invite sound", () => {
    playNotificationSound("invite", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("plays game_start sound", () => {
    playNotificationSound("game_start", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
  });

  it("plays block sound", () => {
    playNotificationSound("block", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
  });

  it("does not throw if AudioContext constructor throws", () => {
    vi.stubGlobal(
      "AudioContext",
      vi.fn().mockImplementation(function () {
        throw new Error("unavailable");
      })
    );
    expect(() => playNotificationSound("send", true)).not.toThrow();
  });

  it("reuses one AudioContext across sounds", () => {
    playNotificationSound("send", true);
    playNotificationSound("block", true);
    expect(AudioContext).toHaveBeenCalledOnce();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("resumes a suspended AudioContext", () => {
    mockCtx.state = "suspended";
    playNotificationSound("send", true);
    expect(mockCtx.resume).toHaveBeenCalledOnce();
  });

  it("starts and stops a repeating ringtone", () => {
    startNotificationLoop("incoming_ring", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1800);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4);
    stopNotificationLoop("incoming_ring");
    vi.advanceTimersByTime(1800);
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it("does not start a ringtone when sounds are disabled", () => {
    startNotificationLoop("incoming_ring", false);
    vi.advanceTimersByTime(1800);
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it("falls back to webkitAudioContext when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal(
      "webkitAudioContext",
      vi.fn().mockImplementation(function () {
        return mockCtx;
      })
    );
    playNotificationSound("send", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
  });

  it("does nothing in SSR environment where window is undefined", () => {
    const origWindow = globalThis.window;
    // Simulate SSR by temporarily hiding window
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(() => playNotificationSound("send", true)).not.toThrow();

    // Restore
    Object.defineProperty(globalThis, "window", {
      value: origWindow,
      writable: true,
      configurable: true,
    });
  });
});
