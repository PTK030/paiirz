import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionStats } from "../../hooks/useSessionStats";

describe("useSessionStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("initialises with empty stats", () => {
    const { result } = renderHook(() => useSessionStats());
    expect(result.current.sessionStats.sentTextCount).toBe(0);
    expect(result.current.sessionStats.startTime).toBeNull();
    expect(result.current.showSummary).toBe(false);
  });

  it("startSession sets startTime and clears previous stats", () => {
    const now = 1700000000000;
    vi.setSystemTime(now);
    const { result } = renderHook(() => useSessionStats());
    act(() => result.current.startSession());
    expect(result.current.sessionStats.startTime).toBe(now);
    expect(result.current.sessionStats.sentTextCount).toBe(0);
    expect(result.current.showSummary).toBe(false);
  });

  it("endSession sets endTime and shows summary", () => {
    vi.setSystemTime(1700000000000);
    const { result } = renderHook(() => useSessionStats());
    act(() => result.current.startSession());
    vi.setSystemTime(1700000060000); // 60 seconds later
    act(() => result.current.endSession());
    expect(result.current.sessionStats.endTime).toBe(1700000060000);
    expect(result.current.showSummary).toBe(true);
  });

  it("endSession does nothing if session never started", () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => result.current.endSession());
    expect(result.current.sessionStats.endTime).toBeNull();
    expect(result.current.showSummary).toBe(false);
  });

  it("incrementSent updates sent counters", () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => result.current.incrementSent({ text: 1, words: 5 }));
    expect(result.current.sessionStats.sentTextCount).toBe(1);
    expect(result.current.sessionStats.sentWordCount).toBe(5);
    expect(result.current.sessionStats.sentImageCount).toBe(0);
  });

  it("incrementReceived updates received counters", () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => result.current.incrementReceived({ text: 2, image: 1 }));
    expect(result.current.sessionStats.receivedTextCount).toBe(2);
    expect(result.current.sessionStats.receivedImageCount).toBe(1);
    expect(result.current.sessionStats.receivedAudioCount).toBe(0);
  });

  it("incrementReceived defaults missing fields to 0", () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => result.current.incrementReceived({}));
    expect(result.current.sessionStats.receivedTextCount).toBe(0);
    expect(result.current.sessionStats.receivedImageCount).toBe(0);
    expect(result.current.sessionStats.receivedAudioCount).toBe(0);
  });

  it("resetStats clears everything", () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => {
      result.current.startSession();
      result.current.incrementSent({ text: 3 });
    });
    act(() => result.current.resetStats());
    expect(result.current.sessionStats.sentTextCount).toBe(0);
    expect(result.current.sessionStats.startTime).toBeNull();
    expect(result.current.showSummary).toBe(false);
  });

  describe("derived.formatDuration", () => {
    it("returns 0:00 when no session", () => {
      const { result } = renderHook(() => useSessionStats());
      expect(result.current.derived.formatDuration()).toBe("0:00");
    });

    it("formats 90 seconds as 1:30", () => {
      vi.setSystemTime(1000); // non-zero so startTime is truthy
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      vi.setSystemTime(91000); // 90 s later
      act(() => result.current.endSession());
      expect(result.current.derived.formatDuration()).toBe("1:30");
    });

    it("pads seconds below 10", () => {
      vi.setSystemTime(1000); // non-zero so startTime is truthy
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      vi.setSystemTime(66000); // 65 s later
      act(() => result.current.endSession());
      expect(result.current.derived.formatDuration()).toBe("1:05");
    });
  });

  describe("derived.calculateWPM", () => {
    it("returns 0 when session is shorter than 3 seconds", () => {
      vi.setSystemTime(0);
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      vi.setSystemTime(2000); // 2 seconds
      act(() => result.current.endSession());
      expect(result.current.derived.calculateWPM()).toBe(0);
    });

    it("returns 0 when session is exactly 3 seconds (diffMins <= 0.05)", () => {
      vi.setSystemTime(1000);
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      act(() => result.current.incrementSent({ words: 10 }));
      vi.setSystemTime(4000); // exactly 3000ms later -> 3s -> 0.05 mins
      act(() => result.current.endSession());
      expect(result.current.derived.calculateWPM()).toBe(0);
    });

    it("calculates WPM correctly for 60 words in 60 seconds", () => {
      vi.setSystemTime(1000); // non-zero so startTime is truthy
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      act(() => result.current.incrementSent({ words: 60 }));
      vi.setSystemTime(61000); // 60 s later
      act(() => result.current.endSession());
      expect(result.current.derived.calculateWPM()).toBe(60);
    });
  });

  describe("derived.getTotalSent / getTotalReceived", () => {
    it("sums all sent message types", () => {
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.incrementSent({ text: 2, image: 3, audio: 1 }));
      expect(result.current.derived.getTotalSent()).toBe(6);
    });

    it("sums all received message types", () => {
      const { result } = renderHook(() => useSessionStats());
      act(() =>
        result.current.incrementReceived({ text: 1, image: 2, audio: 4 }),
      );
      expect(result.current.derived.getTotalReceived()).toBe(7);
    });
  });

  describe("derived.getDynamicFeedback", () => {
    it("returns 'Brak danych' when no session", () => {
      const { result } = renderHook(() => useSessionStats());
      expect(result.current.derived.getDynamicFeedback()).toBe(
        "Brak danych o rozmowie.",
      );
    });

    it("returns quick-chat message for short session with received messages", () => {
      vi.setSystemTime(1000); // non-zero so startTime is truthy
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      act(() => result.current.incrementReceived({ text: 1 }));
      vi.setSystemTime(11000); // 10 s later (< 15 s)
      act(() => result.current.endSession());
      expect(result.current.derived.getDynamicFeedback()).toBe(
        "Szybka wymiana zdań i po krzyku.",
      );
    });

    it("returns 'uciekł' message for short session with no received messages", () => {
      vi.setSystemTime(1000); // non-zero so startTime is truthy
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      vi.setSystemTime(11000); // 10 s later (< 15 s)
      act(() => result.current.endSession());
      expect(result.current.derived.getDynamicFeedback()).toBe(
        "Obcy uciekł bez słowa... Szkoda czasu!",
      );
    });

    it("returns great conversation message for long active session", () => {
      vi.setSystemTime(1000); // non-zero so startTime is truthy
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      act(() => result.current.incrementSent({ text: 20 }));
      act(() => result.current.incrementReceived({ text: 20 }));
      vi.setSystemTime(201000); // 200 s later (> 180 s, sent+received = 40 > 30)
      act(() => result.current.endSession());
      expect(result.current.derived.getDynamicFeedback()).toBe(
        "Świetna rozmowa! Wymieniliście sporo wiadomości.",
      );
    });

    it("returns monolog message when only sending (sent > 10, received === 0)", () => {
      vi.setSystemTime(1000);
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      act(() => result.current.incrementSent({ text: 15 }));
      vi.setSystemTime(31000); // 30 s (> 15 s, not short)
      act(() => result.current.endSession());
      expect(result.current.derived.getDynamicFeedback()).toBe(
        "Monolog? Chyba mówiłeś tylko Ty...",
      );
    });

    it("returns listener message when only receiving (received > 10, sent === 0)", () => {
      vi.setSystemTime(1000);
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      act(() => result.current.incrementReceived({ text: 15 }));
      vi.setSystemTime(31000); // 30 s (> 15 s, not short)
      act(() => result.current.endSession());
      expect(result.current.derived.getDynamicFeedback()).toBe(
        "Ciekawy słuchacz z Ciebie - nic nie napisałeś!",
      );
    });

    it("returns default feedback for a normal mid-length session", () => {
      vi.setSystemTime(1000);
      const { result } = renderHook(() => useSessionStats());
      act(() => result.current.startSession());
      act(() => result.current.incrementSent({ text: 5 }));
      act(() => result.current.incrementReceived({ text: 5 }));
      vi.setSystemTime(61000); // 60 s - medium session, < 30 total messages
      act(() => result.current.endSession());
      expect(result.current.derived.getDynamicFeedback()).toBe(
        "Ciekawa pogawędka. Może kolejny obcy będzie jeszcze lepszy?",
      );
    });
  });
});
