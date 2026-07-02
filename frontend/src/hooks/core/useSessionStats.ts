import { useState, useCallback } from "react";

import type { SessionStats } from "../../types/message";
import { INITIAL_SESSION_STATS } from "../../types/message";

/** Upper bound applied to the calculated words-per-minute figure (sanity cap). */
const MAX_DISPLAYED_WPM = 250;
/** Sessions shorter than this (minutes) are treated as too short for a meaningful WPM. */
const MIN_MINUTES_FOR_WPM = 0.05;
/** Below this duration (seconds) a session is considered a "quick exchange" for feedback purposes. */
const SHORT_SESSION_SECONDS = 15;
/** Above this duration (seconds) with enough messages, a session is considered "great". */
const LONG_SESSION_SECONDS = 180;
/** Minimum combined message count for a long session to be called "great". */
const LONG_SESSION_MESSAGE_THRESHOLD = 30;
/** Message count above which one-sided conversations trigger "monologue"/"listener" feedback. */
const ONE_SIDED_MESSAGE_THRESHOLD = 10;

/** Derived, read-only statistics computed from the raw {@link SessionStats}. */
export interface SessionStatsDerived {
  formatDuration: () => string;
  calculateWPM: () => number;
  getTotalSent: () => number;
  getTotalReceived: () => number;
  getDynamicFeedback: () => string;
}

/** Return type of {@link useSessionStats}. */
export interface UseSessionStatsReturn {
  sessionStats: SessionStats;
  showSummary: boolean;
  setShowSummary: (v: boolean) => void;
  startSession: () => void;
  endSession: (reason?: "me" | "stranger" | "blocked" | null) => void;
  resetStats: () => void;
  incrementSent: (opts: { text?: number; image?: number; audio?: number; words?: number }) => void;
  incrementReceived: (opts: { text?: number; image?: number; audio?: number }) => void;
  derived: SessionStatsDerived;
}

/**
 * @description Tracks message/word counters for the current chat session and
 * derives human-facing summary stats (duration, WPM, feedback text) from them.
 * Counters are only ever incremented by the caller (`Chat.tsx`) as
 * messages are sent/received; this hook does not talk to the socket itself.
 * @returns Raw session stats, session lifecycle actions, and derived getters.
 */
export function useSessionStats(): UseSessionStatsReturn {
  const [sessionStats, setSessionStats] = useState<SessionStats>(INITIAL_SESSION_STATS);
  const [showSummary, setShowSummary] = useState(false);

  /** @description Resets and starts a new session, recording the current time as `startTime`. */
  const startSession = useCallback(() => {
    setSessionStats({
      ...INITIAL_SESSION_STATS,
      startTime: Date.now(),
    });
    setShowSummary(false);
  }, []);

  /** @description Marks the session as ended (idempotent) and reveals the summary screen. */
  const endSession = useCallback((reason: "me" | "stranger" | "blocked" | null = null) => {
    setSessionStats((prev) => {
      if (prev.startTime && !prev.endTime) {
        setShowSummary(true);
        return { ...prev, endTime: Date.now(), disconnectedBy: reason };
      }
      return prev;
    });
  }, []);

  /** @description Clears all counters and hides the summary screen. */
  const resetStats = useCallback(() => {
    setSessionStats(INITIAL_SESSION_STATS);
    setShowSummary(false);
  }, []);

  /** @description Adds to the "sent" counters. Omitted fields are treated as zero. */
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

  /** @description Adds to the "received" counters. Omitted fields are treated as zero. */
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

  /** @description Formats the session duration as `m:ss`, or `"0:00"` if the session hasn't ended. */
  const formatDuration = useCallback(() => {
    if (!sessionStats.startTime || !sessionStats.endTime) return "0:00";
    const diffMs = sessionStats.endTime - sessionStats.startTime;
    const diffSecs = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSecs / 60);
    const seconds = diffSecs % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }, [sessionStats.startTime, sessionStats.endTime]);

  /** @description Computes sent words-per-minute, capped at {@link MAX_DISPLAYED_WPM}. */
  const calculateWPM = useCallback(() => {
    if (!sessionStats.startTime || !sessionStats.endTime) return 0;
    const diffMs = sessionStats.endTime - sessionStats.startTime;
    const diffMins = diffMs / 1000 / 60;
    if (diffMins <= MIN_MINUTES_FOR_WPM) return 0;
    return Math.min(Math.round(sessionStats.sentWordCount / diffMins), MAX_DISPLAYED_WPM);
  }, [sessionStats.startTime, sessionStats.endTime, sessionStats.sentWordCount]);

  /** @description Sums all "sent" message counters (text + audio + image). */
  const getTotalSent = useCallback(
    () => sessionStats.sentTextCount + sessionStats.sentAudioCount + sessionStats.sentImageCount,
    [sessionStats.sentTextCount, sessionStats.sentAudioCount, sessionStats.sentImageCount]
  );

  /** @description Sums all "received" message counters (text + audio + image). */
  const getTotalReceived = useCallback(
    () =>
      sessionStats.receivedTextCount +
      sessionStats.receivedAudioCount +
      sessionStats.receivedImageCount,
    [
      sessionStats.receivedTextCount,
      sessionStats.receivedAudioCount,
      sessionStats.receivedImageCount,
    ]
  );

  /**
   * @description Produces a short, human-readable (Polish) summary of how the
   * conversation went, based on its duration and message balance.
   * @returns A feedback sentence for the session summary screen.
   */
  const getDynamicFeedback = useCallback(() => {
    if (!sessionStats.startTime || !sessionStats.endTime) return "Brak danych o rozmowie.";
    const durationSec = Math.floor((sessionStats.endTime - sessionStats.startTime) / 1000);
    const totalSent = getTotalSent();
    const totalReceived = getTotalReceived();

    if (sessionStats.disconnectedBy === "blocked") {
      return "Rozmówca został zablokowany. Bezpieczeństwo przede wszystkim!";
    }

    if (durationSec < SHORT_SESSION_SECONDS) {
      if (totalReceived === 0) {
        if (sessionStats.disconnectedBy === "me") return "Zakończyłeś rozmowę, zanim się zaczęła.";
        return "Obcy uciekł bez słowa... Szkoda czasu!";
      }
      return "Szybka wymiana zdań i po krzyku.";
    }
    if (
      durationSec > LONG_SESSION_SECONDS &&
      totalSent + totalReceived > LONG_SESSION_MESSAGE_THRESHOLD
    ) {
      return "Świetna rozmowa! Wymieniliście sporo wiadomości.";
    }
    if (totalSent > ONE_SIDED_MESSAGE_THRESHOLD && totalReceived === 0) {
      return "Monolog? Chyba mówiłeś tylko Ty...";
    }
    if (totalReceived > ONE_SIDED_MESSAGE_THRESHOLD && totalSent === 0) {
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
