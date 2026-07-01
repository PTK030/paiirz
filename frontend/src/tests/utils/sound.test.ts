import { describe, it, expect, vi, beforeEach } from "vitest";
import { playNotificationSound } from "../../utils/sound";

describe("playNotificationSound", () => {
  let mockCtx: {
    createOscillator: ReturnType<typeof vi.fn>;
    createGain: ReturnType<typeof vi.fn>;
    destination: object;
    currentTime: number;
    state: string;
    close: ReturnType<typeof vi.fn>;
  };
  let mockOsc: {
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  let mockGain: {
    gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
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
      close: vi.fn(),
    };

    vi.stubGlobal("AudioContext", vi.fn().mockImplementation(() => mockCtx));
    vi.useFakeTimers();
  });

  it("does nothing when soundsEnabled is false", () => {
    playNotificationSound("send", false);
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it("does nothing when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext = undefined;
    expect(() => playNotificationSound("send", true)).not.toThrow();
  });

  it("plays send sound", () => {
    playNotificationSound("send", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
    expect(mockOsc.start).toHaveBeenCalledOnce();
    expect(mockOsc.stop).toHaveBeenCalledOnce();
  });

  it("plays receive sound (two notes with setTimeout)", () => {
    playNotificationSound("receive", true);
    expect(mockOsc.start).toHaveBeenCalledOnce();
    vi.runAllTimers();
    // second oscillator created via setTimeout
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("plays match sound (four notes staggered)", () => {
    playNotificationSound("match", true);
    vi.runAllTimers();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4);
  });

  it("plays leave sound (two notes)", () => {
    playNotificationSound("leave", true);
    vi.runAllTimers();
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("plays invite sound", () => {
    playNotificationSound("invite", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
  });

  it("plays game_start sound", () => {
    playNotificationSound("game_start", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
  });

  it("plays block sound", () => {
    playNotificationSound("block", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
  });

  it("does not throw if AudioContext constructor throws", () => {
    vi.stubGlobal("AudioContext", vi.fn().mockImplementation(() => { throw new Error("unavailable"); }));
    expect(() => playNotificationSound("send", true)).not.toThrow();
  });

  it("skips second note in 'receive' when context is closed", () => {
    playNotificationSound("receive", true);
    // Close context before setTimeout fires
    mockCtx.state = "closed";
    vi.runAllTimers();
    // Only the first oscillator should be created (second skipped due to closed state)
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
  });

  it("skips staggered notes in 'match' when context is closed", () => {
    playNotificationSound("match", true);
    // All notes use setTimeout - close context before any timer fires
    mockCtx.state = "closed";
    vi.runAllTimers();
    // All callbacks see closed state and skip oscillator creation
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it("skips staggered notes in 'leave' when context is closed", () => {
    playNotificationSound("leave", true);
    // All notes use setTimeout - close context before any timer fires
    mockCtx.state = "closed";
    vi.runAllTimers();
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it("falls back to webkitAudioContext when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext =
      vi.fn().mockImplementation(() => mockCtx);
    playNotificationSound("send", true);
    expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
  });

  it("does nothing in SSR environment where window is undefined", () => {
    // Save original window
    const originalWindow = global.window;
    // @ts-expect-error - testing SSR guard
    delete global.window;

    expect(() => playNotificationSound("send", true)).not.toThrow();

    // Restore window
    global.window = originalWindow;
  });
});
