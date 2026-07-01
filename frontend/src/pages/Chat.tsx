/**
 * Chat - main page orchestrator
 *
 * Composes all custom hooks and sub-components into a single page.
 * This file intentionally contains NO business logic - that lives in the
 * dedicated hooks under src/hooks/.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefObject,
} from "react";
import io, { type Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  BsMic,
  BsTrash,
  BsCameraVideo,
  BsTelephone,
  BsTelephoneX,
  BsCameraVideoOff,
  BsMicMute,
  BsImage,
  BsFilm,
} from "react-icons/bs";

// ── UI primitives ──────────────────────────────────────────────────────────────
import { Layout } from "../components/ui/Layout";

// ── Sub-components ────────────────────────────────────────────────────────────
import { ChatHeader } from "../components/chat/ChatHeader";
import { SessionSummary } from "../components/chat/SessionSummary";
import { GamesMenu } from "../components/chat/GamesMenu";
import ChatInput from "../components/ChatInput";
import ChatWrapper from "../components/ChatWrapper";
import NewRoom from "../components/NewRoom";
import SendButton from "../components/SendButton";
import { CustomVideoPlayer } from "../components/CustomVideoPlayer";

import { DualRangeSlider } from "../components/ui/DualRangeSlider";
import { LocationAutocomplete } from "../components/LocationAutocomplete";
// ── Custom hooks ──────────────────────────────────────────────────────────────
import { useWebRTC } from "../hooks/useWebRTC";
import { useE2EE } from "../hooks/useE2EE";
import { usePreferences } from "../hooks/usePreferences";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { useTitleNotification } from "../hooks/useTitleNotification";
import { useSessionStats } from "../hooks/useSessionStats";
import { useRecording } from "../hooks/useRecording";
import { useContactExchange } from "../hooks/useContactExchange";

// ── Utilities & types ─────────────────────────────────────────────────────────
import {
  encrypt,
  encryptBinary,
  decrypt,
  decryptBinary,
} from "../utils/crypto";
import { generateRoomCode } from "../utils/roomCode";
import type { Message } from "../types/message";

// ─── Socket URL ───────────────────────────────────────────────────────────────

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://paiirz.onrender.com/");

// ─── Component ────────────────────────────────────────────────────────────────

const Chat: React.FC = () => {
  // ── Socket ────────────────────────────────────────────────────────────────
  const [socket, setSocket] = useState<Socket | null>(null);

  // ── Room state ────────────────────────────────────────────────────────────
  const [room, setRoom] = useState<string | null>(null);
  const [isStrangerInRoom, setIsStrangerInRoom] = useState(false);
  const [, setStatus] = useState(
    "Ustaw filtry i rozpocznij parowanie, aby porozmawiać",
  );
  const [chat, setChat] = useState<Message[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isStrangerTyping, setIsStrangerTyping] = useState(false);
  const [vanishModeActive, setVanishModeActive] = useState(false);
  const [blockedTimeLeft, setBlockedTimeLeft] = useState(0);

  // Private room state
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [privateRoomCode, setPrivateRoomCode] = useState("");
  const [privateRoomInputCode, setPrivateRoomInputCode] = useState("");
  const [privateRoomError, setPrivateRoomError] = useState<string | null>(null);
  const [privateRoomMode, setPrivateRoomMode] = useState<
    null | "create" | "join"
  >(null);
  const [noScreenshots, setNoScreenshots] = useState(false);
  const [notifyOnTabLeave, setNotifyOnTabLeave] = useState(false);
  const [tabNotifyEnabled, setTabNotifyEnabled] = useState(false);

  // Media state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [viewOnceChecked, setViewOnceChecked] = useState(false);
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState(false);

  // UI menus
  const [gamesMenuOpen, setGamesMenuOpen] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  // Mic hold-to-record refs
  const holdTimeoutRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Current room ref - allows async callbacks to read the latest room id
  const currentRoomRef = useRef<string | null>(null);

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

  const { e2eReady, sharedKeyRef, resetE2EE, initiateKeyExchange } = useE2EE(
    socket,
    room,
    setStatus,
  );

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

  const {
    exchangeState,
    setExchangeState,
    myContact,
    setMyContact,
    partnerContact,
    partnerWantsToExchange,
    setPartnerWantsToExchange,
    submitContactShare,
    handleContactReceived,
    resetExchangeState,
  } = useContactExchange();

  const {
    callState,
    callType,
    incomingCallType,
    isMicMuted,
    isVideoMuted,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useWebRTC(socket, room);

  // ── Socket initialisation ──────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  // Keep currentRoomRef in sync
  useEffect(() => {
    currentRoomRef.current = room;
  }, [room]);

  // ── Consume recorded audio and send it ────────────────────────────────────
  useEffect(() => {
    if (!recordedAudio || !room || !socket) return;

    const sendAudio = async () => {
      const msgId = crypto.randomUUID();
      let audioPayload = recordedAudio;
      let e2eMeta: { iv: string } | undefined;

      const sharedKey = sharedKeyRef.current;
      if (sharedKey) {
        try {
          const p = await encryptBinary(sharedKey, recordedAudio);
          audioPayload = p.ct;
          e2eMeta = { iv: p.iv };
        } catch (err) {
          console.error("[E2EE] Audio encryption failed:", err);
        }
      }

      const newMsg: Message = {
        id: msgId,
        sid: socket.id ?? "",
        audio: recordedAudio,
        reactions: {},
        vanishing: vanishModeActive || undefined,
      };

      setChat((prev) => [...prev, newMsg]);
      socket.emit("message", {
        room,
        id: msgId,
        audio: audioPayload,
        vanishing: vanishModeActive || undefined,
        e2e: e2eMeta,
      });
      incrementSent({ audio: 1 });
      play("send");
      clearRecordedAudio();
    };

    sendAudio();
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
    if (isStrangerInRoom) {
      startSession();
    } else {
      endSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStrangerInRoom]);

  // ── Tab visibility notification ───────────────────────────────────────────
  useEffect(() => {
    if (!room || !socket || !tabNotifyEnabled) return;
    const handleVisibilityChange = () => {
      socket.emit("tab_visibility_change", { room, hidden: document.hidden });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [room, socket, tabNotifyEnabled]);

  // ── Typing indicator emission ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !room || !isStrangerInRoom) return;
    if (message.trim().length > 0) {
      socket.emit("typing", { room, typing: true });
      const id = setTimeout(
        () => socket.emit("typing", { room, typing: false }),
        1500,
      );
      return () => clearTimeout(id);
    } else {
      socket.emit("typing", { room, typing: false });
    }
  }, [message, socket, room, isStrangerInRoom]);

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
  const handleScreenshotDetected = useCallback(
    (viewOnce = false) => {
      if (!room || !socket) return;
      socket.emit("screenshot_taken", { room, viewOnce });
      setChat((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: viewOnce
            ? "Wykonano zrzut ekranu (lub opuszczono okno) zdjęcia jednorazowego. Rozmówca został powiadomiony."
            : "Wykonano zrzut ekranu czatu. Rozmówca został powiadomiony.",
          reactions: {},
        },
      ]);
    },
    [room, socket],
  );

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen";
      const isWinShiftS =
        e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s");
      const isMacScreenshot =
        e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
      if (isPrintScreen || isWinShiftS || isMacScreenshot) {
        handleScreenshotDetected(false);
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [handleScreenshotDetected]);

  // ── Dropdown outside-click handler ───────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (contactMenuOpen && !target.closest(".contact-exchange-container"))
        setContactMenuOpen(false);
      if (gamesMenuOpen && !target.closest(".games-menu-container"))
        setGamesMenuOpen(false);
      if (actionsMenuOpen && !target.closest(".actions-menu-container"))
        setActionsMenuOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contactMenuOpen, gamesMenuOpen, actionsMenuOpen]);

  // ── Socket event handlers ─────────────────────────────────────────────────

  // Helper: reset all transient UI state between sessions
  const resetSessionUI = useCallback(() => {
    resetExchangeState();
    resetStats();
    setIsStrangerTyping(false);
    setSelectedImage(null);
    setSelectedVideo(null);
    setGamesMenuOpen(false);
    setContactMenuOpen(false);
    setActionsMenuOpen(false);
    setBlockedTimeLeft(0);
    setShowSummary(false);
    setVanishModeActive(false);
    setViewOnceChecked(false);
    stopRecording(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetExchangeState, resetStats]);

  useEffect(() => {
    if (!socket) return;

    // ── Room lifecycle ──────────────────────────────────────────────────────

    const onRoomCreated = (roomId: string) => {
      currentRoomRef.current = roomId;
      setRoom(roomId);
      setChat([]);
      setIsStrangerInRoom(false);
      setStatus("Szukanie nowego rozmówcy");
      resetE2EE();
      initiateKeyExchange(roomId);
    };

    const onRoomJoined = ({ room: roomId }: { room: string; sid: string }) => {
      currentRoomRef.current = roomId;
      setRoom(roomId);
      setChat([]);
      setIsStrangerInRoom(true);
      setStatus("Nawiązywanie bezpiecznego połączenia E2E…");
      resetE2EE();
      initiateKeyExchange(roomId);
    };

    const onRoomLeft = (reason?: string) => {
      endCall();
      setRoom(null);
      setIsStrangerInRoom(false);
      resetE2EE();
      if (reason === "blocked") {
        setStatus("Rozmówca został zablokowany i zgłoszony");
        play("block");
      } else {
        setStatus("Rozmówca rozłączył się");
        play("leave");
      }
      resetExchangeState();
      setIsStrangerTyping(false);
    };

    // ── Message events ──────────────────────────────────────────────────────

    const onMessage = async (data: Message) => {
      if (data.sid === socket.id) return;

      const decrypted = { ...data };
      const sharedKey = sharedKeyRef.current;
      if (sharedKey && data.e2e) {
        const { iv } = data.e2e;
        try {
          if (data.message)
            decrypted.message = await decrypt(sharedKey, {
              ct: data.message,
              iv,
            });
          if (data.image)
            decrypted.image = await decryptBinary(sharedKey, {
              ct: data.image,
              iv,
            });
          if (data.audio)
            decrypted.audio = await decryptBinary(sharedKey, {
              ct: data.audio,
              iv,
            });
          if (data.video)
            decrypted.video = await decryptBinary(sharedKey, {
              ct: data.video,
              iv,
            });
        } catch (err) {
          console.error("[E2EE] Decryption failed:", err);
          decrypted.message = "[Nie można odszyfrować wiadomości]";
        }
      }

      setChat((prev) => {
        if (prev.some((m) => m.id === decrypted.id)) return prev;
        play("receive");
        triggerTitleNotification();
        incrementReceived({
          text: decrypted.message ? 1 : 0,
          image: decrypted.image ? 1 : 0,
          audio: decrypted.audio ? 1 : 0,
        });
        return [...prev, decrypted];
      });
    };

    const onMessageReaction = ({
      messageId,
      sid,
      reaction,
    }: {
      messageId: string;
      sid: string;
      reaction: string | null;
    }) => {
      setChat((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...msg.reactions };
          if (reaction) reactions[sid] = reaction;
          else delete reactions[sid];
          return { ...msg, reactions };
        }),
      );
    };

    const onMessageUnsent = ({ messageId }: { messageId: string }) => {
      setChat((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                message: undefined,
                image: undefined,
                audio: undefined,
                isUnsent: true,
              }
            : m,
        ),
      );
    };

    const onViewOnceConsumed = ({ messageId }: { messageId: string }) => {
      setChat((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, image: undefined, message: "Zdjęcie wygasło" }
            : m,
        ),
      );
    };

    // ── Game / vanish events ────────────────────────────────────────────────

    const onIcebreakerUpdated = ({
      messageId,
      icebreaker,
    }: {
      messageId: string;
      icebreaker: Message["icebreaker"];
    }) => {
      if (icebreaker?.status === "proposed") play("invite");
      else if (
        icebreaker?.status === "pending" ||
        icebreaker?.status === "revealed"
      )
        play("game_start");
      setChat((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, icebreaker } : m)),
      );
    };

    const onVanishToggled = ({
      sid,
      active,
    }: {
      sid: string;
      active: boolean;
    }) => {
      setVanishModeActive(active);
      if (sid !== socket.id) {
        play("receive");
        setChat((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sid: "system",
            message: active
              ? "Rozmówca włączył tryb znikających wiadomości. Wiadomości znikną po 5 sekundach."
              : "Rozmówca wyłączył tryb znikających wiadomości.",
            reactions: {},
          },
        ]);
      }
    };

    const onStrangerScreenshot = ({
      viewOnce,
    }: { viewOnce?: boolean } = {}) => {
      play("receive");
      setChat((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: viewOnce
            ? "Rozmówca wykonał zrzut ekranu (lub opuścił okno) zdjęcia jednorazowego."
            : "Rozmówca wykonał zrzut ekranu czatu.",
          reactions: {},
        },
      ]);
    };

    // ── Misc events ─────────────────────────────────────────────────────────

    const onTyping = ({ sid, typing }: { sid: string; typing: boolean }) => {
      if (sid !== socket.id) setIsStrangerTyping(typing);
    };

    const onUserCount = ({ count }: { count: number }) => setUserCount(count);

    const onRateLimitWarning = ({
      duration,
    }: {
      message: string;
      duration: number;
    }) => {
      setBlockedTimeLeft(duration);
      play("receive");
      setChat((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: `Ograniczenie antyspamowe. Spróbuj ponownie za ${duration} s.`,
          reactions: {},
        },
      ]);
    };

    const onPartnerWantsToExchange = () => setPartnerWantsToExchange(true);

    const onContactExchanged = async ({ contact }: { contact: string }) => {
      await handleContactReceived(contact, sharedKeyRef.current);
    };

    // ── Private room events ─────────────────────────────────────────────────

    const onPrivateRoomCreated = ({
      room: roomId,
    }: {
      room: string;
      code: string;
    }) => {
      currentRoomRef.current = roomId;
      setRoom(roomId);
      setChat([]);
      setIsStrangerInRoom(false);
      setStatus("Pokój prywatny gotowy - czekasz na gościa");
      resetE2EE();
      initiateKeyExchange(roomId);
    };

    const onPrivateRoomError = ({ message: msg }: { message: string }) => {
      setPrivateRoomError(msg);
      setIsPrivateRoom(false);
    };

    const onPartnerTabHidden = ({ hidden }: { hidden: boolean }) => {
      setChat((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: hidden
            ? "🔕 Rozmówca opuścił kartę przeglądarki."
            : "🔔 Rozmówca wrócił do karty.",
          reactions: {},
        },
      ]);
    };

    // ── Register / unregister ───────────────────────────────────────────────

    socket.on("room_created", onRoomCreated);
    socket.on("room_joined", onRoomJoined);
    socket.on("room_left", onRoomLeft);
    socket.on("message", onMessage);
    socket.on("message_reaction", onMessageReaction);
    socket.on("message_unsent", onMessageUnsent);
    socket.on("view_once_consumed", onViewOnceConsumed);
    socket.on("icebreaker_updated", onIcebreakerUpdated);
    socket.on("vanish_toggled", onVanishToggled);
    socket.on("stranger_took_screenshot", onStrangerScreenshot);
    socket.on("typing", onTyping);
    socket.on("user_count", onUserCount);
    socket.on("rate_limit_warning", onRateLimitWarning);
    socket.on("partner_wants_to_exchange", onPartnerWantsToExchange);
    socket.on("contact_exchanged", onContactExchanged);
    socket.on("private_room_created", onPrivateRoomCreated);
    socket.on("private_room_error", onPrivateRoomError);
    socket.on("partner_tab_hidden", onPartnerTabHidden);

    // Fetch initial user count
    fetch(`${SOCKET_URL}/api/user/counter`)
      .then((r) => r.json())
      .then((d) => setUserCount(d.user_count))
      .catch(() => {});

    return () => {
      socket.off("room_created", onRoomCreated);
      socket.off("room_joined", onRoomJoined);
      socket.off("room_left", onRoomLeft);
      socket.off("message", onMessage);
      socket.off("message_reaction", onMessageReaction);
      socket.off("message_unsent", onMessageUnsent);
      socket.off("view_once_consumed", onViewOnceConsumed);
      socket.off("icebreaker_updated", onIcebreakerUpdated);
      socket.off("vanish_toggled", onVanishToggled);
      socket.off("stranger_took_screenshot", onStrangerScreenshot);
      socket.off("typing", onTyping);
      socket.off("user_count", onUserCount);
      socket.off("rate_limit_warning", onRateLimitWarning);
      socket.off("partner_wants_to_exchange", onPartnerWantsToExchange);
      socket.off("contact_exchanged", onContactExchanged);
      socket.off("private_room_created", onPrivateRoomCreated);
      socket.off("private_room_error", onPrivateRoomError);
      socket.off("partner_tab_hidden", onPartnerTabHidden);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // ── Room actions ───────────────────────────────────────────────────────────

  const joinRoom = useCallback(
    (overrides?: { gender?: string; targetGender?: string }) => {
      if (!socket) return;
      resetSessionUI();
      setIsPrivateRoom(false);
      const payload = {
        peerId: prefs.peerId,
        gender: overrides?.gender ?? prefs.myGender,
        targetGender: overrides?.targetGender ?? prefs.targetGender,
        age: prefs.myAge ? parseInt(prefs.myAge) : null,
        ageMin: prefs.ageMin ? parseInt(prefs.ageMin) : null,
        ageMax: prefs.ageMax ? parseInt(prefs.ageMax) : null,
        lat: prefs.userLat,
        lon: prefs.userLon,
        radius: prefs.myRadius !== "any" ? parseInt(prefs.myRadius) : null,
      };
      if (room) {
        socket.emit("leave", { room });
        setRoom("");
        setStatus("Szukanie nowego rozmówcy");
        socket.emit("join", payload);
      } else {
        socket.emit("join", payload);
        setStatus("Szukanie rozmówcy…");
      }
    },
    [socket, room, prefs, resetSessionUI],
  );

  const leaveRoom = useCallback(() => {
    endCall();
    resetExchangeState();
    if (room && socket) {
      socket.emit("leave", { room });
      setRoom(null);
      setStatus(isStrangerInRoom ? "Rozłączono" : "Przerwano szukanie");
      setIsStrangerInRoom(false);
    }
  }, [endCall, resetExchangeState, room, socket, isStrangerInRoom]);

  const createPrivateRoom = useCallback(() => {
    if (!socket) return;
    const code = generateRoomCode();
    setPrivateRoomCode(code);
    setPrivateRoomError(null);
    setIsPrivateRoom(true);
    setTabNotifyEnabled(notifyOnTabLeave);
    socket.emit("create_private_room", {
      roomCode: code,
      noScreenshots,
      notifyOnTabLeave,
    });
  }, [socket, noScreenshots, notifyOnTabLeave]);

  const joinPrivateRoom = useCallback(
    (code: string) => {
      if (!socket || !code.trim()) return;
      setPrivateRoomError(null);
      setIsPrivateRoom(true);
      socket.emit("join_private_room", { roomCode: code.trim().toUpperCase() });
    },
    [socket],
  );

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      prefs.setLocationError(
        "Twoja przeglądarka nie obsługuje geolokalizacji.",
      );
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
            { headers: { "User-Agent": "paiirz/1.0" } },
          );
          const data = await res.json();
          const addr = data.address ?? {};
          prefs.setLocationCity(
            addr.city ?? addr.town ?? addr.village ?? addr.county ?? "",
          );
        } catch {
          prefs.setLocationCity("");
        }
        prefs.setLocationLoading(false);
      },
      (err) => {
        prefs.setLocationLoading(false);
        if (err.code === 1)
          prefs.setLocationError("Odmówiono dostępu do lokalizacji.");
        else if (err.code === 2)
          prefs.setLocationError("Nie udało się ustalić lokalizacji.");
        else
          prefs.setLocationError(
            "Przekroczono limit czasu wykrywania lokalizacji.",
          );
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }, [prefs]);

  // ── Message actions ────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if ((!message && !selectedImage && !selectedVideo) || !room || !socket)
      return;

    const msgId = crypto.randomUUID();
    let encMsg: string | undefined = message || undefined;
    let encImg: string | undefined = selectedImage || undefined;
    let encVid: string | undefined = selectedVideo || undefined;
    let e2eMeta: { iv: string } | undefined;

    const sharedKey = sharedKeyRef.current;
    if (sharedKey) {
      try {
        if (message) {
          const p = await encrypt(sharedKey, message);
          encMsg = p.ct;
          e2eMeta = { iv: p.iv };
        }
        if (selectedImage) {
          const p = await encryptBinary(sharedKey, selectedImage);
          encImg = p.ct;
          if (!message) e2eMeta = { iv: p.iv };
        }
        if (selectedVideo) {
          const p = await encryptBinary(sharedKey, selectedVideo);
          encVid = p.ct;
          if (!message && !selectedImage) e2eMeta = { iv: p.iv };
        }
      } catch (err) {
        console.error("[E2EE] Encryption failed:", err);
      }
    }

    const newMsg: Message = {
      id: msgId,
      sid: socket.id ?? "",
      message: message || undefined,
      image: selectedImage || undefined,
      video: selectedVideo || undefined,
      reactions: {},
      vanishing: vanishModeActive || undefined,
      viewOnce:
        (selectedImage || selectedVideo) && viewOnceChecked ? true : undefined,
    };

    setChat((prev) => [...prev, newMsg]);
    socket.emit("message", {
      room,
      id: msgId,
      message: encMsg,
      image: encImg,
      video: encVid,
      vanishing: vanishModeActive || undefined,
      viewOnce:
        (selectedImage || selectedVideo) && viewOnceChecked ? true : undefined,
      e2e: e2eMeta,
    });

    const words = message
      ? message.trim().split(/\s+/).filter(Boolean).length
      : 0;
    incrementSent({
      text: message ? 1 : 0,
      image: selectedImage || selectedVideo ? 1 : 0,
      words,
    });

    setMessage("");
    setSelectedImage(null);
    setSelectedVideo(null);
    setViewOnceChecked(false);
    play("send");
  }, [
    message,
    selectedImage,
    selectedVideo,
    room,
    socket,
    sharedKeyRef,
    vanishModeActive,
    viewOnceChecked,
    incrementSent,
    play,
  ]);

  const handleSendReaction = useCallback(
    (messageId: string, reaction: string | null) => {
      if (!room || !socket) return;
      setChat((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...m.reactions };
          const sid = socket.id ?? "";
          if (reaction) reactions[sid] = reaction;
          else delete reactions[sid];
          return { ...m, reactions };
        }),
      );
      socket.emit("message_reaction", { room, messageId, reaction });
    },
    [room, socket],
  );

  const handleUnsendMessage = useCallback(
    (messageId: string) => {
      if (!room || !socket) return;
      socket.emit("unsend_message", { room, messageId });
      setChat((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                message: undefined,
                image: undefined,
                audio: undefined,
                isUnsent: true,
              }
            : m,
        ),
      );
    },
    [room, socket],
  );

  const handleRemoveMessageForMe = useCallback((messageId: string) => {
    setChat((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const handleBlockStranger = useCallback(() => {
    if (!room || !socket) return;
    endCall();
    socket.emit("block_user", { room });
    play("block");
    setRoom(null);
    setIsStrangerInRoom(false);
    setStatus("Zablokowano i zgłoszono rozmówcę 🚫");
    setChat([]);
    resetExchangeState();
  }, [room, socket, endCall, play, resetExchangeState]);

  const handleToggleVanish = useCallback(() => {
    if (!isStrangerInRoom || !room || !socket) return;
    const next = !vanishModeActive;
    setVanishModeActive(next);
    socket.emit("toggle_vanish", { room, active: next });
    setChat((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sid: "system",
        message: next
          ? "Włączono tryb znikających wiadomości. Wiadomości znikną po 5 sekundach."
          : "Wyłączono tryb znikających wiadomości.",
        reactions: {},
      },
    ]);
  }, [isStrangerInRoom, room, socket, vanishModeActive]);

  const triggerIcebreaker = useCallback(
    (type: "this_or_that" | "truth_or_dare", customData?: unknown) => {
      if (room && socket) {
        socket.emit("trigger_icebreaker", { room, type, customData });
      }
    },
    [room, socket],
  );

  const handleContactShare = useCallback(async () => {
    if (!socket || !room) return;
    await submitContactShare(socket, room, sharedKeyRef.current);
  }, [socket, room, submitContactShare, sharedKeyRef]);

  const readAsDataUrl = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Nie udało się odczytać pliku"));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImagePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        e.target.value = "";
        return;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        setSelectedImage(dataUrl);
        setSelectedVideo(null);
        setActionsMenuOpen(false);
      } catch {
        // ignore invalid file read
      } finally {
        e.target.value = "";
      }
    },
    [readAsDataUrl],
  );

  const handleVideoPicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("video/")) {
        e.target.value = "";
        return;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        setSelectedVideo(dataUrl);
        setSelectedImage(null);
        setActionsMenuOpen(false);
      } catch {
        // ignore invalid file read
      } finally {
        e.target.value = "";
      }
    },
    [readAsDataUrl],
  );

  // ── Mic hold-to-record handlers ───────────────────────────────────────────

  const handleMicMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isStrangerInRoom || !room) return;
    holdTimeoutRef.current = window.setTimeout(() => {
      holdTimeoutRef.current = null;
      setRecordingMode("holding");
      startRecording().catch(() => {});
    }, 350);
  };

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

  const handleMicMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (recordingMode === "holding") stopRecording(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout fullScreen hideHeader hideFooter>
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <ChatHeader
        userCount={userCount}
        isStrangerInRoom={isStrangerInRoom}
        e2eReady={e2eReady}
        soundsEnabled={soundsEnabled}
        onToggleSounds={() => setSoundsEnabled(!soundsEnabled)}
      />

      <div className="relative z-10 flex-grow min-h-0 flex flex-col w-full overflow-hidden max-w-5xl mx-auto">
        <div className="flex-grow min-h-0 flex flex-col relative">
          {/* ── Incoming call banner ──────────────────────────────────────────── */}
          <AnimatePresence>
            {callState === "incoming" && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute top-4 left-0 right-0 z-50 mx-2 sm:mx-4"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                      <div className="absolute w-10 h-10 rounded-full bg-indigo-500/15 animate-subtle-ripple" />
                      <div
                        className="absolute w-10 h-10 rounded-full bg-indigo-500/10 animate-subtle-ripple"
                        style={{ animationDelay: "0.83s" }}
                      />
                      <div className="relative z-10 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                        {incomingCallType === "video" ? (
                          <BsCameraVideo
                            className="text-indigo-400"
                            size={16}
                          />
                        ) : (
                          <BsTelephone className="text-indigo-400" size={16} />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Połączenie{" "}
                        {incomingCallType === "video" ? "wideo" : "głosowe"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Rozmówca proponuje rozmowę
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={declineCall}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold cursor-pointer"
                    >
                      <BsTelephoneX size={14} />
                      <span className="hidden sm:inline">Odrzuć</span>
                    </button>
                    <button
                      onClick={acceptCall}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-semibold cursor-pointer"
                    >
                      <BsTelephone size={14} />
                      <span className="hidden sm:inline">Odbierz</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Conversation top bar (visible while stranger is in room) ──────── */}
          {isStrangerInRoom && (
            <div className="absolute top-2 sm:top-4 left-0 right-0 z-20 flex flex-wrap justify-between items-center gap-y-2 px-2 sm:px-4 py-2 sm:py-2.5 mx-2 sm:mx-4 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-lg shadow-black/50">
              <div className="flex items-center gap-1.5 sm:gap-3">
                <span className="text-sm font-bold text-zinc-200 hidden sm:inline">
                  Rozmowa z partnerem
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 select-none">
                  Połączono
                </span>
              </div>

              <div className="flex items-center flex-wrap justify-end gap-1.5 sm:gap-2 relative contact-exchange-container">
                {/* Contact exchange button */}
                <div className="relative">
                  <button
                    onClick={() => setContactMenuOpen(!contactMenuOpen)}
                    className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer outline-none ${
                      exchangeState === "exchanged"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : exchangeState === "waiting"
                          ? "border-zinc-800 bg-zinc-900 text-zinc-400"
                          : partnerWantsToExchange
                            ? "bg-indigo-600 text-white border-indigo-500 animate-pulse"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {exchangeState === "exchanged"
                      ? "Kontakt 🫂"
                      : exchangeState === "waiting"
                        ? "Oczekiwanie..."
                        : partnerWantsToExchange
                          ? "Odbierz"
                          : "Wymień"}
                  </button>

                  <AnimatePresence>
                    {contactMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full right-0 mt-2 w-72 bg-zinc-950/95 border border-zinc-800/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-3"
                      >
                        {exchangeState === "idle" && (
                          <div className="flex flex-col gap-3">
                            <p className="text-[11px] text-zinc-400 leading-normal">
                              {partnerWantsToExchange
                                ? "Rozmówca zaproponował wymianę kontaktów."
                                : "Możesz bezpiecznie wymienić się kontaktem."}
                            </p>
                            <button
                              onClick={() => setExchangeState("input")}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-2 text-xs transition-all shadow-lg shadow-indigo-500/20"
                            >
                              Udostępnij dane
                            </button>
                          </div>
                        )}
                        {exchangeState === "input" && (
                          <div className="flex flex-col gap-3 text-left">
                            <input
                              type="text"
                              value={myContact}
                              maxLength={50}
                              placeholder="np. IG: @nazwa, Discord: nick"
                              onChange={(e) => setMyContact(e.target.value)}
                              className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 [-webkit-tap-highlight-color:transparent]"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleContactShare}
                                disabled={!myContact.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl py-2 text-xs transition-all"
                              >
                                Wyślij
                              </button>
                              <button
                                onClick={() => setExchangeState("idle")}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl py-2 text-xs transition-all"
                              >
                                Anuluj
                              </button>
                            </div>
                          </div>
                        )}
                        {exchangeState === "waiting" && (
                          <div className="flex flex-col items-center gap-3 py-2">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[11px] text-zinc-300 text-center">
                              Propozycja wysłana. Oczekiwanie na ruch rozmówcy…
                            </span>
                          </div>
                        )}
                        {exchangeState === "exchanged" && partnerContact && (
                          <div className="flex flex-col gap-3">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                              <span className="text-[11px] text-zinc-300">
                                Kontakt rozmówcy:{" "}
                                <strong className="text-emerald-400 block mt-1 text-sm break-all">
                                  {partnerContact}
                                </strong>
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(partnerContact)
                              }
                              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl py-2 text-xs transition-all"
                            >
                              Skopiuj kontakt
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Call buttons */}
                {callState === "idle" && (
                  <>
                    <button
                      onClick={() => startCall("voice")}
                      title="Połączenie głosowe"
                      className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer outline-none"
                    >
                      <BsTelephone size={14} />
                    </button>
                    <button
                      onClick={() => startCall("video")}
                      title="Połączenie wideo"
                      className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer outline-none"
                    >
                      <BsCameraVideo size={14} />
                    </button>
                  </>
                )}

                <button
                  onClick={handleToggleVanish}
                  className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border transition-all cursor-pointer outline-none ${
                    vanishModeActive
                      ? "bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {vanishModeActive ? "Znikaj: ON" : "Znikaj: OFF"}
                </button>

                <button
                  onClick={handleBlockStranger}
                  className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer outline-none"
                >
                  Zablokuj
                </button>
              </div>
            </div>
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
                    joinRoom();
                  }}
                />
              </motion.div>
            ) : !room ? (
              /* ── Setup panel ──────────────────────────────────────────────── */
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex-grow min-h-0 flex items-start lg:items-center justify-center p-4 z-20 overflow-y-auto overscroll-contain"
              >
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 py-4">
                <div className="text-center mb-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                    Jak chcesz porozmawiać?
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Wybierz tryb lub skonfiguruj filtry przed startem
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left column: Quick Start + Private Room */}
                  <div className="flex flex-col gap-5">
                    {/* Quick Start */}
                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                          <svg
                            className="w-4 h-4 text-indigo-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">
                            Szybki start
                          </h3>
                          <p className="text-xs text-zinc-500">
                            Losowy rozmówca - bez konfiguracji
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                        Kliknij i natychmiast zacznij rozmawiać z losową osobą.
                      </p>
                      <button
                        onClick={() =>
                          joinRoom({ gender: "any", targetGender: "any" })
                        }
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer text-sm tracking-wide hover:scale-[1.01] active:scale-[0.98] outline-none shadow-[0_0_25px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 group"
                      >
                        <span>Zacznij rozmowę</span>
                        <svg
                          className="w-4 h-4 transition-transform group-hover:translate-x-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                      <p className="mt-2 px-1 text-[10px] text-zinc-600 text-center leading-relaxed">
                        Rozpoczynając rozmowę, akceptujesz{" "}
                        <a
                          href="/regulamin"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
                        >
                          Regulamin serwisu
                        </a>
                        .
                      </p>
                    </div>

                    {/* Private Room */}
                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                          <svg
                            className="w-4 h-4 text-violet-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">
                            Prywatny pokój
                          </h3>
                          <p className="text-xs text-zinc-500">
                            Zaproś konkretną osobę kodem
                          </p>
                        </div>
                      </div>

                      {privateRoomError && (
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                          {privateRoomError}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {(["create", "join"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() =>
                              setPrivateRoomMode(
                                privateRoomMode === mode ? null : mode,
                              )
                            }
                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              privateRoomMode === mode
                                ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                                : "bg-zinc-900/50 text-zinc-400 border-zinc-800/60 hover:text-zinc-200"
                            }`}
                          >
                            {mode === "create"
                              ? "Stwórz pokój"
                              : "Dołącz z kodem"}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence>
                        {privateRoomMode === "create" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-3 overflow-hidden"
                          >
                            <div className="flex flex-col gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={noScreenshots}
                                  onChange={(e) =>
                                    setNoScreenshots(e.target.checked)
                                  }
                                  className="w-4 h-4 accent-violet-500 cursor-pointer"
                                />
                                <span className="text-xs text-zinc-300">
                                  Wykrywaj screenshoty i powiadamiaj mnie
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifyOnTabLeave}
                                  onChange={(e) =>
                                    setNotifyOnTabLeave(e.target.checked)
                                  }
                                  className="w-4 h-4 accent-violet-500 cursor-pointer"
                                />
                                <span className="text-xs text-zinc-300">
                                  Powiadamiaj gdy rozmówca opuści kartę
                                </span>
                              </label>
                            </div>
                            <button
                              onClick={createPrivateRoom}
                              className="w-full py-3 text-sm font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                            >
                              Wygeneruj link i czekaj
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {privateRoomMode === "join" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex gap-2 overflow-hidden"
                          >
                            <input
                              type="text"
                              value={privateRoomInputCode}
                              onChange={(e) =>
                                setPrivateRoomInputCode(
                                  e.target.value.toUpperCase().slice(0, 6),
                                )
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                joinPrivateRoom(privateRoomInputCode)
                              }
                              placeholder="Kod pokoju (np. A3XK9F)"
                              maxLength={6}
                              className="flex-1 appearance-none bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 font-mono tracking-widest uppercase [-webkit-tap-highlight-color:transparent]"
                            />
                            <button
                              onClick={() =>
                                joinPrivateRoom(privateRoomInputCode)
                              }
                              disabled={privateRoomInputCode.length < 4}
                              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                              Dołącz
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right column: Advanced Filters */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                        <svg
                          className="w-4 h-4 text-cyan-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          Filtry zaawansowane
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Dopasuj rozmówcę do swoich preferencji
                        </p>
                      </div>
                    </div>

                    {/* Privacy notice */}
                    <div className="flex items-start gap-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2.5">
                      <svg
                        className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Filtry są widoczne{" "}
                        <span className="text-zinc-400 font-medium">
                          wyłącznie dla algorytmu dopasowania
                        </span>{" "}
                        - nie są udostępniane innym użytkownikom.
                      </p>
                    </div>

                    {/* Gender selectors */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      {(["myGender", "targetGender"] as const).map((field) => (
                        <div key={field} className="flex-1 flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            {field === "myGender" ? "Twoja płeć" : "Szukasz"}
                          </label>
                          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60">
                            {(["female", "male", "any"] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() =>
                                  field === "myGender"
                                    ? prefs.setMyGender(g)
                                    : prefs.setTargetGender(g)
                                }
                                className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                                  (field === "myGender"
                                    ? prefs.myGender
                                    : prefs.targetGender) === g
                                    ? field === "myGender"
                                      ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/30"
                                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                                }`}
                              >
                                {g === "female"
                                  ? field === "myGender"
                                    ? "Kobieta"
                                    : "Kobiet"
                                  : g === "male"
                                    ? field === "myGender"
                                      ? "Mężczyzna"
                                      : "Mężczyzn"
                                    : field === "myGender"
                                      ? "Inna"
                                      : "Dowolna"}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Age */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Wiek
                      </label>
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div className="flex flex-col gap-1 col-span-1">
                          <span className="text-[10px] text-zinc-600">
                            Twój wiek
                          </span>
                          <input
                            type="number"
                            min={13}
                            max={99}
                            value={prefs.myAge}
                            onChange={(e) => {
                              const v = e.target.value;
                              // Allow intermediate states while typing (e.g. "1" before "18").
                              if (!/^\d{0,2}$/.test(v)) return;
                              prefs.setMyAge(v);
                            }}
                            onBlur={() => {
                              if (!prefs.myAge) return;
                              const parsed = parseInt(prefs.myAge, 10);
                              if (Number.isNaN(parsed)) {
                                prefs.setMyAge("");
                                return;
                              }
                              const clamped = Math.min(
                                99,
                                Math.max(13, parsed),
                              );
                              prefs.setMyAge(String(clamped));
                            }}
                            placeholder="-"
                            className="w-full appearance-none bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 text-sm text-center [-webkit-tap-highlight-color:transparent]"
                          />
                        </div>

                        <div className="flex flex-col gap-1 col-span-2">
                          <div className="flex justify-between items-center text-[10px] text-zinc-600">
                            <span>Szukaj od do</span>
                            <span className="text-zinc-400 font-medium">
                              {prefs.ageMin || 13} - {prefs.ageMax || 99} lat
                            </span>
                          </div>
                          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 h-[42px] flex items-center">
                            <DualRangeSlider
                              min={13}
                              max={99}
                              value={[
                                parseInt(prefs.ageMin as string) || 13,
                                parseInt(prefs.ageMax as string) || 99,
                              ]}
                              onChange={([min, max]) => {
                                prefs.setAgeMin(min.toString());
                                prefs.setAgeMax(max.toString());
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Lokalizacja
                      </label>
                      <div className="flex gap-2 items-start">
                        <button
                          onClick={detectLocation}
                          disabled={prefs.locationLoading}
                          className="flex items-center justify-center gap-2 px-3 h-[42px] rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs font-semibold text-zinc-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {prefs.locationLoading ? (
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          )}
                          <span className="hidden sm:inline">
                            {prefs.userLat ? "Aktualizuj GPS" : "Wykryj GPS"}
                          </span>
                          <span className="sm:hidden">GPS</span>
                        </button>
                        <div className="flex-1 flex flex-col gap-1">
                          <LocationAutocomplete
                            value={prefs.locationCity}
                            onChange={(text) => {
                              prefs.setLocationCity(text);
                              if (!text.trim()) {
                                prefs.setUserLat(null);
                                prefs.setUserLon(null);
                              }
                            }}
                            onSelect={(suggestion) => {
                              prefs.setLocationCity(suggestion.name);
                              prefs.setUserLat(suggestion.lat);
                              prefs.setUserLon(suggestion.lon);
                              prefs.setLocationError(null);
                            }}
                            onClear={() => {
                              prefs.setUserLat(null);
                              prefs.setUserLon(null);
                            }}
                            placeholder={
                              prefs.userLat
                                ? "Miasto (z GPS)"
                                : "Wpisz miasto lub użyj GPS"
                            }
                          />
                          {prefs.userLat && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                              GPS aktywny ({prefs.userLat.toFixed(3)},{" "}
                              {prefs.userLon?.toFixed(3)})
                            </span>
                          )}
                          {prefs.locationError && (
                            <span className="text-[10px] text-red-400">
                              {prefs.locationError}
                            </span>
                          )}
                        </div>
                      </div>

                      {prefs.userLat && (
                        <div className="relative">
                          <select
                            value={prefs.myRadius}
                            onChange={(e) => prefs.setMyRadius(e.target.value)}
                            className="w-full appearance-none bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:outline-none focus-visible:outline-none focus:border-zinc-700/90 focus:ring-2 focus:ring-white/15 focus:ring-offset-0 transition-colors duration-200 cursor-pointer [-webkit-tap-highlight-color:transparent]"
                          >
                            <option value="any">Dowolny promień</option>
                            <option value="10">do 10 km</option>
                            <option value="25">do 25 km</option>
                            <option value="50">do 50 km</option>
                            <option value="100">do 100 km</option>
                            <option value="200">do 200 km</option>
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                      <button
                        onClick={() => joinRoom()}
                        className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer text-sm tracking-wide hover:scale-[1.01] active:scale-[0.98] outline-none shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 group"
                      >
                        <span>Szukaj z filtrami</span>
                        <svg
                          className="w-4 h-4 transition-transform group-hover:translate-x-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                      <p className="mt-1 px-1 text-[10px] text-zinc-600 text-center leading-relaxed">
                        Rozpoczynając rozmowę, akceptujesz{" "}
                        <a
                          href="/regulamin"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
                        >
                          Regulamin serwisu
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </motion.div>
            ) : !isStrangerInRoom ? (
              /* ── Searching / waiting screen ───────────────────────────────── */
              <motion.div
                key="searching"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex-grow flex items-center justify-center p-4 z-20"
              >
                <div className="w-full max-w-md bg-zinc-950/40 border border-zinc-900 p-8 sm:p-10 rounded-2xl shadow-2xl flex flex-col gap-8 items-center text-center">
                <div className="relative flex items-center justify-center w-44 h-28">
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full bg-white/8 blur-2xl"
                    animate={{ opacity: [0.1, 0.2, 0.1] }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  <svg
                    aria-hidden="true"
                    viewBox="0 0 64 64"
                    className="relative z-10 w-20 h-20"
                  >
                    <path
                      d="M16 37 A16 16 0 0 1 48 37"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                    />

                    <motion.path
                      d="M16 37 A16 16 0 0 1 48 37"
                      pathLength={1}
                      stroke="#FFFFFF"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray="0.14 0.86"
                      initial={{ strokeDashoffset: 0, opacity: 0 }}
                      animate={{
                        strokeDashoffset: [0, -0.03, -0.86, -0.86, 0],
                        opacity: [0, 0.68, 0.68, 0, 0],
                      }}
                      transition={{
                        duration: 3,
                        ease: "linear",
                        repeat: Infinity,
                        times: [0, 0.06, 0.84, 0.92, 1],
                      }}
                    />

                    <circle cx="16" cy="37" r="6" fill="#FFFFFF" />
                    <circle cx="48" cy="37" r="6" fill="#FFFFFF" />
                  </svg>
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {isPrivateRoom
                      ? "Oczekiwanie na gościa"
                      : "Dopasowywanie partnera"}
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {isPrivateRoom
                      ? "Kod pokoju:\u00a0"
                      : "Szukanie rozmówcy według kryteriów…"}
                  </p>
                  {isPrivateRoom && privateRoomCode && (
                    <div className="flex items-center gap-3 mt-1 justify-center">
                      <span className="text-2xl font-black text-indigo-300 tracking-[0.3em] font-mono select-all">
                        {privateRoomCode}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(privateRoomCode)
                        }
                        title="Kopiuj kod"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={leaveRoom}
                  className="w-full py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-semibold transition-all cursor-pointer text-sm"
                >
                  Anuluj
                </button>
                </div>
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
              <AnimatePresence>
                {(callState === "connected" || callState === "calling") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="relative w-full bg-zinc-950 border-b border-zinc-800/60 overflow-hidden flex-shrink-0 pt-20"
                  >
                    {callState === "calling" ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute w-16 h-16 rounded-full bg-indigo-500/15 animate-subtle-ripple" />
                          <div
                            className="absolute w-16 h-16 rounded-full bg-indigo-500/10 animate-subtle-ripple"
                            style={{ animationDelay: "0.83s" }}
                          />
                          <div className="relative z-10 w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                            {callType === "video" ? (
                              <BsCameraVideo
                                className="text-indigo-400"
                                size={22}
                              />
                            ) : (
                              <BsTelephone
                                className="text-indigo-400"
                                size={22}
                              />
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">
                            Dzwonienie…
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Oczekiwanie na odpowiedź rozmówcy
                          </p>
                        </div>
                        <button
                          onClick={declineCall}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold cursor-pointer"
                        >
                          <BsTelephoneX size={14} /> Anuluj
                        </button>
                      </div>
                    ) : (
                      <div className="relative flex flex-col">
                        <div
                          className="relative bg-zinc-950 w-full"
                          style={{ minHeight: "220px", maxHeight: "340px" }}
                        >
                          <video
                            ref={remoteVideoRef as RefObject<HTMLVideoElement>}
                            autoPlay
                            playsInline
                            className={`w-full h-full object-cover ${isVideoMuted ? "hidden" : ""}`}
                            style={{
                              minHeight: "220px",
                              maxHeight: "340px",
                              background: "#09090b",
                            }}
                          />
                          {isVideoMuted && (
                            <div
                              className="flex items-center justify-center w-full"
                              style={{ minHeight: "220px" }}
                            >
                              <div className="flex items-center gap-8">
                                <div className="flex flex-col items-center gap-2">
                                  <motion.div
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{
                                      duration: 2.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                    className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-cyan-500/40 flex items-center justify-center"
                                  >
                                    <BsMic
                                      className="text-cyan-400"
                                      size={22}
                                    />
                                  </motion.div>
                                  <span className="text-[11px] text-zinc-500">
                                    Rozmówca
                                  </span>
                                </div>
                                <div className="w-px h-10 bg-gradient-to-b from-transparent via-zinc-700 to-transparent" />
                                <div className="flex flex-col items-center gap-2">
                                  <motion.div
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{
                                      duration: 2.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                      delay: 0.8,
                                    }}
                                    className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-indigo-500/40 flex items-center justify-center"
                                  >
                                    {isMicMuted ? (
                                      <BsMicMute
                                        className="text-red-400"
                                        size={22}
                                      />
                                    ) : (
                                      <BsMic
                                        className="text-indigo-400"
                                        size={22}
                                      />
                                    )}
                                  </motion.div>
                                  <span className="text-[11px] text-zinc-500">
                                    Ty
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          <div
                            className={`absolute bottom-3 right-3 w-24 h-16 rounded-xl overflow-hidden border-2 border-zinc-700/80 shadow-xl bg-zinc-900 ${isVideoMuted ? "hidden" : ""}`}
                          >
                            <video
                              ref={localVideoRef as RefObject<HTMLVideoElement>}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/50">
                          <button
                            onClick={toggleMic}
                            title={
                              isMicMuted ? "Włącz mikrofon" : "Wycisz mikrofon"
                            }
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isMicMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-zinc-800/80 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700"}`}
                          >
                            {isMicMuted ? (
                              <BsMicMute size={16} />
                            ) : (
                              <BsMic size={16} />
                            )}
                          </button>
                          <button
                            onClick={toggleCamera}
                            title={
                              isVideoMuted ? "Włącz kamerę" : "Wyłącz kamerę"
                            }
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isVideoMuted ? "bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700" : "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"}`}
                          >
                            {isVideoMuted ? (
                              <BsCameraVideoOff size={16} />
                            ) : (
                              <BsCameraVideo size={16} />
                            )}
                          </button>
                          <button
                            onClick={endCall}
                            title="Zakończ połączenie"
                            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-95"
                          >
                            <BsTelephoneX size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <ChatWrapper
                chat={chat}
                socket={socket}
                isStrangerTyping={isStrangerTyping}
                onSendReaction={handleSendReaction}
                hasExtraBottomPanel={Boolean(selectedImage || selectedVideo)}
                onVanishMessage={(id) =>
                  setChat((prev) => prev.filter((m) => m.id !== id))
                }
                onConsumeViewOnce={(messageId) => {
                  setChat((prev) =>
                    prev.map((m) =>
                      m.id === messageId
                        ? {
                            ...m,
                            image: undefined,
                            message: "🔒 Zdjęcie wygasło",
                          }
                        : m,
                    ),
                  );
                  if (room && socket)
                    socket.emit("view_once_consumed", { room, messageId });
                }}
                onScreenshotDetected={handleScreenshotDetected}
                onUnsendMessage={handleUnsendMessage}
                onRemoveMessageForMe={handleRemoveMessageForMe}
                onIcebreakerAction={(messageId, action, actionType) => {
                  if (room && socket)
                    socket.emit("action_icebreaker", {
                      room,
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
          <AnimatePresence>
            {(selectedImage || selectedVideo) && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                style={{ x: "-50%" }}
                className="absolute bottom-[90px] sm:bottom-[100px] left-1/2 w-[calc(100%-2rem)] sm:w-auto sm:min-w-[400px] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl p-4 flex gap-4 items-center shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-xl z-50 max-w-lg"
              >
                <div
                  onClick={() => setPreviewLightboxOpen(true)}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden cursor-pointer group shrink-0 border border-zinc-700/50"
                >
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt="Podgląd"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <video
                      src={selectedVideo!}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-white tracking-widest bg-black/50 px-2 py-1 rounded">
                      PODGLĄD
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(null);
                      setSelectedVideo(null);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-red-500/90 rounded-full transition-colors z-10"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-2.5 flex-grow">
                  <span className="text-sm font-bold text-zinc-100">
                    {selectedImage
                      ? "Zdjęcie gotowe do wysłania"
                      : "Wideo gotowe do wysłania"}
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={viewOnceChecked}
                        onChange={(e) => setViewOnceChecked(e.target.checked)}
                        className="peer appearance-none w-5 h-5 border-2 border-zinc-600 rounded bg-zinc-900/50 checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer"
                      />
                      <svg
                        className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                        viewBox="0 0 14 10"
                        fill="none"
                      >
                        <path
                          d="M1 5L4.5 8.5L13 1"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Wyślij jako "Wyświetl raz"
                    </span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <strong className="text-red-300 ml-1">{blockedTimeLeft}</strong>{" "}
                s.
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input bar ─────────────────────────────────────────────────────── */}
          {room && isStrangerInRoom && (
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex gap-1.5 sm:gap-2 items-end z-30 max-w-5xl mx-auto pointer-events-none">
              
              <div className="flex gap-1.5 sm:gap-2 shrink-0 pointer-events-auto">
                <NewRoom joinRoom={joinRoom} leaveRoom={leaveRoom} />

                <div className="relative actions-menu-container">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionsMenuOpen((prev) => !prev);
                    }}
                    className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all outline-none shadow-lg flex-shrink-0 ${
                      !isStrangerInRoom || !room || blockedTimeLeft > 0
                        ? "bg-zinc-900/50 border border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-50"
                        : actionsMenuOpen
                          ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                          : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:scale-105 cursor-pointer"
                    }`}
                    title="Więcej akcji"
                    disabled={!isStrangerInRoom || !room || blockedTimeLeft > 0}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {actionsMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute bottom-full left-0 mb-3 w-48 bg-zinc-950/95 border border-zinc-800/80 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsMenuOpen(false);
                            setGamesMenuOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-indigo-300"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <rect x="4" y="4" width="16" height="16" rx="3" />
                            <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
                            <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
                            <circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />
                            <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
                          </svg>
                          Mini-gry
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsMenuOpen(false);
                            imageInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                        >
                          <BsImage size={14} className="text-indigo-300" />
                          Zdjęcie
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsMenuOpen(false);
                            videoInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                        >
                          <BsFilm size={14} className="text-indigo-300" />
                          Wideo
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {gamesMenuOpen && (
                      <GamesMenu
                        onTrigger={triggerIcebreaker}
                        onClose={() => setGamesMenuOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePicked}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoPicked}
                />
              </div>

            {/* Input & Mic & Send */}
            <div className="flex items-end gap-1.5 sm:gap-2 flex-grow min-w-0 pointer-events-auto">
              {recordingMode !== "none" ? (
                <div className="flex-grow w-full flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 rounded-xl sm:rounded-[1.5rem] px-3.5 sm:px-6 py-2.5 sm:py-4 shadow-inner backdrop-blur-md">
                  <div className="flex items-center gap-3 w-full overflow-hidden">
                    <span
                      className="rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] shrink-0"
                      style={{
                        width: `${Math.max(10, 10 + ((recordingWave[recordingWave.length - 1] ?? 0) / 100) * 6)}px`,
                        height: `${Math.max(10, 10 + ((recordingWave[recordingWave.length - 1] ?? 0) / 100) * 6)}px`,
                        transition: "width 0.1s ease, height 0.1s ease",
                      }}
                    />
                    <span className="font-mono text-xs sm:text-base font-bold text-red-400 w-10 sm:w-12 shrink-0">
                      {Math.floor(recordingTime / 60)}:
                      {recordingTime % 60 < 10 ? "0" : ""}
                      {recordingTime % 60}
                    </span>
                    <div className="flex items-center gap-[2px] h-4 sm:h-6 flex-grow overflow-hidden shrink min-w-0 opacity-70">
                      {recordingWave.map((vol, idx) => (
                        <div
                          key={idx}
                          className="w-1 bg-red-400/80 rounded-full"
                          style={{
                            height: `${Math.max(4, (vol / 100) * 24)}px`,
                            transition: "height 0.1s ease",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] sm:text-sm text-zinc-500 hidden md:block shrink-0 whitespace-nowrap ml-2">
                      {recordingMode === "holding"
                        ? "Zwolnij aby wysłać, zjedź myszką aby anulować"
                        : "Kliknij przycisk Wyślij lub Kosz"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    className="ml-2 sm:ml-4 p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg sm:rounded-xl transition-colors outline-none cursor-pointer shrink-0 -my-2"
                    title="Anuluj nagrywanie"
                  >
                    <BsTrash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ) : (
                <ChatInput
                  room={room}
                  setMessage={setMessage}
                  message={message}
                  sendMessage={sendMessage}
                  isStrangerInRoom={isStrangerInRoom && blockedTimeLeft === 0}
                />
              )}

              {recordingMode === "none" && (
                <button
                  onMouseDown={handleMicMouseDown}
                  onMouseUp={handleMicMouseUp}
                  onMouseLeave={handleMicMouseLeave}
                  onTouchStart={handleMicMouseDown}
                  onTouchEnd={handleMicMouseUp}
                  disabled={!isStrangerInRoom || !room || blockedTimeLeft > 0}
                  className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all outline-none shadow-lg flex-shrink-0 ${
                    !isStrangerInRoom || !room || blockedTimeLeft > 0
                      ? "bg-zinc-900/50 border border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-50"
                      : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:scale-105 cursor-pointer"
                  }`}
                  title="Nagraj (kliknij lub przytrzymaj)"
                >
                  <BsMic size={20} />
                </button>
              )}

              <SendButton
                sendMessage={
                  recordingMode !== "none"
                    ? () => stopRecording(true)
                    : sendMessage
                }
                isStrangerInRoom={isStrangerInRoom && blockedTimeLeft === 0}
              />
            </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Media lightbox ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {previewLightboxOpen && (selectedImage || selectedVideo) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewLightboxOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Podgląd zdjęcia"
                    className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-zinc-800/50 select-none"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <button
                    onClick={() => setPreviewLightboxOpen(false)}
                    className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <CustomVideoPlayer src={selectedVideo!} mode="lightbox" />
                  <button
                    onClick={() => setPreviewLightboxOpen(false)}
                    className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
                  >
                    ✕
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Chat;
