import SendButton from "../components/SendButton";
import NewRoom from "../components/NewRoom";
import ChatInput from "../components/ChatInput";
import ChatWrapper from "../components/ChatWrapper";
import { Layout } from "../components/ui/Layout";
import { BsMic, BsTrash, BsCameraVideo, BsTelephone, BsTelephoneX, BsCameraVideoOff, BsMicMute } from "react-icons/bs";
import { CustomVideoPlayer } from "../components/CustomVideoPlayer";
import { Link } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encrypt,
  decrypt,
  encryptBinary,
  decryptBinary,
  type EncryptedPayload,
} from "../utils/crypto";

import React, { useState, useEffect, useRef, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

const socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "https://paiirz.onrender.com/");

interface Message {
  id: string;
  sid: string;
  message?: string;
  image?: string;
  video?: string;
  audio?: string;
  vanishing?: boolean;
  viewOnce?: boolean;
  reactions: { [sid: string]: string };
  isUnsent?: boolean;
  /** E2EE envelope: present on incoming messages from the wire */
  e2e?: { iv: string };
  icebreaker?: {
    type: "this_or_that" | "truth_or_dare";
    question: string;
    options?: string[];
    votes: { [sid: string]: string | number };
    status: "pending" | "revealed" | "proposed" | "declined";
    result?: string;
    voter_sid?: string;
    round?: number;
    turn_sid?: string;
    accepted_users?: string[];
    ready_for_next?: string[];
  };
}

interface SessionStats {
  startTime: number | null;
  endTime: number | null;
  sentTextCount: number;
  sentImageCount: number;
  sentAudioCount: number;
  sentWordCount: number;
  receivedTextCount: number;
  receivedImageCount: number;
  receivedAudioCount: number;
}

/*
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
*/

const playNotificationSound = (
  type: "send" | "receive" | "match" | "leave" | "invite" | "game_start" | "block", 
  soundsEnabled: boolean
) => {
  if (!soundsEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "send") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "receive") {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);

      setTimeout(() => {
        if (ctx.state === "closed") return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 90);
    } else if (type === "match") {
      const freqs = [261.63, 329.63, 392.00, 523.25];
      freqs.forEach((f, index) => {
        setTimeout(() => {
          if (ctx.state === "closed") return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }, index * 80);
      });
    } else if (type === "leave") {
      const freqs = [196.00, 155.56];
      freqs.forEach((f, index) => {
        setTimeout(() => {
          if (ctx.state === "closed") return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }, index * 120);
      });
    } else if (type === "invite") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880.00, ctx.currentTime);
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "game_start") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.06);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === "block") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110.00, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (error) {
    console.error("Failed to play sound:", error);
  }
};



