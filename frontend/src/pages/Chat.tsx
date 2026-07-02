/**
 * Chat - main page orchestrator
 *
 * Composes all custom hooks and sub-components into a single page.
 * This file intentionally contains NO business logic - that lives in the
 * dedicated hooks under src/hooks/.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import type React from "react";

// ── Sub-components ────────────────────────────────────────────────────────────
import { SearchingScreen } from "../components/chat/features/SearchingScreen";
import { SessionSummary } from "../components/chat/features/SessionSummary";
import { SetupPanel } from "../components/chat/features/SetupPanel";
import { MessageInputBar } from "../components/chat/input/MessageInputBar";
import { ChatHeader } from "../components/chat/layout/ChatHeader";
import ChatWrapper from "../components/chat/layout/ChatWrapper";
import { ConversationTopBar } from "../components/chat/layout/ConversationTopBar";
import { IncomingCallBanner } from "../components/chat/layout/IncomingCallBanner";
import { CallControls } from "../components/chat/media/CallControls";
import { MediaLightbox } from "../components/chat/media/MediaLightbox";
import { MediaPreviewPanel } from "../components/chat/media/MediaPreviewPanel";
import { Layout } from "../components/ui/Layout";
// ── Constants, custom hooks, socket schemas & utils ───────────────────────────
import {
  MIC_HOLD_THRESHOLD_MS,
  TYPING_INDICATOR_TIMEOUT_MS,
  GEOLOCATION_TIMEOUT_MS,
  GEOLOCATION_MAX_AGE_MS,
} from "../constants";
import { useChatMessages } from "../hooks/core/useChatMessages";
import { usePrivateRoom } from "../hooks/core/usePrivateRoom";
import { useRoom } from "../hooks/core/useRoom";
import { useSessionStats } from "../hooks/core/useSessionStats";
import { useSocket } from "../hooks/core/useSocket";
import { useE2EE } from "../hooks/media/useE2EE";
import { useMediaUpload } from "../hooks/media/useMediaUpload";
import { useRecording } from "../hooks/media/useRecording";
import { useWebRTC } from "../hooks/media/useWebRTC";
import { useChatUI } from "../hooks/ui/useChatUI";
import { useContactExchange } from "../hooks/ui/useContactExchange";
import { useNotificationSound } from "../hooks/ui/useNotificationSound";
import { useTitleNotification } from "../hooks/ui/useTitleNotification";
import { usePreferences } from "../hooks/utils/usePreferences";
import {
  vanishToggledSchema,
  screenshotSchema,
  typingSchema,
  rateLimitSchema,
  contactExchangedSchema,
  tabHiddenSchema,
} from "../types/socket.schema";
import { withValidation } from "../utils/socketValidation";

// ─── Socket URL ───────────────────────────────────────────────────────────────

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "https://paiirz.onrender.com/");

// ─── Component ────────────────────────────────────────────────────────────────

const Chat: React.FC = () => {
  // ── Socket ────────────────────────────────────────────────────────────────
  const socket = useSocket(SOCKET_URL);

  // ── Page-local state ──────────────────────────────────────────────────────
  const [, setStatus] = useState("Ustaw filtry i rozpocznij parowanie, aby porozmawiać");
  const [message, setMessage] = useState("");
  const [isStrangerTyping, setIsStrangerTyping] = useState(false);
  const [vanishModeActive, setVanishModeActive] = useState(false);
  const [blockedTimeLeft, setBlockedTimeLeft] = useState(0);

  // Mic hold-to-record refs
  const holdTimeoutRef = useRef<number | null>(null);
  // Tracks whether "typing: true" was already emitted for the current typing burst.
  const isTypingEmittedRef = useRef(false);

  // ── Custom hooks ───────────────────────────────────────────────────────────
  const prefs = usePreferences();
  const { soundsEnabled, setSoundsEnabled, play } = useNotificationSound();
  const { triggerTitleNotification } = useTitleNotification();
  const {
    sessionStats,
    showSummary,
    setShowSummary,
    startSession,
    endSession,
    resetStats,
    incrementSent,
    incrementReceived,
    derived,
  } = useSessionStats();

  const {
    recordingMode,
    recordingTime,
    recordingWave,
    startRecording,
    stopRecording,
    setRecordingMode,
    recordedAudio,
    clearRecordedAudio,
  } = useRecording();

  const contactExchange = useContactExchange();
  const {
    setPartnerWantsToExchange,
    submitContactShare,
    handleContactReceived,
    resetExchangeState,
  } = contactExchange;

  const chatUI = useChatUI();
  const media = useMediaUpload(() => chatUI.setActionsMenuOpen(false));

  /**
   * @description Resets all transient per-session UI state (contact
   * exchange, stats, typing indicator, selected media, open menus, anti-spam
   * countdown, session summary, vanish mode, in-progress recording) so the
   * next room starts from a clean slate.
   */
  const resetSessionUI = useCallback(() => {
    resetExchangeState();
    resetStats();
    setIsStrangerTyping(false);
    media.clearSelectedMedia();
    chatUI.setGamesMenuOpen(false);
    chatUI.setContactMenuOpen(false);
    chatUI.setActionsMenuOpen(false);
    setBlockedTimeLeft(0);
    setShowSummary(false);
    setVanishModeActive(false);
    stopRecording(false);
    // Deliberately narrow deps: `media`, `chatUI`, and `stopRecording` are
    // whole hook-return objects/callbacks that aren't guaranteed referentially
    // stable across renders, and the setState setters (`setIsStrangerTyping`,
    // `setBlockedTimeLeft`, etc.) are stable by React's own guarantee - listing
    // them would just make this callback (and everything that depends on it,
    // like `useRoom`'s `onBeforeJoin`) recreate on every render for no
    // behavioral benefit, since it should only ever run in response to an
    // explicit "start a new session" action, not because some unrelated
    // render happened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetExchangeState, resetStats]);

  // `room` (via useRoom below) composes E2EE reset/key-exchange (useE2EE),
  // chat clearing (useChatMessages) and session-UI reset - all declared
  // further down, but safe to reference here since these callbacks only run
  // in response to later socket events / user actions, never during render.
  const room = useRoom(
    socket,
    prefs,
    setStatus,
    {
      onBeforeJoin: () => {
        resetSessionUI();
        privateRoom.setIsPrivateRoom(false);
      },
      onRoomCreated: (roomId) => {
        chatMessages.clearChat();
        e2ee.resetE2EE();
        e2ee.initiateKeyExchange(roomId);
      },
      onRoomJoined: (roomId) => {
        chatMessages.clearChat();
        e2ee.resetE2EE();
        e2ee.initiateKeyExchange(roomId);
      },
      onBeforeLeave: () => {
        webrtc.endCall();
        resetExchangeState();
      },
      onRoomLeft: (reason) => {
        webrtc.endCall();
        e2ee.resetE2EE();
        play(reason === "blocked" ? "block" : "leave");
        resetExchangeState();
        setIsStrangerTyping(false);
      },
    },
    SOCKET_URL
  );

  const e2ee = useE2EE(socket, room.room, setStatus);

  const chatMessages = useChatMessages(socket, e2ee.sharedKeyRef, {
    play,
    incrementSent,
    incrementReceived,
    triggerTitleNotification,
  });

  const privateRoom = usePrivateRoom(socket, room.setRoom, setStatus, {
    onRoomCreated: (roomId) => {
      chatMessages.clearChat();
      room.setIsStrangerInRoom(false);
      e2ee.resetE2EE();
      e2ee.initiateKeyExchange(roomId);
    },
  });

  const webrtc = useWebRTC(socket, room.room);
  const {
    callState,
    callType,
    incomingCallType,
    isMicMuted,
    isVideoMuted,
    isRemoteMicMuted,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = webrtc;

  // ── Consume recorded audio and send it ────────────────────────────────────
  useEffect(() => {
    if (!recordedAudio || !room.room) return;
    chatMessages
      .sendAudioMessage(e2ee.sharedKeyRef.current, room.room, recordedAudio, vanishModeActive)
      .then(clearRecordedAudio);
    // Deliberately fires only on `recordedAudio` changing (i.e. exactly once
    // per finished recording) - `room.room`/`vanishModeActive` are read as
    // current values at send time, not tracked as retrigger conditions, since
    // re-sending the same clip whenever the room or vanish toggle happens to
    // change would duplicate messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedAudio]);

  // ── Anti-spam countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (blockedTimeLeft <= 0) return;
    const timer = setInterval(() => setBlockedTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [blockedTimeLeft]);

  // ── Session stats lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    if (room.isStrangerInRoom) {
      startSession();
    } else {
      endSession(room.disconnectReason);
    }
    // `startSession`/`endSession` should fire exactly once per
    // isStrangerInRoom transition (entering/leaving a live conversation),
    // not on every render where their own identities happen to change -
    // they're intentionally excluded from deps for that reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.isStrangerInRoom]);

  // ── Tab visibility notification ───────────────────────────────────────────
  useEffect(() => {
    if (!room.room || !socket || !privateRoom.tabNotifyEnabled) return;
    const handleVisibilityChange = () => {
      socket.emit("tab_visibility_change", { room: room.room, hidden: document.hidden });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [room.room, socket, privateRoom.tabNotifyEnabled]);

  // ── Typing indicator emission ─────────────────────────────────────────────
  // Emits "typing: true" only on the idle→typing transition (not on every
  // keystroke) to cut down on redundant socket traffic - the stranger only
  // needs to know typing has started, not be told again on each character.
  useEffect(() => {
    if (!socket || !room.room || !room.isStrangerInRoom) return;

    if (message.trim().length > 0) {
      if (!isTypingEmittedRef.current) {
        isTypingEmittedRef.current = true;
        socket.emit("typing", { room: room.room, typing: true });
      }
      const id = setTimeout(() => {
        isTypingEmittedRef.current = false;
        socket.emit("typing", { room: room.room, typing: false });
      }, TYPING_INDICATOR_TIMEOUT_MS);
      return () => clearTimeout(id);
    }

    if (isTypingEmittedRef.current) {
      isTypingEmittedRef.current = false;
      socket.emit("typing", { room: room.room, typing: false });
    }
    return undefined;
  }, [message, socket, room.room, room.isStrangerInRoom]);

  // ── Before-unload guard ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return "Czy na pewno chcesz opuścić tę stronę?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Screenshot detection ──────────────────────────────────────────────────
  /**
   * @description Notifies the peer that a screenshot was taken (or, for
   * view-once media, that the window/tab was left) and appends a local
   * system message confirming the notification was sent.
   * @param viewOnce - whether this screenshot was of a view-once media item
   */
  const handleScreenshotDetected = useCallback(
    (viewOnce = false) => {
      if (!room.room || !socket) return;
      socket.emit("screenshot_taken", { room: room.room, viewOnce });
      chatMessages.addSystemMessage(
        viewOnce
          ? "Wykonano zrzut ekranu (lub opuszczono okno) zdjęcia jednorazowego. Rozmówca został powiadomiony."
          : "Wykonano zrzut ekranu czatu. Rozmówca został powiadomiony."
      );
    },
    [room.room, socket, chatMessages]
  );

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen";
      const isWinShiftS = e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s");
      const isMacScreenshot = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
      if (isPrintScreen || isWinShiftS || isMacScreenshot) {
        handleScreenshotDetected(false);
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [handleScreenshotDetected]);

  // ── Miscellaneous socket event handlers ───────────────────────────────────
  // Room lifecycle, private-room lifecycle and message events are owned by
  // useRoom/usePrivateRoom/useChatMessages respectively (see above). What's
  // left here are the cross-cutting, page-level concerns: typing indicator,
  // rate-limit warnings, vanish-mode toggling, screenshot/tab notifications,
  // and contact exchange.

  useEffect(() => {
    if (!socket) return;

    const onVanishToggled = ({ sid, active }: { sid: string; active: boolean }) => {
      setVanishModeActive(active);
      if (sid !== socket.id) {
        play("receive");
        chatMessages.addSystemMessage(
          active
            ? "Rozmówca włączył tryb znikających wiadomości. Wiadomości znikną po 5 sekundach."
            : "Rozmówca wyłączył tryb znikających wiadomości."
        );
      }
    };

    const onStrangerScreenshot = ({ viewOnce }: { viewOnce?: boolean } = {}) => {
      play("receive");
      chatMessages.addSystemMessage(
        viewOnce
          ? "Rozmówca wykonał zrzut ekranu (lub opuścił okno) zdjęcia jednorazowego."
          : "Rozmówca wykonał zrzut ekranu czatu."
      );
    };

    const onTyping = ({ sid, typing }: { sid: string; typing: boolean }) => {
      if (sid !== socket.id) setIsStrangerTyping(typing);
    };

    const onRateLimitWarning = ({ duration }: { message: string; duration: number }) => {
      setBlockedTimeLeft(duration);
      play("receive");
      chatMessages.addSystemMessage(`Ograniczenie antyspamowe. Spróbuj ponownie za ${duration} s.`);
    };

    const onPartnerWantsToExchange = () => setPartnerWantsToExchange(true);

    const onContactExchanged = async ({ contact }: { contact: string }) => {
      await handleContactReceived(contact, e2ee.sharedKeyRef.current);
    };

    const onPartnerTabHidden = ({ hidden }: { hidden: boolean }) => {
      chatMessages.addSystemMessage(
        hidden ? "🔕 Rozmówca opuścił kartę przeglądarki." : "🔔 Rozmówca wrócił do karty."
      );
    };

    // Every payload from the network is validated against a Zod schema before
    // it reaches application state - see `utils/socketValidation.ts`. The
    // SAME wrapped function reference must be used for `.on` and `.off`,
    // otherwise the listener would never be cleaned up.

    const validatedOnVanishToggled = withValidation(vanishToggledSchema, onVanishToggled);
    const validatedOnStrangerScreenshot = withValidation(screenshotSchema, onStrangerScreenshot);
    const validatedOnTyping = withValidation(typingSchema, onTyping);
    const validatedOnRateLimitWarning = withValidation(rateLimitSchema, onRateLimitWarning);
    const validatedOnContactExchanged = withValidation(contactExchangedSchema, onContactExchanged);
    const validatedOnPartnerTabHidden = withValidation(tabHiddenSchema, onPartnerTabHidden);

    socket.on("vanish_toggled", validatedOnVanishToggled);
    socket.on("stranger_took_screenshot", validatedOnStrangerScreenshot);
    socket.on("typing", validatedOnTyping);
    socket.on("rate_limit_warning", validatedOnRateLimitWarning);
    socket.on("partner_wants_to_exchange", onPartnerWantsToExchange);
    socket.on("contact_exchanged", validatedOnContactExchanged);
    socket.on("partner_tab_hidden", validatedOnPartnerTabHidden);

    return () => {
      socket.off("vanish_toggled", validatedOnVanishToggled);
      socket.off("stranger_took_screenshot", validatedOnStrangerScreenshot);
      socket.off("typing", validatedOnTyping);
      socket.off("rate_limit_warning", validatedOnRateLimitWarning);
      socket.off("partner_wants_to_exchange", onPartnerWantsToExchange);
      socket.off("contact_exchanged", validatedOnContactExchanged);
      socket.off("partner_tab_hidden", validatedOnPartnerTabHidden);
    };
    // Deliberately depends on `socket` alone (same pattern as the equivalent
    // effects in useRoom/useChatMessages): the handlers close over
    // `chatMessages`/`play`/etc., which aren't stable references, but
    // re-subscribing every time any of them changes identity would mean
    // needlessly detaching and reattaching these listeners on nearly every
    // render instead of once per socket connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // ── Private room actions ───────────────────────────────────────────────────

  /**
   * @description Requests the browser's geolocation, reverse-geocodes the
   * coordinates into a city name via Nominatim, and stores the result in
   * preferences. Surfaces a user-facing error message if geolocation is
   * unsupported, denied, or fails.
   */
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      prefs.setLocationError("Twoja przeglądarka nie obsługuje geolokalizacji.");
      return;
    }
    prefs.setLocationLoading(true);
    prefs.setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        prefs.setUserLat(latitude);
        prefs.setUserLon(longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pl`,
            { headers: { "User-Agent": "paiirz/1.0" } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          prefs.setLocationCity(addr.city ?? addr.town ?? addr.village ?? addr.county ?? "");
        } catch {
          prefs.setLocationCity("");
        }
        prefs.setLocationLoading(false);
      },
      (err) => {
        prefs.setLocationLoading(false);
        if (err.code === 1) prefs.setLocationError("Odmówiono dostępu do lokalizacji.");
        else if (err.code === 2) prefs.setLocationError("Nie udało się ustalić lokalizacji.");
        else prefs.setLocationError("Przekroczono limit czasu wykrywania lokalizacji.");
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_MAX_AGE_MS }
    );
  }, [prefs]);

  // ── Message actions ────────────────────────────────────────────────────────

  /**
   * @description Sends the current message text and/or selected image/video
   * to the stranger. Encrypts the payload end-to-end when a shared key is
   * available (falling back to plaintext otherwise), then clears the
   * composer and selected media afterwards.
   */
  const sendMessage = useCallback(async () => {
    if (!room.room) return;
    await chatMessages.sendMessage(e2ee.sharedKeyRef.current, {
      room: room.room,
      text: message,
      image: media.selectedImage,
      video: media.selectedVideo,
      viewOnce: media.viewOnceChecked,
      vanishing: vanishModeActive,
    });
    setMessage("");
    media.clearSelectedMedia();
  }, [room.room, chatMessages, e2ee.sharedKeyRef, message, media, vanishModeActive]);

  /**
   * @description Ends any active call, reports and blocks the current
   * stranger on the server, and resets the room/chat state so the user can
   * start a fresh search.
   */
  const handleBlockStranger = useCallback(() => {
    if (!room.room || !socket) return;
    endCall();
    socket.emit("block_user", { room: room.room });
    play("block");
    room.setRoom(null);
    room.setIsStrangerInRoom(false);
    setStatus("Zablokowano i zgłoszono rozmówcę 🚫");
    chatMessages.clearChat();
    resetExchangeState();
  }, [room, socket, endCall, play, chatMessages, resetExchangeState]);

  /**
   * @description Toggles "vanishing messages" mode for the current room and
   * notifies the peer with a system message reflecting the new state.
   */
  const handleToggleVanish = useCallback(() => {
    if (!room.isStrangerInRoom || !room.room || !socket) return;
    const next = !vanishModeActive;
    setVanishModeActive(next);
    socket.emit("toggle_vanish", { room: room.room, active: next });
    chatMessages.addSystemMessage(
      next
        ? "Włączono tryb znikających wiadomości. Wiadomości znikną po 5 sekundach."
        : "Wyłączono tryb znikających wiadomości."
    );
  }, [room.isStrangerInRoom, room.room, socket, vanishModeActive, chatMessages]);

  /**
   * @description Starts an icebreaker mini-game ("this or that" / "truth or
   * dare") in the current room, optionally with a custom question/options
   * supplied by the user instead of a randomly drawn one.
   * @param type - which icebreaker game to trigger
   * @param customData - optional custom question/options for the game
   */
  const triggerIcebreaker = useCallback(
    (type: "this_or_that" | "truth_or_dare", customData?: unknown) => {
      if (room.room && socket) {
        socket.emit("trigger_icebreaker", { room: room.room, type, customData });
      }
    },
    [room.room, socket]
  );

  /**
   * @description Shares the current user's contact info with the stranger,
   * encrypting it end-to-end when a shared key is available.
   */
  const handleContactShare = useCallback(async () => {
    if (!socket || !room.room) return;
    await submitContactShare(socket, room.room, e2ee.sharedKeyRef.current);
  }, [socket, room.room, submitContactShare, e2ee.sharedKeyRef]);

  // ── Mic hold-to-record handlers ───────────────────────────────────────────
  // Supports two recording modes: "hold" the button to record while pressed
  // (release to send), or tap-and-release quickly to "lock" recording on
  // (tap again / press Send to finish). MIC_HOLD_THRESHOLD_MS is how long a
  // press must last before it's treated as a hold rather than a quick tap.

  /**
   * @description Starts a timer on mouse/touch down; if the press is held
   * past `MIC_HOLD_THRESHOLD_MS`, begins recording in "holding" mode.
   */
  const handleMicMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!room.isStrangerInRoom || !room.room) return;
    holdTimeoutRef.current = window.setTimeout(() => {
      holdTimeoutRef.current = null;
      setRecordingMode("holding");
      startRecording().catch(() => {});
    }, MIC_HOLD_THRESHOLD_MS);
  };

  /**
   * @description On release: if the hold threshold hadn't fired yet, treats
   * this as a quick tap and starts recording in "locked" mode instead; if
   * already holding, stops and sends the recording.
   */
  const handleMicMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
      setRecordingMode("locked");
      startRecording().catch(() => {});
    } else if (recordingMode === "holding") {
      stopRecording(true);
    }
  };

  /**
   * @description Cancels an in-progress "holding" recording if the pointer
   * leaves the mic button before release.
   */
  const handleMicMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (recordingMode === "holding") stopRecording(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout fullScreen hideHeader hideFooter>
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <ChatHeader
        userCount={room.userCount}
        soundsEnabled={soundsEnabled}
        onToggleSounds={() => setSoundsEnabled(!soundsEnabled)}
      />

      <div className="relative z-10 flex-grow min-h-0 flex flex-col w-full overflow-hidden max-w-5xl mx-auto">
        <div className="flex-grow min-h-0 flex flex-col relative">
          {/* ── Incoming call banner ──────────────────────────────────────────── */}
          <IncomingCallBanner
            callState={callState}
            incomingCallType={incomingCallType}
            onDecline={declineCall}
            onAccept={acceptCall}
          />

          {/* ── Conversation top bar (visible while stranger is in room) ──────── */}
          {room.isStrangerInRoom && (
            <ConversationTopBar
              exchange={contactExchange}
              onContactShare={handleContactShare}
              contactMenuOpen={chatUI.contactMenuOpen}
              onToggleContactMenu={() => chatUI.setContactMenuOpen(!chatUI.contactMenuOpen)}
              callState={callState}
              onStartCall={startCall}
              vanishModeActive={vanishModeActive}
              onToggleVanish={handleToggleVanish}
              onBlockStranger={handleBlockStranger}
            />
          )}

          {/* ── Main content area ─────────────────────────────────────────────── */}

          <AnimatePresence mode="wait">
            {showSummary ? (
              <motion.div
                key="summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-grow flex flex-col min-h-0"
              >
                <SessionSummary
                  sessionStats={sessionStats}
                  formatDuration={derived.formatDuration}
                  calculateWPM={derived.calculateWPM}
                  getTotalSent={derived.getTotalSent}
                  getTotalReceived={derived.getTotalReceived}
                  getDynamicFeedback={derived.getDynamicFeedback}
                  onClose={() => setShowSummary(false)}
                  onNewConversation={() => {
                    setShowSummary(false);
                    room.joinRoom();
                  }}
                />
              </motion.div>
            ) : !room.room ? (
              /* ── Setup panel ──────────────────────────────────────────────── */
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex-grow min-h-0 flex items-start lg:items-center justify-center p-4 z-20 overflow-y-auto overscroll-contain"
              >
                <SetupPanel
                  prefs={prefs}
                  privateRoom={privateRoom}
                  onQuickStart={() => room.joinRoom({ gender: "any", targetGender: "any" })}
                  onSearchWithFilters={() => room.joinRoom()}
                  onDetectLocation={detectLocation}
                />
              </motion.div>
            ) : !room.isStrangerInRoom ? (
              /* ── Searching / waiting screen ───────────────────────────────── */
              <motion.div
                key="searching"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex-grow flex items-center justify-center p-4 z-20"
              >
                <SearchingScreen
                  isPrivateRoom={privateRoom.isPrivateRoom}
                  privateRoomCode={privateRoom.privateRoomCode}
                  onCancel={room.leaveRoom}
                />
              </motion.div>
            ) : (
              /* ── Active chat ──────────────────────────────────────────────── */
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-grow flex flex-col relative min-h-0"
              >
                {/* Call panel */}
                <CallControls
                  callState={callState}
                  callType={callType}
                  isMicMuted={isMicMuted}
                  isVideoMuted={isVideoMuted}
                  isRemoteMicMuted={isRemoteMicMuted}
                  localVideoRef={localVideoRef}
                  remoteVideoRef={remoteVideoRef}
                  onToggleMic={toggleMic}
                  onToggleCamera={toggleCamera}
                  onEndCall={endCall}
                  onCancelOutgoingCall={declineCall}
                />

                <ChatWrapper
                  chat={chatMessages.chat}
                  socket={socket}
                  isStrangerTyping={isStrangerTyping}
                  onSendReaction={(messageId, reaction) =>
                    room.room && chatMessages.sendReaction(room.room, messageId, reaction)
                  }
                  hasExtraBottomPanel={Boolean(media.selectedImage || media.selectedVideo)}
                  onVanishMessage={chatMessages.removeVanishedMessage}
                  onConsumeViewOnce={(messageId) =>
                    room.room && chatMessages.consumeViewOnce(room.room, messageId)
                  }
                  onScreenshotDetected={handleScreenshotDetected}
                  onUnsendMessage={(messageId) =>
                    room.room && chatMessages.unsendMessage(room.room, messageId)
                  }
                  onRemoveMessageForMe={chatMessages.removeMessageForMe}
                  onIcebreakerAction={(messageId, action, actionType) => {
                    if (room.room && socket)
                      socket.emit("action_icebreaker", {
                        room: room.room,
                        messageId,
                        action,
                        actionType,
                      });
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Media preview panel ───────────────────────────────────────────── */}
          <MediaPreviewPanel media={media} />

          {/* ── Anti-spam banner ───────────────────────────────────────────────── */}
          <AnimatePresence>
            {blockedTimeLeft > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ x: "-50%" }}
                className="absolute top-20 left-1/2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.15)] z-50 flex items-center whitespace-nowrap"
              >
                Blokada antyspamowa. Możesz wysłać kolejną wiadomość za{" "}
                <strong className="text-red-300 ml-1">{blockedTimeLeft}</strong> s.
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input bar ─────────────────────────────────────────────────────── */}
          {room.room && room.isStrangerInRoom && (
            <MessageInputBar
              room={room.room}
              isStrangerInRoom={room.isStrangerInRoom}
              onJoinRoom={room.joinRoom}
              onLeaveRoom={room.leaveRoom}
              chatUI={chatUI}
              media={media}
              message={message}
              setMessage={setMessage}
              sendMessage={sendMessage}
              blockedTimeLeft={blockedTimeLeft}
              recording={{ recordingMode, recordingTime, recordingWave, stopRecording }}
              onMicMouseDown={handleMicMouseDown}
              onMicMouseUp={handleMicMouseUp}
              onMicMouseLeave={handleMicMouseLeave}
              onTriggerIcebreaker={triggerIcebreaker}
            />
          )}
        </div>
      </div>

      {/* ── Media lightbox ────────────────────────────────────────────────────── */}
      <MediaLightbox media={media} />
    </Layout>
  );
};

export default Chat;
