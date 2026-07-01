import { useState, useCallback } from "react";
import type { SessionStats } from "../types/message";
import { INITIAL_SESSION_STATS } from "../types/message";

export interface SessionStatsDerived {
  formatDuration: () => string;
  calculateWPM: () => number;
  getTotalSent: () => number;
  getTotalReceived: () => number;
  getDynamicFeedback: () => string;
}

export interface UseSessionStatsReturn {
  sessionStats: SessionStats;
  showSummary: boolean;
  setShowSummary: (v: boolean) => void;
  startSession: () => void;
  endSession: () => void;
  resetStats: () => void;
  incrementSent: (opts: { text?: number; image?: number; audio?: number; words?: number }) => void;
  incrementReceived: (opts: { text?: number; image?: number; audio?: number }) => void;
  derived: SessionStatsDerived;
}

export function useSessionStats(): UseSessionStatsReturn {
  const [sessionStats, setSessionStats] = useState<SessionStats>(INITIAL_SESSION_STATS);
  const [showSummary, setShowSummary] = useState(false);

  const startSession = useCallback(() => {
    setSessionStats({
      ...INITIAL_SESSION_STATS,
      startTime: Date.now(),
    });
    setShowSummary(false);
  }, []);

  const endSession = useCallback(() => {
    setSessionStats((prev) => {
      if (prev.startTime && !prev.endTime) {
        setShowSummary(true);
        return { ...prev, endTime: Date.now() };
      }
      return prev;
    });
  }, []);

  const resetStats = useCallback(() => {
    setSessionStats(INITIAL_SESSION_STATS);
    setShowSummary(false);
  }, []);

  const incrementSent = useCallback(
    (opts: { text?: number; image?: number; audio?: number; words?: number }) => {
      setSessionStats((prev) => ({
        ...prev,
        sentTextCount: prev.sentTextCount + (opts.text ?? 0),
        sentImageCount: prev.sentImageCount + (opts.image ?? 0),
        sentAudioCount: prev.sentAudioCount + (opts.audio ?? 0),
        sentWordCount: prev.sentWordCount + (opts.words ?? 0),
      }));
    },
    []
  );

  const incrementReceived = useCallback(
    (opts: { text?: number; image?: number; audio?: number }) => {
      setSessionStats((prev) => ({
        ...prev,
        receivedTextCount: prev.receivedTextCount + (opts.text ?? 0),
        receivedImageCount: prev.receivedImageCount + (opts.image ?? 0),
        receivedAudioCount: prev.receivedAudioCount + (opts.audio ?? 0),
      }));
    },
    []
  );

  // ── Derived computations ──────────────────────────────────────────────────

  const formatDuration = useCallback(() => {
    if (!sessionStats.startTime || !sessionStats.endTime) return "0:00";
    const diffMs = sessionStats.endTime - sessionStats.startTime;
    const diffSecs = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSecs / 60);
    const seconds = diffSecs % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }, [sessionStats.startTime, sessionStats.endTime]);

  const calculateWPM = useCallback(() => {
    if (!sessionStats.startTime || !sessionStats.endTime) return 0;
    const diffMs = sessionStats.endTime - sessionStats.startTime;
    const diffMins = diffMs / 1000 / 60;
    if (diffMins <= 0.05) return 0;
    return Math.min(Math.round(sessionStats.sentWordCount / diffMins), 250);
  }, [sessionStats.startTime, sessionStats.endTime, sessionStats.sentWordCount]);

  const getTotalSent = useCallback(
    () =>
      sessionStats.sentTextCount +
      sessionStats.sentAudioCount +
      sessionStats.sentImageCount,
    [sessionStats.sentTextCount, sessionStats.sentAudioCount, sessionStats.sentImageCount]
  );

  const getTotalReceived = useCallback(
    () =>
      sessionStats.receivedTextCount +
      sessionStats.receivedAudioCount +
      sessionStats.receivedImageCount,
    [sessionStats.receivedTextCount, sessionStats.receivedAudioCount, sessionStats.receivedImageCount]
  );

  const getDynamicFeedback = useCallback(() => {
    if (!sessionStats.startTime || !sessionStats.endTime)
      return "Brak danych o rozmowie.";
    const durationSec = Math.floor(
      (sessionStats.endTime - sessionStats.startTime) / 1000
    );
    const totalSent = getTotalSent();
    const totalReceived = getTotalReceived();

    if (durationSec < 15) {
      if (totalReceived === 0) return "Obcy uciekł bez słowa... Szkoda czasu!";
      return "Szybka wymiana zdań i po krzyku.";
    }
    if (durationSec > 180 && totalSent + totalReceived > 30) {
      return "Świetna rozmowa! Wymieniliście sporo wiadomości.";
    }
    if (totalSent > 10 && totalReceived === 0) {
      return "Monolog? Chyba mówiłeś tylko Ty...";
    }
    if (totalReceived > 10 && totalSent === 0) {
      return "Ciekawy słuchacz z Ciebie - nic nie napisałeś!";
    }
    return "Ciekawa pogawędka. Może kolejny obcy będzie jeszcze lepszy?";
  }, [sessionStats.startTime, sessionStats.endTime, getTotalSent, getTotalReceived]);

  return {
    sessionStats,
    showSummary,
    setShowSummary,
    startSession,
    endSession,
    resetStats,
    incrementSent,
    incrementReceived,
    derived: {
      formatDuration,
      calculateWPM,
      getTotalSent,
      getTotalReceived,
      getDynamicFeedback,
    },
  };
}