const Chat: React.FC = () => {
  const [isStrangerInRoom, setIsStrangerInRoom] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<string | null>(null);

  // â”€â”€ E2EE State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Shared AES-GCM key derived from ECDH — null until key exchange completes
  const [e2eSharedKey, setE2eSharedKey] = useState<CryptoKey | null>(null);
  // Ref mirror of e2eSharedKey — allows socket.on closures to read the latest value
  const e2eSharedKeyRef = useRef<CryptoKey | null>(null);
  // True once both peers have exchanged keys and the session is encrypted
  const [e2eReady, setE2eReady] = useState<boolean>(false);
  // Holds our ECDH key pair for the current session
  const e2eKeyPairRef = useRef<CryptoKeyPair | null>(null);
  // Current room ref to use inside async key-exchange callbacks
  const currentRoomRef = useRef<string | null>(null);


  // â”€â”€ WebRTC hook (Messenger-like voice + video calling) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const [message, setMessage] = useState<string>("");
  const [chat, setChat] = useState<Message[]>([]);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [status, setStatus] = useState<string>(
    "Ustaw filtry i rozpocznij parowanie, aby porozmawiać"
  );

  // Contact exchange state
  const [exchangeState, setExchangeState] = useState<'idle' | 'input' | 'waiting' | 'exchanged'>('idle');
  const [myContact, setMyContact] = useState<string>("");
  const [partnerContact, setPartnerContact] = useState<string | null>(null);
  const [partnerWantsToExchange, setPartnerWantsToExchange] = useState<boolean>(false);
  const [contactMenuOpen, setContactMenuOpen] = useState<boolean>(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState<boolean>(false);

  // Typing indicator state
  const [isStrangerTyping, setIsStrangerTyping] = useState<boolean>(false);

  // Selected image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Selected video state
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Selected media preview lightbox state
  const [previewLightboxOpen, setPreviewLightboxOpen] = useState<boolean>(false);

  // Icebreaker games dropdown state
  const [gamesMenuOpen, setGamesMenuOpen] = useState<boolean>(false);
  const [gamesTab, setGamesTab] = useState<"standard" | "custom">("standard");
  const [customGameType, setCustomGameType] = useState<"this_or_that" | "truth_or_dare">("this_or_that");
  const [customQ, setCustomQ] = useState("");
  const [customOpt1, setCustomOpt1] = useState("");
  const [customOpt2, setCustomOpt2] = useState("");
  const [customTdChoice, setCustomTdChoice] = useState<"truth" | "dare">("truth");
  const [customTdText, setCustomTdText] = useState("");
  
  // Voice recording state & refs
  const [recordingMode, setRecordingMode] = useState<'none' | 'locked' | 'holding'>('none');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [_volume, setVolume] = useState<number>(0);
  const [recordingWave, setRecordingWave] = useState<number[]>(Array(40).fill(0));
  const [blockedTimeLeft, setBlockedTimeLeft] = useState<number>(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    startTime: null,
    endTime: null,
    sentTextCount: 0,
    sentImageCount: 0,
    sentAudioCount: 0,
    sentWordCount: 0,
    receivedTextCount: 0,
    receivedImageCount: 0,
    receivedAudioCount: 0,
  });
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [vanishModeActive, setVanishModeActive] = useState<boolean>(false);
  const [viewOnceChecked, setViewOnceChecked] = useState<boolean>(false);

  // Sound settings
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("sounds_enabled");
    return saved !== null ? saved === "true" : true;
  });

  const soundsEnabledRef = useRef(soundsEnabled);
  useEffect(() => {
    soundsEnabledRef.current = soundsEnabled;
    localStorage.setItem("sounds_enabled", String(soundsEnabled));
  }, [soundsEnabled]);

  // Keep e2eSharedKeyRef in sync so async socket.on closures always read the current key
  useEffect(() => {
    e2eSharedKeyRef.current = e2eSharedKey;
  }, [e2eSharedKey]);


  // Persistent Peer ID
  const [peerId] = useState<string>(() => {
    let id = localStorage.getItem("peer_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("peer_id", id);
    }
    return id;
  });

  // Matching Preferences
  const [myGender, setMyGender] = useState<"female" | "male" | "any">(() => {
    return (localStorage.getItem("pref_my_gender") as "female" | "male" | "any") || "any";
  });
  const [targetGender, setTargetGender] = useState<"female" | "male" | "any">(() => {
    return (localStorage.getItem("pref_target_gender") as "female" | "male" | "any") || "any";
  });
  const [myAge, setMyAge] = useState<string>(() => {
    return localStorage.getItem("pref_my_age") || "";
  });
  const [ageMin, setAgeMin] = useState<string>(() => {
    return localStorage.getItem("pref_age_min") || "";
  });
  const [ageMax, setAgeMax] = useState<string>(() => {
    return localStorage.getItem("pref_age_max") || "";
  });
  const [userLat, setUserLat] = useState<number | null>(() => {
    const v = localStorage.getItem("pref_lat");
    return v ? parseFloat(v) : null;
  });
  const [userLon, setUserLon] = useState<number | null>(() => {
    const v = localStorage.getItem("pref_lon");
    return v ? parseFloat(v) : null;
  });
  const [locationCity, setLocationCity] = useState<string>(() => {
    return localStorage.getItem("pref_location_city") || "";
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [myRadius, setMyRadius] = useState<string>(() => {
    return localStorage.getItem("pref_my_radius") || "any";
  });

  // Private room state
  const [privateRoomMode, setPrivateRoomMode] = useState<null | "create" | "join">(null);
  const [privateRoomCode, setPrivateRoomCode] = useState("");
  const [privateRoomInputCode, setPrivateRoomInputCode] = useState("");
  const [privateRoomError, setPrivateRoomError] = useState<string | null>(null);
  const [noScreenshots, setNoScreenshots] = useState(false);
  const [notifyOnTabLeave, setNotifyOnTabLeave] = useState(false);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [tabNotifyEnabled, setTabNotifyEnabled] = useState(false); // local copy for active room



  useEffect(() => {
    localStorage.setItem("pref_my_gender", myGender);
    localStorage.setItem("pref_target_gender", targetGender);
    localStorage.setItem("pref_my_age", myAge);
    localStorage.setItem("pref_age_min", ageMin);
    localStorage.setItem("pref_age_max", ageMax);
    localStorage.setItem("pref_my_radius", myRadius);
    if (userLat !== null) localStorage.setItem("pref_lat", String(userLat));
    if (userLon !== null) localStorage.setItem("pref_lon", String(userLon));
    localStorage.setItem("pref_location_city", locationCity);
  }, [myGender, targetGender, myAge, ageMin, ageMax, myRadius, userLat, userLon, locationCity]);

  // Click outside handler for Contact, Games, and Attachment dropdown menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (contactMenuOpen && !target.closest(".contact-exchange-container")) {
        setContactMenuOpen(false);
      }
      if (gamesMenuOpen && !target.closest(".games-menu-container")) {
        setGamesMenuOpen(false);
      }
      if (attachmentMenuOpen && !target.closest(".attachment-menu-container")) {
        setAttachmentMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [contactMenuOpen, gamesMenuOpen, attachmentMenuOpen]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const recordingWaveIntervalRef = useRef<number | null>(null);
  const volumeRef = useRef<number>(0);

  const resetExchangeState = () => {
    setExchangeState('idle');
    setMyContact('');
    setPartnerContact(null);
    setPartnerWantsToExchange(false);
    setContactMenuOpen(false);
    setAttachmentMenuOpen(false);
    setIsStrangerTyping(false);
    setSelectedImage(null);
    setSelectedVideo(null);
    setGamesMenuOpen(false);
    setBlockedTimeLeft(0);
    setShowSummary(false);
    setVanishModeActive(false);
    setViewOnceChecked(false);
    setSessionStats({
      startTime: null,
      endTime: null,
      sentTextCount: 0,
      sentImageCount: 0,
      sentAudioCount: 0,
      sentWordCount: 0,
      receivedTextCount: 0,
      receivedImageCount: 0,
      receivedAudioCount: 0,
    });

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingWaveIntervalRef.current) {
      clearInterval(recordingWaveIntervalRef.current);
      recordingWaveIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecordingMode('none');
    setRecordingTime(0);
    setVolume(0);
    volumeRef.current = 0;
    setRecordingWave(Array(40).fill(0));
  };

  const triggerIcebreaker = (type: "this_or_that" | "truth_or_dare", customData?: any) => {
    if (room && socket) {
      socket.emit("trigger_icebreaker", { room, type, customData });
    }
  };

  /*
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentMenuOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
      setSelectedVideo(null); // Clear selected video
    } catch (err) {
      console.error("Błąd kompresji zdjęcia:", err);
      alert("Nie udało się załadować zdjęcia.");
    } finally {
      e.target.value = "";
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentMenuOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;

    // Max size: 15MB
    if (file.size > 15 * 1024 * 1024) {
      alert("Plik wideo jest zbyt duży! Maksymalny rozmiar to 15 MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedVideo(reader.result as string);
      setSelectedImage(null); // Clear selected image
    };
    reader.onerror = () => {
      alert("Nie udało się załadować wideo.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  */

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingTime(0);
      setVolume(0);
      volumeRef.current = 0;
      setRecordingWave(Array(40).fill(0));

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start wave history interval updating every 75ms
      recordingWaveIntervalRef.current = window.setInterval(() => {
        const curVol = volumeRef.current;
        setRecordingWave((prev) => {
          const next = [...prev.slice(1), curVol];
          return next;
        });
      }, 75);

      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
            audioCtx.close().catch(() => {});
            return;
          }

          analyser.getByteTimeDomainData(dataArray);
          let sumDeviation = 0;
          for (let i = 0; i < bufferLength; i++) {
            sumDeviation += Math.abs(dataArray[i] - 128);
          }
          const averageDeviation = sumDeviation / bufferLength;
          
          // Non-linear threshold scaling for professional speech visualizer:
          // Silent/ambient noise: below 1.2 -> 0%
          // Max conversational loudness: deviation of 12 -> 100%
          const threshold = 1.2;
          const maxSpeech = 12.0;
          const adjusted = Math.max(0, averageDeviation - threshold);
          const volPercentage = Math.min(Math.round((adjusted / maxSpeech) * 100), 100);

          setVolume(volPercentage);
          volumeRef.current = volPercentage;

          requestAnimationFrame(checkVolume);
        };

        requestAnimationFrame(checkVolume);
      }
    } catch (err) {
      console.error("Nie udało się uzyskać dostępu do mikrofonu:", err);
      alert("Wymagany jest dostęp do mikrofonu do nagrywania wiadomości głosowych.");
      setRecordingMode('none');
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingWaveIntervalRef.current) {
      clearInterval(recordingWaveIntervalRef.current);
      recordingWaveIntervalRef.current = null;
    }

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      setRecordingMode('none');
      setVolume(0);
      volumeRef.current = 0;
      setRecordingWave(Array(40).fill(0));
      return;
    }

    mediaRecorder.onstop = () => {
      const stream = mediaRecorder.stream;
      stream.getTracks().forEach((track) => track.stop());

      if (shouldSend && audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (room && socket) {
            const msgId = crypto.randomUUID();
            const newMsg: Message = {
              id: msgId,
              sid: socket.id || "",
              audio: base64Audio,
              reactions: {},
              vanishing: vanishModeActive ? true : undefined
            };

            setSessionStats((prev) => ({
              ...prev,
              sentAudioCount: prev.sentAudioCount + 1
            }));

            setChat((prevChat) => [...prevChat, newMsg]);

            // E2EE: encrypt audio before transmitting
            let encAudio: string = base64Audio;
            let e2eMeta: { iv: string } | undefined;
            const sharedKey = e2eSharedKeyRef.current;
            if (sharedKey) {
              try {
                const p = await encryptBinary(sharedKey, base64Audio);
                encAudio = p.ct;
                e2eMeta = { iv: p.iv };
              } catch (err) {
                console.error("[E2EE] Audio encryption failed:", err);
              }
            }

            socket.emit("message", {
              room,
              id: msgId,
              audio: encAudio,
              vanishing: vanishModeActive ? true : undefined,
              e2e: e2eMeta
            });
            playNotificationSound("send", soundsEnabled);
          }
        };

      }

      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      setRecordingMode('none');
      setRecordingTime(0);
      setVolume(0);
      volumeRef.current = 0;
      setRecordingWave(Array(40).fill(0));
    };

    mediaRecorder.stop();
  };

  const handleMicMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isStrangerInRoom || room === null) return;

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }

    holdTimeoutRef.current = window.setTimeout(() => {
      holdTimeoutRef.current = null;
      setRecordingMode('holding');
      startRecording();
    }, 350);
  };

  const handleMicMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
      setRecordingMode('locked');
      startRecording();
    } else if (recordingMode === 'holding') {
      stopRecording(true);
    }
  };

  const handleMicMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (recordingMode === 'holding') {
      stopRecording(false);
    }
  };

  const titleIntervalRef = useRef<number | null>(null);

  const triggerTitleNotification = () => {
    if (document.hasFocus()) return;

    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
    }

    let isDefaultTitle = false;
    document.title = "đź’¬ Nowa wiadomość!";

    titleIntervalRef.current = window.setInterval(() => {
      document.title = isDefaultTitle ? "just paiirz" : "đź’¬ Nowa wiadomość!";
      isDefaultTitle = !isDefaultTitle;
    }, 1500);
  };

  useEffect(() => {
    const handleFocus = () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
      }
      document.title = "just paiirz";
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const socket: Socket = io(socketUrl);
    setSocket(socket);

    // â”€â”€ E2EE Key Exchange helper (called after entering a room) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const initiateKeyExchange = async (roomId: string) => {
      try {
        const keyPair = await generateKeyPair();
        e2eKeyPairRef.current = keyPair;
        const pubKeyB64 = await exportPublicKey(keyPair.publicKey);
        socket.emit("e2e_key_exchange", { room: roomId, publicKey: pubKeyB64 });
      } catch (err) {
        console.error("[E2EE] Key generation failed:", err);
      }
    };

    socket.on("room_created", (room: string) => {
      currentRoomRef.current = room;
      setRoom(room);
      setChat([]);
      setIsStrangerInRoom(false);
      setStatus("Szukanie nowego rozmówcy");
      setExchangeState('idle');
      setMyContact('');
      setPartnerContact(null);
      setPartnerWantsToExchange(false);
      setIsStrangerTyping(false);
      // Reset E2EE state for this new session
      setE2eSharedKey(null);
      setE2eReady(false);
      e2eKeyPairRef.current = null;
      // Generate our ECDH key pair so we are ready when a partner joins
      initiateKeyExchange(room);
    });

    socket.on("room_joined", ({ room, sid }: { room: string; sid: string }) => {
      currentRoomRef.current = room;
      setRoom(room);
      setChat([]);
      setIsStrangerInRoom(true);
      if (sid !== socket.id) {
        setIsStrangerInRoom(true);
      }
      setStatus("Nawiązywanie bezpiecznego połączenia E2Eâ€¦");
      setExchangeState('idle');
      setMyContact('');
      setPartnerContact(null);
      setPartnerWantsToExchange(false);
      setIsStrangerTyping(false);
      // Reset E2EE state and start key exchange for this new session
      setE2eSharedKey(null);
      setE2eReady(false);
      e2eKeyPairRef.current = null;
      initiateKeyExchange(room);
    });

    // Blind relay: we receive the peer's ECDH public key and derive a shared secret
    socket.on("e2e_key_exchange", async ({ publicKey }: { sender_sid: string; publicKey: string }) => {
      try {
        const myKeyPair = e2eKeyPairRef.current;
        if (!myKeyPair) {
          // We haven't generated our key yet — generate now and reply
          const kp = await generateKeyPair();
          e2eKeyPairRef.current = kp;
          const pubB64 = await exportPublicKey(kp.publicKey);
          const room = currentRoomRef.current;
          if (room) socket.emit("e2e_key_exchange", { room, publicKey: pubB64 });
          const theirPub = await importPublicKey(publicKey);
          const sharedKey = await deriveSharedKey(kp.privateKey, theirPub);
          setE2eSharedKey(sharedKey);
          setE2eReady(true);
          setStatus("Rozmawiasz z rozmówcą");
        } else {
          const theirPub = await importPublicKey(publicKey);
          const sharedKey = await deriveSharedKey(myKeyPair.privateKey, theirPub);
          setE2eSharedKey(sharedKey);
          setE2eReady(true);
          setStatus("Rozmawiasz z rozmówcą");
        }
        playNotificationSound("match", soundsEnabledRef.current);
      } catch (err) {
        console.error("[E2EE] Key exchange failed:", err);
        setStatus("Błąd negocjacji klucza E2EE — spróbuj ponownie");
      }
    });

    socket.on("partner_wants_to_exchange", () => {
      setPartnerWantsToExchange(true);
    });

    socket.on("contact_exchanged", async ({ contact }: { contact: string }) => {
      try {
        // Contact arrives as JSON-encoded EncryptedPayload when E2EE is active
        // Use the ref to avoid stale closure problem
        const sharedKey = e2eSharedKeyRef.current;
        if (sharedKey) {
          const payload: EncryptedPayload = JSON.parse(contact);
          const plaintext = await decrypt(sharedKey, payload);
          setPartnerContact(plaintext);
        } else {
          setPartnerContact(contact);
        }
      } catch {
        setPartnerContact(contact);
      }
      setExchangeState('exchanged');
    });

    socket.on("typing", ({ sid, typing }: { sid: string; typing: boolean }) => {
      if (sid !== socket.id) {
        setIsStrangerTyping(typing);
      }
    });

    socket.on("message_reaction", ({ messageId, sid, reaction }: { messageId: string; sid: string; reaction: string | null }) => {
      setChat((prevChat) =>
        prevChat.map((msg) => {
          if (msg.id === messageId) {
            const updatedReactions = { ...msg.reactions };
            if (reaction) {
              updatedReactions[sid] = reaction;
            } else {
              delete updatedReactions[sid];
            }
            return { ...msg, reactions: updatedReactions };
          }
          return msg;
        })
      );
    });

    socket.on("message", async (messageData: Message) => {
      // â”€â”€ E2EE Decryption â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // If this is our own message we already have the plaintext in state; skip.
      if (socket && messageData.sid === socket.id) return;

      let decrypted = { ...messageData };
      // Use the ref so this closure always reads the current shared key
      const sharedKey = e2eSharedKeyRef.current;
      if (sharedKey && messageData.e2e) {
        const { iv } = messageData.e2e;
        try {
          if (messageData.message) {
            decrypted.message = await decrypt(sharedKey, { ct: messageData.message, iv });
          }
          if (messageData.image) {
            decrypted.image = await decryptBinary(sharedKey, { ct: messageData.image, iv });
          }
          if (messageData.audio) {
            decrypted.audio = await decryptBinary(sharedKey, { ct: messageData.audio, iv });
          }
          if (messageData.video) {
            decrypted.video = await decryptBinary(sharedKey, { ct: messageData.video, iv });
          }
        } catch (err) {
          console.error("[E2EE] Decryption failed:", err);
          decrypted.message = "[Nie można odszyfrować wiadomości]";
        }
      }

      setChat((prevChat) => {
        if (prevChat.some(msg => msg.id === decrypted.id)) {
          return prevChat;
        }
        playNotificationSound("receive", soundsEnabledRef.current);
        triggerTitleNotification();

        setSessionStats((prev) => {
          const textCount = prev.receivedTextCount + (decrypted.message ? 1 : 0);
          const imageCount = prev.receivedImageCount + (decrypted.image ? 1 : 0);
          const audioCount = prev.receivedAudioCount + (decrypted.audio ? 1 : 0);
          return { ...prev, receivedTextCount: textCount, receivedImageCount: imageCount, receivedAudioCount: audioCount };
        });

        return [...prevChat, decrypted];
      });
    });

    socket.on("room_left", (reason?: string) => {
      // End any active WebRTC call when the partner leaves
      endCall();
      setRoom(null);
      setIsStrangerInRoom(false);
      // Reset E2EE session state — keys are never reused across sessions
      setE2eSharedKey(null);
      setE2eReady(false);
      e2eKeyPairRef.current = null;
      e2eSharedKeyRef.current = null;
      if (reason === "blocked") {
        setStatus("Rozmówca został zablokowany i zgłoszony");
        playNotificationSound("block", soundsEnabledRef.current);
      } else {
        setStatus("Rozmówca rozłączył się");
        playNotificationSound("leave", soundsEnabledRef.current);
      }
      setExchangeState('idle');
      setMyContact('');
      setPartnerContact(null);
      setPartnerWantsToExchange(false);
      setIsStrangerTyping(false);
    });

    socket.on("user_count", ({ count }: { count: number }) => {
      setUserCount(count);
    });

    socket.on("rate_limit_warning", ({ duration }: { message: string; duration: number }) => {
      setBlockedTimeLeft(duration);
      playNotificationSound("receive", soundsEnabledRef.current);
      setChat((prevChat) => [
        ...prevChat,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: `Ograniczenie antyspamowe. Spróbuj ponownie za ${duration} s.`,
          reactions: {}
        }
      ]);
    });

    socket.on("vanish_toggled", ({ sid, active }: { sid: string; active: boolean }) => {
      setVanishModeActive(active);
      if (socket && sid !== socket.id) {
        playNotificationSound("receive", soundsEnabledRef.current);
        setChat((prevChat) => [
          ...prevChat,
          {
            id: crypto.randomUUID(),
            sid: "system",
            message: active 
              ? "Rozmówca włączył tryb znikających wiadomości. Wiadomości znikną po 5 sekundach." 
              : "Rozmówca wyłączył tryb znikających wiadomości.",
            reactions: {}
          }
        ]);
      }
    });

    socket.on("stranger_took_screenshot", ({ viewOnce }: { viewOnce?: boolean } = {}) => {
      playNotificationSound("receive", soundsEnabledRef.current);
      setChat((prevChat) => [
        ...prevChat,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: viewOnce 
            ? "Rozmówca wykonał zrzut ekranu (lub opuścił okno) zdjęcia jednorazowego." 
            : "Rozmówca wykonał zrzut ekranu czatu.",
          reactions: {}
        }
      ]);
    });

    socket.on("view_once_consumed", ({ messageId }: { messageId: string }) => {
      setChat((prevChat) => 
        prevChat.map((msg) => 
          msg.id === messageId ? { ...msg, image: undefined, message: "Zdjęcie wygasło" } : msg
        )
      );
    });

    socket.on("message_unsent", ({ messageId }: { messageId: string }) => {
      setChat((prevChat) => 
        prevChat.map((msg) => 
          msg.id === messageId 
            ? { ...msg, message: undefined, image: undefined, audio: undefined, isUnsent: true } 
            : msg
        )
      );
    });

    socket.on("icebreaker_updated", ({ messageId, icebreaker }: {
      messageId: string;
      icebreaker: {
        type: "this_or_that" | "truth_or_dare";
        question: string;
        options?: string[];
        votes: { [sid: string]: string | number };
        status: "pending" | "revealed" | "proposed" | "declined";
        result?: string;
        voter_sid?: string;
        round?: number;
        turn_sid?: string;
        accepted_users?: string[];
        ready_for_next?: string[];
      };
    }) => {
      if (icebreaker.status === "proposed") {
        playNotificationSound("invite", soundsEnabledRef.current);
      } else if (icebreaker.status === "pending" || icebreaker.status === "revealed") {
        playNotificationSound("game_start", soundsEnabledRef.current);
      }
      setChat((prevChat) =>
        prevChat.map((msg) =>
          msg.id === messageId ? { ...msg, icebreaker } : msg
        )
      );
    });

    // Private room listeners
    socket.on("private_room_created", ({ room: roomId }: { room: string; code: string }) => {
      currentRoomRef.current = roomId;
      setRoom(roomId);
      setChat([]);
      setIsStrangerInRoom(false);
      setStatus("Pokój prywatny gotowy — czekasz na gościa");
      setE2eSharedKey(null);
      setE2eReady(false);
      e2eKeyPairRef.current = null;
      initiateKeyExchange(roomId);
    });

    socket.on("private_room_error", ({ message }: { message: string }) => {
      setPrivateRoomError(message);
      setIsPrivateRoom(false);
    });

    socket.on("partner_tab_hidden", ({ hidden }: { hidden: boolean }) => {
      setChat((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: hidden
            ? "đź”• Rozmówca opuścił kartę przeglądarki."
            : "đź”” Rozmówca wrócił do karty.",
          reactions: {},
        },
      ]);
    });

    fetchUserCount();

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endCall]);

  // Tab visibility notification — emits to partner when user leaves/returns to tab
  useEffect(() => {
    if (!room || !socket) return;

    const handleVisibilityChange = () => {
      socket.emit("tab_visibility_change", { room, hidden: document.hidden });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [room, socket, tabNotifyEnabled]);


  // Countdown timer for anti-spam rate limiting block
  useEffect(() => {
    if (blockedTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setBlockedTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [blockedTimeLeft]);

  // Monitor conversation session lifecycle and collect statistics
  useEffect(() => {
    if (isStrangerInRoom) {
      setSessionStats({
        startTime: Date.now(),
        endTime: null,
        sentTextCount: 0,
        sentImageCount: 0,
        sentAudioCount: 0,
        sentWordCount: 0,
        receivedTextCount: 0,
        receivedImageCount: 0,
        receivedAudioCount: 0,
      });
      setShowSummary(false);
    } else {
      setSessionStats((prev) => {
        if (prev.startTime && !prev.endTime) {
          setShowSummary(true);
          return {
            ...prev,
            endTime: Date.now(),
          };
        }
        return prev;
      });
    }
  }, [isStrangerInRoom]);

  // Screenshot warning trigger supporting viewOnce differentiation
  const handleScreenshotDetected = useCallback((viewOnce: boolean = false) => {
    if (room && socket) {
      socket.emit("screenshot_taken", { room, viewOnce });
      setChat((prevChat) => [
        ...prevChat,
        {
          id: crypto.randomUUID(),
          sid: "system",
          message: viewOnce 
            ? "Wykonano zrzut ekranu (lub opuszczono okno) zdjęcia jednorazowego. Rozmówca został powiadomiony."
            : "Wykonano zrzut ekranu czatu. Rozmówca został powiadomiony.",
          reactions: {}
        }
      ]);
    }
  }, [room, socket]);

  // Keyboard shortcut listener to detect printscreen / snipping tool for main chat
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === "PrintScreen";
      const isWinShiftS = e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s");
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5");

      if (isPrintScreen || isWinShiftS || isMacScreenshot) {
        handleScreenshotDetected(false);
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleScreenshotDetected]);

  const handleToggleVanish = () => {
    if (!isStrangerInRoom || !room || !socket) return;
    const nextActive = !vanishModeActive;
    setVanishModeActive(nextActive);
    socket.emit("toggle_vanish", { room, active: nextActive });
    
    // Add local system message
    setChat((prevChat) => [
      ...prevChat,
      {
        id: crypto.randomUUID(),
        sid: "system",
        message: nextActive 
          ? "Włączono tryb znikających wiadomości. Wiadomości znikną po 5 sekundach." 
          : "Wyłączono tryb znikających wiadomości.",
        reactions: {}
      }
    ]);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const confirmationMessage = "Czy na pewno chcesz opuścić tę stronę?";
      event.preventDefault();

      if (window.confirm(confirmationMessage)) {
        leaveRoom();
      }
      return confirmationMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Handle emitting typing status to the server
  useEffect(() => {
    if (!socket || !room || !isStrangerInRoom) return;

    if (message.trim().length > 0) {
      socket.emit("typing", { room, typing: true });

      const timeoutId = setTimeout(() => {
        socket.emit("typing", { room, typing: false });
      }, 1500);

      return () => clearTimeout(timeoutId);
    } else {
      socket.emit("typing", { room, typing: false });
    }
  }, [message, socket, room, isStrangerInRoom]);

  const getUserCountText = (count: number): string => {
    if (count === 1) {
      return "1 osoba aktualnie";
    } else if (count > 1 && count < 5) {
      return `${count} osoby aktualnie`;
    } else {
      return `${count} osób aktualnie`;
    }
  };

  const formatDuration = () => {
    if (!sessionStats.startTime || !sessionStats.endTime) return "0:00";
    const diffMs = sessionStats.endTime - sessionStats.startTime;
    const diffSecs = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSecs / 60);
    const seconds = diffSecs % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const calculateWPM = () => {
    if (!sessionStats.startTime || !sessionStats.endTime) return 0;
    const diffMs = sessionStats.endTime - sessionStats.startTime;
    const diffMins = diffMs / 1000 / 60;
    if (diffMins <= 0.05) return 0;
    const wpm = sessionStats.sentWordCount / diffMins;
    return Math.min(Math.round(wpm), 250);
  };

  const getTotalSent = () => {
    return sessionStats.sentTextCount + sessionStats.sentAudioCount + sessionStats.sentImageCount;
  };

  const getTotalReceived = () => {
    return sessionStats.receivedTextCount + sessionStats.receivedAudioCount + sessionStats.receivedImageCount;
  };

  const getDynamicFeedback = () => {
    if (!sessionStats.startTime || !sessionStats.endTime) return "Brak danych o rozmowie.";
    const durationSec = Math.floor((sessionStats.endTime - sessionStats.startTime) / 1000);
    const totalSent = getTotalSent();
    const totalReceived = getTotalReceived();

    if (durationSec < 15) {
      if (totalReceived === 0) {
        return "Obcy uciekł bez słowa... Szkoda czasu!";
      }
      return "Szybka wymiana zdań i po krzyku.";
    }
    if (durationSec > 180 && (totalSent + totalReceived) > 30) {
      return "Łšwietna rozmowa! Wymieniliście sporo wiadomości.";
    }
    if (totalSent > 10 && totalReceived === 0) {
      return "Monolog? Chyba mówiłeś tylko Ty...";
    }
    if (totalReceived > 10 && totalSent === 0) {
      return "Ciekawy słuchacz z Ciebie â€“ nic nie napisałeś!";
    }
    return "Ciekawa pogawędka. Może kolejny obcy będzie jeszcze lepszy?";
  };

  const joinRoom = (overrides?: { gender?: string; targetGender?: string }) => {
    resetExchangeState();
    setIsPrivateRoom(false);
    const payload = {
      peerId,
      gender: overrides?.gender ?? myGender,
      targetGender: overrides?.targetGender ?? targetGender,
      age: myAge ? parseInt(myAge) : null,
      ageMin: ageMin ? parseInt(ageMin) : null,
      ageMax: ageMax ? parseInt(ageMax) : null,
      lat: userLat,
      lon: userLon,
      radius: myRadius !== "any" ? parseInt(myRadius) : null,
    };

    if (room && socket) {
      socket.emit("leave", { room });
      setRoom("");
      setStatus("Szukanie nowego rozmówcy");
      socket.emit("join", payload);
    } else if (socket) {
      socket.emit("join", payload);
      setStatus("Szukanie rozmówcy...");
    }
  };

  // Quick start — skips all filters, joins with defaults
  const joinRoomQuick = () => {
    joinRoom({ gender: "any", targetGender: "any" });
  };

  // Detect user location via Browser Geolocation API + Nominatim reverse geocoding
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Twoja przeglądarka nie obsługuje geolokalizacji.");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLon(longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pl`,
            { headers: { "User-Agent": "paiirz/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || "";
          setLocationCity(city);
        } catch {
          setLocationCity("");
        }
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) setLocationError("Odmówiono dostępu do lokalizacji.");
        else if (err.code === 2) setLocationError("Nie udało się ustalić lokalizacji.");
        else setLocationError("Przekroczono limit czasu wykrywania lokalizacji.");
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  // Generate a cryptographically random 6-char uppercase code
  const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => chars[b % chars.length])
      .join("");
  };

  const createPrivateRoom = () => {
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
  };

  const joinPrivateRoom = (code: string) => {
    if (!socket || !code.trim()) return;
    const normalizedCode = code.trim().toUpperCase();
    setPrivateRoomError(null);
    setIsPrivateRoom(true);
    socket.emit("join_private_room", { roomCode: normalizedCode });
  };


  const leaveRoom = () => {
    endCall();
    resetExchangeState();
    if (room && socket) {
      socket.emit("leave", { room });
      setRoom(null);
      if (!isStrangerInRoom) {
        setStatus("Przerwano szukanie");
      }
      else {
        setStatus("Rozłączono");
      }
      setIsStrangerInRoom(false);
    }
  };

  const handleBlockStranger = () => {
    if (room && socket) {
      endCall();
      socket.emit("block_user", { room });
      playNotificationSound("block", soundsEnabled);
      setRoom(null);
      setIsStrangerInRoom(false);
      setStatus("Zablokowano i zgłoszono rozmówcę đźš«");
      setChat([]);
      resetExchangeState();
    }
  };

  const sendMessage = async () => {
    if ((message || selectedImage || selectedVideo) && room && socket) {
      const msgId = crypto.randomUUID();

      // â”€â”€ E2EE Encryption â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // We encrypt payloads before sending. The local newMsg keeps plaintext
      // (displayed immediately) while only ciphertext travels over the network.
      let encMsg: string | undefined = message || undefined;
      let encImg: string | undefined = selectedImage || undefined;
      let encVid: string | undefined = selectedVideo || undefined;
      let e2eMeta: { iv: string } | undefined;

      if (e2eSharedKey) {
        // All fields in one go share the same IV for this message envelope
        const ivBytes = crypto.getRandomValues(new Uint8Array(12));
        const ivB64 = btoa(String.fromCharCode(...ivBytes));
        e2eMeta = { iv: ivB64 };
        try {
          if (message) {
            const p = await encrypt(e2eSharedKey, message);
            encMsg = p.ct;
            e2eMeta = { iv: p.iv };
          }
          if (selectedImage) {
            const p = await encryptBinary(e2eSharedKey, selectedImage);
            encImg = p.ct;
            if (!message) e2eMeta = { iv: p.iv };
          }
          if (selectedVideo) {
            const p = await encryptBinary(e2eSharedKey, selectedVideo);
            encVid = p.ct;
            if (!message && !selectedImage) e2eMeta = { iv: p.iv };
          }
        } catch (err) {
          console.error("[E2EE] Encryption failed:", err);
        }
      }

      const newMsg: Message = {
        id: msgId,
        sid: socket.id || "",
        message: message || undefined,
        image: selectedImage || undefined,
        video: selectedVideo || undefined,
        reactions: {},
        vanishing: vanishModeActive ? true : undefined,
        viewOnce: ((selectedImage || selectedVideo) && viewOnceChecked) ? true : undefined
      };

      setSessionStats((prev) => {
        let textCount = prev.sentTextCount;
        let imageCount = prev.sentImageCount;
        let wordCount = prev.sentWordCount;

        if (message) {
          textCount += 1;
          wordCount += message.trim().split(/\s+/).filter(Boolean).length;
        }
        if (selectedImage || selectedVideo) {
          imageCount += 1;
        }
        return {
          ...prev,
          sentTextCount: textCount,
          sentImageCount: imageCount,
          sentWordCount: wordCount
        };
      });

      setChat((prevChat) => [...prevChat, newMsg]);
      socket.emit("message", {
        room,
        id: msgId,
        message: encMsg,
        image: encImg,
        video: encVid,
        vanishing: vanishModeActive ? true : undefined,
        viewOnce: ((selectedImage || selectedVideo) && viewOnceChecked) ? true : undefined,
        e2e: e2eMeta
      });
      setMessage("");
      setSelectedImage(null);
      setSelectedVideo(null);
      setViewOnceChecked(false);
      playNotificationSound("send", soundsEnabled);
    }
  };

  const handleSendReaction = (messageId: string, reaction: string | null) => {
    if (room && socket) {
      setChat((prevChat) =>
        prevChat.map((msg) => {
          if (msg.id === messageId) {
            const updatedReactions = { ...msg.reactions };
            const mySid = socket.id || "";
            if (reaction) {
              updatedReactions[mySid] = reaction;
            } else {
              delete updatedReactions[mySid];
            }
            return { ...msg, reactions: updatedReactions };
          }
          return msg;
        })
      );
      socket.emit("message_reaction", { room, messageId, reaction });
    }
  };

  const handleUnsendMessage = useCallback((messageId: string) => {
    if (room && socket) {
      socket.emit("unsend_message", { room, messageId });
      setChat((prevChat) => 
        prevChat.map((msg) => 
          msg.id === messageId 
            ? { ...msg, message: undefined, image: undefined, audio: undefined, isUnsent: true } 
            : msg
        )
      );
    }
  }, [room, socket]);

  const handleRemoveMessageForMe = useCallback((messageId: string) => {
    setChat((prevChat) => prevChat.filter((msg) => msg.id !== messageId));
  }, []);

  const submitContactShare = async () => {
    if (myContact.trim() && room && socket) {
      let contactPayload = myContact.trim();
      if (e2eSharedKey) {
        try {
          const encrypted = await encrypt(e2eSharedKey, myContact.trim());
          contactPayload = JSON.stringify(encrypted);
        } catch (err) {
          console.error("[E2EE] Contact encryption failed:", err);
        }
      }
      socket.emit('share_contact', { room, contact: contactPayload });
      setExchangeState('waiting');
    }
  };

  const fetchUserCount = async () => {
    const response = await fetch(`${socketUrl}/api/user/counter`);
    const data = await response.json();
    setUserCount(data.user_count);
  };

  return (
    <Layout fullScreen hideHeader hideFooter className="h-[100dvh]">
      {/* Floating Header */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-950/30 backdrop-blur-md w-full">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white select-none">
            pai<span className="text-indigo-400">irz</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundsEnabled(!soundsEnabled)}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors duration-200 outline-none cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-zinc-800/50"
            title={soundsEnabled ? "Wyłącz dźwięki" : "Włącz dźwięki"}
          >
            {soundsEnabled ? (
              <>
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span className="hidden sm:inline">Dźwięki: Wł</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <span className="hidden sm:inline">Dźwięki: Wył</span>
              </>
            )}
          </button>
          {/* E2EE Status Badge */}
          {isStrangerInRoom && (
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border select-none transition-all duration-500 ${
                e2eReady
                  ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50"
                  : "text-amber-400 bg-amber-950/40 border-amber-800/50"
              }`}
              title={e2eReady ? "Połączenie zaszyfrowane End-to-End (ECDH P-256 + AES-GCM 256)" : "Trwa negocjacja klucza E2EEâ€¦"}
            >
              <svg className={`w-3.5 h-3.5 ${!e2eReady ? "animate-pulse" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="hidden sm:inline">{e2eReady ? "E2EE" : "Szyfrowanieâ€¦"}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800/50 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{userCount !== null ? getUserCountText(userCount) : "..."}</span>
          </div>
        </div>
      </div>


      <div className="relative z-10 flex-grow flex flex-col w-full h-full overflow-hidden max-w-5xl mx-auto">
        <div className="flex-grow flex flex-col h-full relative">
        {/* â”€â”€ Incoming Call Banner (Messenger-style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <AnimatePresence>
          {callState === "incoming" && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute top-4 left-0 right-0 z-50 mx-2 sm:mx-4"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.25)] shadow-lg">
                <div className="flex items-center gap-3">
                  {/* Pulsing ring animation */}
                  <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                    {/* Ring 1 */}
                    <div className="absolute w-10 h-10 rounded-full bg-indigo-500/15 animate-subtle-ripple" />
                    {/* Ring 2 */}
                    <div
                      className="absolute w-10 h-10 rounded-full bg-indigo-500/10 animate-subtle-ripple"
                      style={{ animationDelay: "0.83s" }}
                    />
                    <div className="relative z-10 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                      {incomingCallType === "video" ? (
                        <BsCameraVideo className="text-indigo-400" size={16} />
                      ) : (
                        <BsTelephone className="text-indigo-400" size={16} />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Połączenie {incomingCallType === "video" ? "wideo" : "głosowe"}
                    </p>
                    <p className="text-xs text-zinc-400">Rozmówca proponuje rozmowę</p>
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

        {isStrangerInRoom && (
          <div className="absolute top-4 left-0 right-0 z-20 flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3 mx-2 sm:mx-4 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-lg shadow-black/50">
            <div className="flex items-center gap-1.5 sm:gap-3">
              <span className="text-sm font-bold text-zinc-200 hidden sm:inline">Rozmowa z partnerem</span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 select-none">Połączono</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 relative contact-exchange-container">
              {/* Contact Exchange Dropdown Anchor */}
              <div className="relative">
                {exchangeState === 'waiting' ? (
                  <button
                    onClick={() => setContactMenuOpen(!contactMenuOpen)}
                    className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-300 transition-colors duration-200 cursor-pointer outline-none flex items-center gap-1 sm:gap-1.5"
                  >
                    <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-indigo-400 animate-ping"></span>
                    Oczekiwanie...
                  </button>
                ) : exchangeState === 'exchanged' ? (
                  <button
                    onClick={() => setContactMenuOpen(!contactMenuOpen)}
                    className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200 cursor-pointer outline-none"
                  >
                    Kontakt đźź˘
                  </button>
                ) : (
                  <button
                    onClick={() => setContactMenuOpen(!contactMenuOpen)}
                    className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer outline-none ${partnerWantsToExchange ? 'bg-indigo-600 text-white border-indigo-500 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                    {partnerWantsToExchange ? "Odbierz" : "Wymień"}
                  </button>
                )}

                <AnimatePresence>
                  {contactMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-full right-0 mt-2 w-72 bg-zinc-950/95 border border-zinc-800/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-3"
                    >
                      {exchangeState === 'idle' && (
                        <div className="flex flex-col gap-3">
                          <p className="text-[11px] text-zinc-400 leading-normal text-left">
                            {partnerWantsToExchange
                              ? "Rozmówca zaproponował wymianę kontaktów. Wymiana nastąpi, gdy obie strony podadzą dane."
                              : "Możesz bezpiecznie wymienić się kontaktem. Dane zostaną ujawnione dopiero, gdy oboje wyrazicie chęć."}
                          </p>
                          <button
                            onClick={() => setExchangeState('input')}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-2 text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                          >
                            Udostępnij dane
                          </button>
                        </div>
                      )}

                      {exchangeState === 'input' && (
                        <div className="flex flex-col gap-3 text-left">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Twój kontakt:</span>
                            <input
                              type="text"
                              value={myContact}
                              maxLength={50}
                              placeholder="np. IG: @nazwa, Discord: nick"
                              onChange={(e) => setMyContact(e.target.value)}
                              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                            />
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => {
                                  submitContactShare();
                                }}
                                disabled={!myContact.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl py-2 text-xs transition-all shadow-lg active:scale-[0.98]"
                              >
                                Wyślij
                              </button>
                              <button
                                onClick={() => setExchangeState('idle')}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl py-2 text-xs transition-all active:scale-[0.98]"
                              >
                                Anuluj
                              </button>
                            </div>
                          </div>
                          <p className="text-[9px] text-zinc-500 text-center leading-normal">
                            Dane nie są weryfikowane. Druga strona może podać fałszywe dane.
                          </p>
                        </div>
                      )}

                      {exchangeState === 'waiting' && (
                        <div className="flex flex-col items-center justify-center gap-3 py-2">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[11px] text-zinc-300 text-center leading-normal">
                            Propozycja wysłana. Oczekiwanie na ruch ze strony rozmówcy...
                          </span>
                        </div>
                      )}

                      {exchangeState === 'exchanged' && (
                        <div className="flex flex-col gap-3 text-left">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                            <span className="text-[11px] text-zinc-300 leading-normal">
                              Kontakt rozmówcy: <strong className="text-emerald-400 block mt-1 text-sm break-all">{partnerContact}</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              if (partnerContact) {
                                navigator.clipboard.writeText(partnerContact);
                                alert("Skopiowano do schowka!");
                              }
                            }}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl py-2 text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                          >
                            Skopiuj kontakt
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* â”€â”€ Call Initiation Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {callState === "idle" && (
                <>
                  <button
                    onClick={() => startCall("voice")}
                    title="Połączenie głosowe"
                    className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer outline-none"
                  >
                    <BsTelephone size={14} />
                  </button>
                  <button
                    onClick={() => startCall("video")}
                    title="Połączenie wideo"
                    className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-200 cursor-pointer outline-none"
                  >
                    <BsCameraVideo size={14} />
                  </button>
                </>
              )}

              <button
                onClick={handleToggleVanish}
                className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer outline-none ${vanishModeActive ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
              >
                {vanishModeActive ? "Znikaj: ON" : "Znikaj: OFF"}
              </button>
              <button
                onClick={handleBlockStranger}
                className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-colors duration-200 cursor-pointer outline-none"
              >
                Zablokuj
              </button>
            </div>
          </div>
        )}
        {showSummary ? (
          <div className="flex-grow flex items-center justify-center p-4 z-20">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-[2rem] shadow-2xl flex flex-col gap-6 relative overflow-hidden"
            >
              <button
                onClick={() => setShowSummary(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-white rounded-full transition-colors"
                title="Zamknij"
              >
                âś•
              </button>

              <div className="flex flex-col items-center text-center gap-1">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                  Podsumowanie rozmowy
                </h2>
                <p className="text-sm text-zinc-400">
                  Statystyki ostatniej sesji
                </p>
              </div>

              <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 text-center italic text-zinc-300 font-medium text-sm shadow-inner">
                "{getDynamicFeedback()}"
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex flex-col items-center justify-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Czas trwania</span>
                  <span className="text-xl font-black text-white">
                    {formatDuration()}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Tempo pisania</span>
                  <span className="text-xl font-black text-white">
                    {calculateWPM()} <span className="text-xs font-medium text-zinc-500">sł/min</span>
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                  <span className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-wider mb-1">Wysłane (Ty)</span>
                  <span className="text-2xl font-black text-indigo-400">
                    {getTotalSent()}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 font-medium">
                    {sessionStats.sentTextCount} txt â€˘ {sessionStats.sentAudioCount} głos â€˘ {sessionStats.sentImageCount} zdj
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                  <span className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-wider mb-1">Odebrane (Obcy)</span>
                  <span className="text-2xl font-black text-cyan-400">
                    {getTotalReceived()}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 font-medium">
                    {sessionStats.receivedTextCount} txt â€˘ {sessionStats.receivedAudioCount} głos â€˘ {sessionStats.receivedImageCount} zdj
                  </span>
                </div>
              </div>

              <div className="w-full mt-2">
                <button
                  onClick={() => {
                    setShowSummary(false);
                    joinRoom();
                  }}
                  className="w-full relative overflow-hidden bg-white text-zinc-950 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer text-sm sm:text-base text-center tracking-wider hover:scale-[1.02] active:scale-[0.98] outline-none shadow-[0_0_30px_rgba(255,255,255,0.15)] group flex items-center justify-center gap-2"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Rozpocznij nową rozmowę
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        ) : !room ? (
          <div className="flex-grow flex items-center justify-center p-4 z-20 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-5xl mx-auto flex flex-col gap-5 py-4"
            >
              {/* Dashboard Header */}
              <div className="text-center mb-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                  Jak chcesz porozmawiać?
                </h2>
                <p className="text-sm text-zinc-500 mt-1">Wybierz tryb lub skonfiguruj filtry przed startem</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* â”€â”€ LEFT COLUMN: Quick Start + Private Room â”€â”€ */}
                <div className="flex flex-col gap-5">

                  {/* Quick Start Card */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Szybki start</h3>
                        <p className="text-xs text-zinc-500">Losowy rozmówca — bez konfiguracji</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                      Kliknij i natychmiast zacznij rozmawiać z losową osobą. Jedno kliknięcie — zero czekania na konfigurację.
                    </p>
                    <button
                      id="quick-start-btn"
                      onClick={joinRoomQuick}
                      className="w-full relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer text-sm tracking-wide hover:scale-[1.01] active:scale-[0.98] outline-none shadow-[0_0_25px_rgba(99,102,241,0.3)] hover:shadow-[0_0_35px_rgba(99,102,241,0.45)] flex items-center justify-center gap-2 group"
                    >
                      <span>Zacznij rozmowę</span>
                      <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>

                  {/* Private Room Card */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Prywatny pokój</h3>
                        <p className="text-xs text-zinc-500">Zaproś konkretną osobę kodem</p>
                      </div>
                    </div>

                    {privateRoomError && (
                      <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                        {privateRoomError}
                      </div>
                    )}

                    {/* Mode selector */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPrivateRoomMode(privateRoomMode === "create" ? null : "create")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${privateRoomMode === "create" ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-zinc-900/50 text-zinc-400 border-zinc-800/60 hover:text-zinc-200"}`}
                      >
                        Stwórz pokój
                      </button>
                      <button
                        onClick={() => setPrivateRoomMode(privateRoomMode === "join" ? null : "join")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${privateRoomMode === "join" ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-zinc-900/50 text-zinc-400 border-zinc-800/60 hover:text-zinc-200"}`}
                      >
                        Dołącz z kodem
                      </button>
                    </div>

                    {/* Create mode */}
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
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={noScreenshots}
                                onChange={(e) => setNoScreenshots(e.target.checked)}
                                className="w-4 h-4 accent-violet-500 cursor-pointer"
                              />
                              <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">
                                Wykrywaj screenshoty i powiadamiaj mnie
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={notifyOnTabLeave}
                                onChange={(e) => setNotifyOnTabLeave(e.target.checked)}
                                className="w-4 h-4 accent-violet-500 cursor-pointer"
                              />
                              <span className="text-xs text-zinc-300 group-hover:text-white transition-colors">
                                Powiadamiaj gdy rozmówca opuści kartę
                              </span>
                            </label>
                          </div>
                          <button
                            onClick={createPrivateRoom}
                            className="w-full py-3 text-sm font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                          >
                            Wygeneruj link i czekaj
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Join mode */}
                    <AnimatePresence>
                      {privateRoomMode === "join" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col gap-3 overflow-hidden"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={privateRoomInputCode}
                              onChange={(e) => setPrivateRoomInputCode(e.target.value.toUpperCase().slice(0, 6))}
                              onKeyDown={(e) => e.key === "Enter" && joinPrivateRoom(privateRoomInputCode)}
                              placeholder="Kod pokoju (np. A3XK9F)"
                              maxLength={6}
                              className="flex-1 bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all font-mono tracking-widest uppercase"
                            />
                            <button
                              onClick={() => joinPrivateRoom(privateRoomInputCode)}
                              disabled={privateRoomInputCode.length < 4}
                              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                            >
                              Dołącz
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* â”€â”€ RIGHT COLUMN: Advanced Filters â”€â”€ */}
                <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-6 shadow-lg flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Filtry zaawansowane</h3>
                      <p className="text-xs text-zinc-500">Dopasuj rozmówcę do swoich preferencji</p>
                    </div>
                  </div>

                  {/* Gender row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Twoja płeć</label>
                      <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60">
                        {(["female", "male", "any"] as const).map((g) => (
                          <button key={g} type="button" onClick={() => setMyGender(g)}
                            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all duration-200 cursor-pointer ${myGender === g ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/30" : "text-zinc-400 hover:text-zinc-200 border border-transparent"}`}>
                            {g === "female" ? "Kobieta" : g === "male" ? "Mężczyzna" : "Inna"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Szukasz</label>
                      <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60">
                        {(["female", "male", "any"] as const).map((g) => (
                          <button key={g} type="button" onClick={() => setTargetGender(g)}
                            className={`flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all duration-200 cursor-pointer ${targetGender === g ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-zinc-400 hover:text-zinc-200 border border-transparent"}`}>
                            {g === "female" ? "Kobiet" : g === "male" ? "Mężczyzn" : "Dowolna"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Age row */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Wiek</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-600">Twój wiek</span>
                        <input
                          type="number" min={13} max={99}
                          value={myAge}
                          onChange={(e) => { const v = e.target.value; if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 99)) setMyAge(v); }}
                          placeholder="—"
                          className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-600">Szukaj od</span>
                        <input
                          type="number" min={13} max={99}
                          value={ageMin}
                          onChange={(e) => { const v = e.target.value; if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 99)) setAgeMin(v); }}
                          placeholder="—"
                          className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-600">Szukaj do</span>
                        <input
                          type="number" min={13} max={99}
                          value={ageMax}
                          onChange={(e) => { const v = e.target.value; if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 99)) setAgeMax(v); }}
                          placeholder="—"
                          className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location row */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Lokalizacja</label>
                    <div className="flex gap-2 items-start">
                      <button
                        onClick={detectLocation}
                        disabled={locationLoading}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs font-semibold text-zinc-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        {locationLoading ? (
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        <span className="hidden sm:inline">{userLat ? "Aktualizuj GPS" : "Wykryj GPS"}</span>
                        <span className="sm:hidden">GPS</span>
                      </button>
                      <div className="flex-1 flex flex-col gap-1">
                        <input
                          type="text"
                          value={locationCity}
                          onChange={(e) => { setLocationCity(e.target.value); if (!e.target.value.trim()) { setUserLat(null); setUserLon(null); } }}
                          placeholder={userLat ? "Miasto (z GPS)" : "Wpisz miasto lub użyj GPS"}
                          className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                        {userLat && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            GPS aktywny ({userLat.toFixed(3)}, {userLon?.toFixed(3)})
                          </span>
                        )}
                        {locationError && <span className="text-[10px] text-red-400">{locationError}</span>}
                      </div>
                    </div>

                    {userLat && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-600">Promień wyszukiwania</label>
                        <div className="relative">
                          <select
                            value={myRadius}
                            onChange={(e) => setMyRadius(e.target.value)}
                            className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer"
                          >
                            <option value="any">Dowolny promień</option>
                            <option value="10">do 10 km</option>
                            <option value="25">do 25 km</option>
                            <option value="50">do 50 km</option>
                            <option value="100">do 100 km</option>
                            <option value="200">do 200 km</option>
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Search with filters button */}
                  <button
                    id="search-with-filters-btn"
                    onClick={() => joinRoom()}
                    className="w-full relative overflow-hidden bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer text-sm tracking-wide hover:scale-[1.01] active:scale-[0.98] outline-none shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 group mt-auto"
                  >
                    <span>Szukaj z filtrami</span>
                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : !isStrangerInRoom ? (
          <div className="flex-grow flex items-center justify-center p-4 z-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-md bg-zinc-950/40 border border-zinc-900 p-8 sm:p-10 rounded-2xl shadow-2xl flex flex-col gap-8 relative overflow-hidden text-center items-center"
            >
              <div className="relative flex items-center justify-center w-24 h-24 mb-2">
                <motion.div animate={{ scale: [1, 2.2], opacity: [0.35, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border border-indigo-500/50 bg-indigo-500/10" />
                <motion.div animate={{ scale: [1, 2.2], opacity: [0.35, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1.25 }}
                  className="absolute inset-0 rounded-full border border-cyan-500/50 bg-cyan-500/10" />
                <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 relative z-10">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {isPrivateRoom ? "Oczekiwanie na gościa" : "Dopasowywanie partnera"}
                </h2>
                <p className="text-sm text-zinc-400">
                  {isPrivateRoom
                    ? `Kod pokoju: \u00a0`
                    : "Szukanie rozmówcy według kryteriów..."}
                </p>
                {isPrivateRoom && privateRoomCode && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-black text-indigo-300 tracking-[0.3em] font-mono select-all">{privateRoomCode}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(privateRoomCode); }}
                      title="Kopiuj kod"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={leaveRoom}
                className="w-full py-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-semibold transition-all duration-200 cursor-pointer text-sm relative z-10"
              >
                Anuluj
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* â”€â”€ Active Call Panel (Messenger-like) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    /* â”€â”€ Calling / Ringing state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        {/* Ring 1 */}
                        <div className="absolute w-16 h-16 rounded-full bg-indigo-500/15 animate-subtle-ripple" />
                        {/* Ring 2 */}
                        <div
                          className="absolute w-16 h-16 rounded-full bg-indigo-500/10 animate-subtle-ripple"
                          style={{ animationDelay: "0.83s" }}
                        />
                        <div className="relative z-10 w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                          {callType === "video" ? (
                            <BsCameraVideo className="text-indigo-400" size={22} />
                          ) : (
                            <BsTelephone className="text-indigo-400" size={22} />
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">Dzwonienie...</p>
                        <p className="text-xs text-zinc-500 mt-1">Oczekiwanie na odpowiedź rozmówcy</p>
                      </div>
                      <button
                        onClick={declineCall}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold cursor-pointer"
                      >
                        <BsTelephoneX size={14} />
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    /* â”€â”€ Connected state: Video or Voice view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                    <div className="relative flex flex-col">
                      {/* Video grid or voice avatar */}
                      <div className="relative bg-zinc-950 w-full" style={{ minHeight: "220px", maxHeight: "340px" }}>
                        {/* Remote video (main) */}
                        <video
                          ref={remoteVideoRef as React.RefObject<HTMLVideoElement>}
                          autoPlay
                          playsInline
                          className={`w-full h-full object-cover ${
                            isVideoMuted ? "hidden" : ""
                          }`}
                          style={{ minHeight: "220px", maxHeight: "340px", background: "#09090b" }}
                        />
                        {/* Voice-only placeholder (both cameras off) */}
                        {isVideoMuted && (
                          <div className="flex items-center justify-center w-full" style={{ minHeight: "220px" }}>
                            <div className="flex items-center gap-8">
                              {/* Remote avatar */}
                              <div className="flex flex-col items-center gap-2">
                                <motion.div
                                  animate={{ scale: [1, 1.08, 1] }}
                                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                  className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                                >
                                  <BsMic className="text-cyan-400" size={22} />
                                </motion.div>
                                <span className="text-[11px] text-zinc-500">Rozmówca</span>
                              </div>
                              {/* Divider */}
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-px h-10 bg-gradient-to-b from-transparent via-zinc-700 to-transparent" />
                              </div>
                              {/* Local avatar */}
                              <div className="flex flex-col items-center gap-2">
                                <motion.div
                                  animate={{ scale: [1, 1.08, 1] }}
                                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                                  className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                                >
                                  {isMicMuted ? (
                                    <BsMicMute className="text-red-400" size={22} />
                                  ) : (
                                    <BsMic className="text-indigo-400" size={22} />
                                  )}
                                </motion.div>
                                <span className="text-[11px] text-zinc-500">Ty</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Local video pip (bottom-right corner) */}
                        <div
                          className={`absolute bottom-3 right-3 w-24 h-16 rounded-xl overflow-hidden border-2 border-zinc-700/80 shadow-xl bg-zinc-900 ${
                            isVideoMuted ? "hidden" : ""
                          }`}
                        >
                          <video
                            ref={localVideoRef as React.RefObject<HTMLVideoElement>}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Control bar */}
                      <div className="flex items-center justify-center gap-3 py-3 px-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/50">
                        {/* Mic toggle */}
                        <button
                          onClick={toggleMic}
                          title={isMicMuted ? "Włącz mikrofon" : "Wycisz mikrofon"}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                            isMicMuted
                              ? "bg-red-500/20 border-red-500/40 text-red-400"
                              : "bg-zinc-800/80 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700"
                          }`}
                        >
                          {isMicMuted ? <BsMicMute size={16} /> : <BsMic size={16} />}
                        </button>

                        {/* Camera toggle */}
                        <button
                          onClick={toggleCamera}
                          title={isVideoMuted ? "Włącz kamerę" : "Wyłącz kamerę"}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                            isVideoMuted
                              ? "bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700"
                              : "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          }`}
                        >
                          {isVideoMuted ? <BsCameraVideoOff size={16} /> : <BsCameraVideo size={16} />}
                        </button>

                        {/* Hang up */}
                        <button
                          onClick={endCall}
                          title="Zakończ połączenie"
                          className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] active:scale-95"
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
              status={status}
              isStrangerTyping={isStrangerTyping}
              onSendReaction={handleSendReaction}
              hasExtraBottomPanel={Boolean(selectedImage || selectedVideo)}
              onVanishMessage={(messageId) => {
                setChat((prevChat) => prevChat.filter((msg) => msg.id !== messageId));
              }}
              onConsumeViewOnce={(messageId) => {
                setChat((prevChat) => 
                  prevChat.map((msg) => 
                    msg.id === messageId ? { ...msg, image: undefined, message: "đź”’ Zdjęcie wygasło" } : msg
                  )
                );
                if (room && socket) {
                  socket.emit("view_once_consumed", { room, messageId });
                }
              }}
              onScreenshotDetected={handleScreenshotDetected}
              onUnsendMessage={handleUnsendMessage}
              onRemoveMessageForMe={handleRemoveMessageForMe}
              onIcebreakerAction={(
                messageId: string, 
                action: string | number, 
                actionType?: "vote" | "complete_turn" | "skip_question" | "next_round" | "accept" | "decline" | "quit"
              ) => {
                if (room && socket) {
                  socket.emit("action_icebreaker", { room, messageId, action, actionType });
                }
              }}
            />
          </>
        )}



        {/* Selected Media Preview Panel */}
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
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden cursor-pointer group shrink-0 border border-zinc-700/50 shadow-inner"
                title="Powiększ podgląd"
              >
                {selectedImage ? (
                  <img src={selectedImage} alt="Podgląd" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <video src={selectedVideo!} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white tracking-widest bg-black/50 px-2 py-1 rounded">PODGLĄD</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(null);
                    setSelectedVideo(null);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-red-500/90 rounded-full transition-colors z-10 shadow-md"
                  title="Usuń"
                >
                  âś•
                </button>
              </div>
              <div className="flex flex-col gap-2.5 flex-grow">
                <span className="text-sm font-bold text-zinc-100">
                  {selectedImage ? "Zdjęcie gotowe do wysłania" : "Wideo gotowe do wysłania"}
                </span>
                <label className="flex items-center gap-2 cursor-pointer group w-fit">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={viewOnceChecked}
                      onChange={(e) => setViewOnceChecked(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border-2 border-zinc-600 rounded bg-zinc-900/50 checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">Wyślij jako "Wyświetl raz"</span>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anti-spam warning banner */}
        <AnimatePresence>
          {blockedTimeLeft > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ x: "-50%" }}
              className="absolute top-20 left-1/2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.15)] z-50 flex items-center justify-center whitespace-nowrap"
            >
              <span>Blokada antyspamowa. Możesz wysłać kolejną wiadomość za <strong className="text-red-300 ml-1">{blockedTimeLeft}</strong> s.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {room && isStrangerInRoom && (
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex gap-2 items-end z-30 max-w-5xl mx-auto">
            <NewRoom
              joinRoom={joinRoom}
              leaveRoom={leaveRoom}
            />

          {recordingMode !== 'none' ? (
            <div className="flex-grow flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 rounded-[1.5rem] px-5 py-3.5 sm:py-4 shadow-inner backdrop-blur-md h-full">
              <div className="flex items-center gap-3 w-full overflow-hidden">
                {/* Dynamically scaling pulsing dot based on mic volume */}
                <span
                  className="rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                  style={{
                    width: `${Math.max(12, 12 + (recordingWave[recordingWave.length - 1] || 0) * 20)}px`,
                    height: `${Math.max(12, 12 + (recordingWave[recordingWave.length - 1] || 0) * 20)}px`,
                    transition: 'width 0.1s ease, height 0.1s ease'
                  }}
                ></span>

                {/* Timer */}
                <span className="font-mono text-sm sm:text-base font-bold text-red-400 w-12 shrink-0">
                  {Math.floor(recordingTime / 60)}:{recordingTime % 60 < 10 ? "0" : ""}{recordingTime % 60}
                </span>

                {/* Speak volume visualizer - scrolling wave */}
                <div className="flex items-center gap-[2px] h-6 flex-grow overflow-hidden shrink min-w-0 opacity-70">
                  {recordingWave.map((vol, idx) => {
                    const h = Math.max(4, vol * 24);
                    return (
                      <div
                        key={idx}
                        className="w-1 bg-red-400/80 rounded-full"
                        style={{ height: `${h}px`, transition: 'height 0.1s ease' }}
                      />
                    );
                  })}
                </div>

                {/* Subtitle instructions */}
                <span className="text-[10px] sm:text-xs text-zinc-500 hidden md:block shrink-0 whitespace-nowrap ml-2">
                  {recordingMode === 'holding'
                    ? "Zwolnij aby wysłać, zjedź myszką aby anulować"
                    : "Kliknij przycisk Wyślij lub Kosz"
                  }
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="ml-4 p-2.5 text-zinc-400 hover:text-red-400 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors outline-none cursor-pointer shrink-0"
                title="Anuluj nagrywanie"
              >
                <BsTrash size={16} />
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

          {/* Microphone button / Record trigger (supporting hold vs click) */}
          {recordingMode === 'none' && (
            <button
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseLeave}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
              disabled={!isStrangerInRoom || room === null || blockedTimeLeft > 0}
              className={`p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center transition-all duration-300 outline-none shadow-lg flex-shrink-0 ${!isStrangerInRoom || room === null || blockedTimeLeft > 0 ? "bg-zinc-900/50 border border-zinc-800/50 text-zinc-600 cursor-not-allowed opacity-50" : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 hover:scale-105 cursor-pointer"}`}
              title="Nagraj (kliknij lub przytrzymaj)"
            >
              <BsMic size={20} />
            </button>
          )}

          <SendButton
            sendMessage={recordingMode !== 'none' ? () => stopRecording(true) : sendMessage}
            isStrangerInRoom={isStrangerInRoom && blockedTimeLeft === 0}
          />

          {/* Absolute Games Dropdown menu */}
          <AnimatePresence>
            {gamesMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute bottom-full right-0 mb-4 w-72 sm:w-80 bg-zinc-950/95 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 flex flex-col games-menu-container"
              >
                {/* Tabs */}
                <div className="flex border-b border-zinc-800/50">
                  <button
                    type="button"
                    onClick={() => setGamesTab("standard")}
                    className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition-colors ${gamesTab === "standard" ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"}`}
                  >
                    Standardowe
                  </button>
                  <button
                    type="button"
                    onClick={() => setGamesTab("custom")}
                    className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition-colors ${gamesTab === "custom" ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"}`}
                  >
                    Własne
                  </button>
                </div>

                {gamesTab === "standard" ? (
                  <div className="p-2 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        triggerIcebreaker("this_or_that");
                        setGamesMenuOpen(false);
                      }}
                      className="px-4 py-3 text-left text-sm text-zinc-300 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl transition-all font-medium"
                    >
                      To czy To
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerIcebreaker("truth_or_dare");
                        setGamesMenuOpen(false);
                      }}
                      className="px-4 py-3 text-left text-sm text-zinc-300 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl transition-all font-medium"
                    >
                      Prawda czy Wyzwanie
                    </button>
                  </div>
                ) : (
                  <div className="p-4 flex flex-col gap-4">
                    {/* Game Type Selection */}
                    <div className="flex bg-zinc-900/80 rounded-xl p-1 border border-zinc-800/50">
                      <button
                        type="button"
                        onClick={() => setCustomGameType("this_or_that")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${customGameType === "this_or_that" ? "bg-zinc-800 text-indigo-400 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        To czy To
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomGameType("truth_or_dare")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${customGameType === "truth_or_dare" ? "bg-zinc-800 text-indigo-400 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        Prawda/Wyzwanie
                      </button>
                    </div>

                    {customGameType === "this_or_that" ? (
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          value={customQ}
                          onChange={(e) => setCustomQ(e.target.value)}
                          placeholder="Pytanie (np. Kawa czy herbata?)"
                          maxLength={80}
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customOpt1}
                            onChange={(e) => setCustomOpt1(e.target.value)}
                            placeholder="Opcja A"
                            maxLength={25}
                            className="w-1/2 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                          />
                          <input
                            type="text"
                            value={customOpt2}
                            onChange={(e) => setCustomOpt2(e.target.value)}
                            placeholder="Opcja B"
                            maxLength={25}
                            className="w-1/2 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!customQ.trim()) return alert("Wpisz pytanie!");
                            triggerIcebreaker("this_or_that", {
                              question: customQ.trim(),
                              options: [
                                customOpt1.trim() || "Opcja A",
                                customOpt2.trim() || "Opcja B"
                              ]
                            });
                            setCustomQ("");
                            setCustomOpt1("");
                            setCustomOpt2("");
                            setGamesMenuOpen(false);
                          }}
                          className="w-full bg-white text-zinc-950 font-bold py-3 px-6 rounded-xl transition-all duration-300 cursor-pointer text-xs sm:text-base text-center tracking-wider hover:scale-[1.01] active:scale-[0.99] outline-none shadow-md"
                        >
                          Wyślij to czy to
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex bg-zinc-900/80 rounded-xl p-1 border border-zinc-800/50">
                          <button
                            type="button"
                            onClick={() => setCustomTdChoice("truth")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${customTdChoice === "truth" ? "bg-zinc-850 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            Prawda
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomTdChoice("dare")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${customTdChoice === "dare" ? "bg-zinc-850 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                          >
                            Wyzwanie
                          </button>
                        </div>
                        <textarea
                          value={customTdText}
                          onChange={(e) => setCustomTdText(e.target.value)}
                          placeholder={customTdChoice === "truth" ? "Zadaj pytanie (Prawda)" : "Wpisz wyzwanie"}
                          rows={3}
                          maxLength={120}
                          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!customTdText.trim()) return alert("Wpisz treść!");
                            triggerIcebreaker("truth_or_dare", {
                              choice: customTdChoice,
                              text: customTdText.trim()
                            });
                            setCustomTdText("");
                            setGamesMenuOpen(false);
                          }}
                          className="mt-1 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-lg shadow-indigo-500/20"
                        >
                          Wyślij wyzwanie
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}
      </div>
    </div>

      {/* Selected Media Lightbox Preview */}
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
                    className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-zinc-800/50 select-none pointer-events-auto"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <button
                    onClick={() => setPreviewLightboxOpen(false)}
                    className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
                  >
                    âś•
                  </button>
                </>
              ) : (
                <>
                  <CustomVideoPlayer
                    src={selectedVideo!}
                    mode="lightbox"
                  />
                  <button
                    onClick={() => setPreviewLightboxOpen(false)}
                    className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-10 h-10 flex items-center justify-center bg-zinc-900/80 border border-zinc-800/80 text-zinc-400 hover:text-white rounded-full backdrop-blur-xl shadow-xl transition-colors outline-none cursor-pointer"
                  >
                    âś•
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
