import SendButton from "../components/SendButton";
import NewRoom from "../components/NewRoom";
import Input from "../components/Input";
import ChatWrapper from "../components/ChatWrapper";
import { BsImage, BsMic, BsTrash, BsCameraVideo, BsDice5 } from "react-icons/bs";
import { CustomVideoPlayer } from "../components/CustomVideoPlayer";
import { Link } from "react-router-dom";

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

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -6 }
};

const pageTransition = {
  duration: 0.2,
  ease: "easeOut"
} as const;

const Chat: React.FC = () => {
  const [switchRoom, setSwitchRoom] = useState<boolean>(true);
  const [isStrangerInRoom, setIsStrangerInRoom] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<string | null>(null);
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
  const [volume, setVolume] = useState<number>(0);
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
  const [myProvince, setMyProvince] = useState<string>(() => {
    return localStorage.getItem("pref_my_province") || "any";
  });
  const [myCity, setMyCity] = useState<string>(() => {
    return localStorage.getItem("pref_my_city") || "";
  });
  const [myRadius, setMyRadius] = useState<string>(() => {
    return localStorage.getItem("pref_my_radius") || "any";
  });



  useEffect(() => {
    localStorage.setItem("pref_my_gender", myGender);
    localStorage.setItem("pref_target_gender", targetGender);
    localStorage.setItem("pref_my_age", myAge);
    localStorage.setItem("pref_my_province", myProvince);
    localStorage.setItem("pref_my_city", myCity);
    localStorage.setItem("pref_my_radius", myRadius);
  }, [myGender, targetGender, myAge, myProvince, myCity, myRadius]);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        reader.onloadend = () => {
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
            socket.emit("message", { 
              room, 
              id: msgId, 
              audio: base64Audio,
              vanishing: vanishModeActive ? true : undefined
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
    document.title = "💬 Nowa wiadomość!";

    titleIntervalRef.current = window.setInterval(() => {
      document.title = isDefaultTitle ? "just paiirz" : "💬 Nowa wiadomość!";
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

    socket.on("room_created", (room: string) => {
      setRoom(room);
      setChat([]);
      setIsStrangerInRoom(false);
      setStatus("Szukanie nowego rozmówcy");
      setExchangeState('idle');
      setMyContact('');
      setPartnerContact(null);
      setPartnerWantsToExchange(false);
      setIsStrangerTyping(false);
    });

    socket.on("room_joined", ({ room, sid }: { room: string; sid: string }) => {
      setRoom(room);
      setChat([]);
      setIsStrangerInRoom(true);
      if (sid !== socket.id) {
        setIsStrangerInRoom(true);
      }
      setStatus("Rozmawiasz z rozmówcą");
      setExchangeState('idle');
      setMyContact('');
      setPartnerContact(null);
      setPartnerWantsToExchange(false);
      setIsStrangerTyping(false);
      playNotificationSound("match", soundsEnabledRef.current);
    });

    socket.on("partner_wants_to_exchange", () => {
      setPartnerWantsToExchange(true);
    });

    socket.on("contact_exchanged", ({ contact }: { contact: string }) => {
      setPartnerContact(contact);
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

    socket.on("message", (messageData: Message) => {
      setChat((prevChat) => {
        if (prevChat.some(msg => msg.id === messageData.id)) {
          return prevChat;
        }
        if (socket && messageData.sid !== socket.id) {
          playNotificationSound("receive", soundsEnabledRef.current);
          triggerTitleNotification();

          setSessionStats((prev) => {
            let textCount = prev.receivedTextCount;
            let imageCount = prev.receivedImageCount;
            let audioCount = prev.receivedAudioCount;

            if (messageData.message) textCount += 1;
            if (messageData.image) imageCount += 1;
            if (messageData.audio) audioCount += 1;

            return {
              ...prev,
              receivedTextCount: textCount,
              receivedImageCount: imageCount,
              receivedAudioCount: audioCount
            };
          });
        }
        return [...prevChat, messageData];
      });
    });

    socket.on("room_left", (reason?: string) => {
      setRoom(null);
      setIsStrangerInRoom(false);
      setSwitchRoom(true);
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

    fetchUserCount();

    return () => {
      socket.disconnect();
    };
  }, []);

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
      return "Świetna rozmowa! Wymieniliście sporo wiadomości.";
    }
    if (totalSent > 10 && totalReceived === 0) {
      return "Monolog? Chyba mówiłeś tylko Ty...";
    }
    if (totalReceived > 10 && totalSent === 0) {
      return "Ciekawy słuchacz z Ciebie – nic nie napisałeś!";
    }
    return "Ciekawa pogawędka. Może kolejny obcy będzie jeszcze lepszy?";
  };

  const joinRoom = () => {
    resetExchangeState();
    const payload = {
      peerId,
      gender: myGender,
      targetGender,
      age: myAge ? parseInt(myAge) : null,
      location: myProvince,
      city: myCity.trim() || null,
      radius: myRadius !== "any" ? parseInt(myRadius) : null
    };

    if (room && socket) {
      socket.emit("leave", { room });
      setRoom("");
      setStatus("Szukanie nowego rozmówcy");
      socket.emit("join", payload);
    } else if (socket) {
      socket.emit("join", payload);
      setStatus("Rozmawiasz z rozmówcą");
    }
  };

  const leaveRoom = () => {
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
      socket.emit("block_user", { room });
      playNotificationSound("block", soundsEnabled);
      setRoom(null);
      setIsStrangerInRoom(false);
      setStatus("Zablokowano i zgłoszono rozmówcę 🚫");
      setChat([]);
      resetExchangeState();
    }
  };

  const sendMessage = () => {
    if ((message || selectedImage || selectedVideo) && room && socket) {
      const msgId = crypto.randomUUID();
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
        message: message || undefined, 
        image: selectedImage || undefined,
        video: selectedVideo || undefined,
        vanishing: vanishModeActive ? true : undefined,
        viewOnce: ((selectedImage || selectedVideo) && viewOnceChecked) ? true : undefined
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

  const submitContactShare = () => {
    if (myContact.trim() && room && socket) {
      socket.emit('share_contact', { room, contact: myContact.trim() });
      setExchangeState('waiting');
    }
  };

  const fetchUserCount = async () => {
    const response = await fetch(`${socketUrl}/api/user/counter`);
    const data = await response.json();
    setUserCount(data.user_count);
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="h-svh w-full bg-[#09090B] flex flex-col font-sans text-zinc-200 relative overflow-hidden select-none"
    >
      {/* Background Cinematic Lighting Effects (Breathing/Pulsing Cyber Aurora) */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: vanishModeActive ? [0.08, 0.16, 0.08] : [0.06, 0.12, 0.06]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`fixed top-[-10%] left-[20%] w-[600px] h-[350px] rounded-full blur-[130px] pointer-events-none z-0 transition-colors duration-1000 ${
          vanishModeActive ? "bg-purple-600" : "bg-indigo-500"
        }`}
      />
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: vanishModeActive ? [0.06, 0.12, 0.06] : [0.04, 0.09, 0.04]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className={`fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none z-0 transition-colors duration-1000 ${
          vanishModeActive ? "bg-fuchsia-600" : "bg-cyan-500"
        }`}
      />
      <motion.div
        animate={{
          opacity: [0.015, 0.03, 0.015]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: vanishModeActive 
            ? "radial-gradient(ellipse at center, rgba(168,85,247,0.3), transparent 60%)" 
            : "radial-gradient(ellipse at center, rgba(255,255,255,0.4), transparent 60%)"
        }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0 transition-[background] duration-1000"
      />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181B_1px,transparent_1px),linear-gradient(to_bottom,#18181B_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-80 pointer-events-none z-0" />

      {/* Floating Header */}
      <div className={`py-4 sm:py-6 flex w-full items-center fixed top-0 left-0 justify-between px-6 sm:px-24 z-50 backdrop-blur-md bg-black/40 border-b transition-colors duration-1000 ${
        vanishModeActive ? "border-purple-950/60" : "border-zinc-800/80"
      }`}>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-500 hover:text-zinc-200 transition-colors flex items-center justify-center p-1.5 rounded-lg hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 outline-none group">
            <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="tracking-tighter select-none font-sans font-bold text-lg sm:text-xl text-white">
            pai<span className="text-zinc-500 font-light">irz</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundsEnabled(!soundsEnabled)}
            className="text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer text-[10px] font-sans font-semibold uppercase tracking-wider select-none outline-none bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 px-3 py-1.5 rounded-xl shadow-inner active:scale-95 flex items-center gap-1.5"
            title={soundsEnabled ? "Wyłącz dźwięki" : "Włącz dźwięki"}
          >
            {soundsEnabled ? (
              <>
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>Dźwięki: Wł</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                <span>Dźwięki: Wył</span>
              </>
            )}
          </button>
          <div className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-inner">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            <span className="font-mono text-zinc-300">{userCount !== null ? getUserCountText(userCount) : "..."}</span>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-center pt-[72px] sm:pt-[88px] px-0 sm:px-24 pb-0 sm:pb-16 min-h-0 w-full z-10 relative">
        <div className={`h-full w-full rounded-none sm:rounded-2xl border flex flex-col overflow-hidden transition-all duration-1000 shadow-2xl relative z-10 backdrop-blur-md ${
          vanishModeActive 
            ? "bg-[#090510]/50 border-purple-800/40 shadow-purple-950/10" 
            : "bg-[#0C0C0D]/50 border-zinc-800/80 shadow-black/60"
        }`}>
        {isStrangerInRoom && (
          <div className={`border-b px-4 py-3 flex items-center justify-between text-xs sm:text-sm select-none transition-colors duration-1000 ${
            vanishModeActive 
              ? "bg-[#180a3a]/40 border-purple-950/60" 
              : "bg-zinc-950/30 border-zinc-800/80"
          }`}>
            <div className="flex items-center gap-2 text-zinc-400 font-sans text-xs">
              <span>Rozmowa z partnerem</span>
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBlockStranger}
                className="flex items-center gap-1 px-3.5 py-1.5 border border-red-900/30 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-350 rounded-xl text-[10px] font-sans font-extrabold uppercase tracking-wider transition-all cursor-pointer select-none outline-none hover:scale-[1.02] active:scale-[0.98]"
              >
                Zablokuj
              </button>
              <button
                onClick={handleToggleVanish}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-[10px] font-sans font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer select-none outline-none border hover:scale-[1.02] active:scale-[0.98] ${
                  vanishModeActive 
                    ? "bg-purple-950/40 hover:bg-purple-900/60 text-purple-400 border-purple-800/60 shadow-[0_0_12px_rgba(168,85,247,0.1)]" 
                    : "bg-zinc-900/65 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border-zinc-800/80"
                }`}
              >
                {vanishModeActive ? "Tryb znikający: ON" : "Tryb znikający: OFF"}
              </button>
            </div>
          </div>
        )}
        {showSummary ? (
          <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto min-h-0 w-full">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-6 sm:p-8 max-w-md w-full text-zinc-200 flex flex-col items-center gap-5 sm:gap-6 relative select-none shadow-2xl backdrop-blur-md font-sans"
            >
              <button
                onClick={() => setShowSummary(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-sm transition-colors cursor-pointer select-none outline-none font-sans"
                title="Zamknij"
              >
                ✕
              </button>

              <div className="text-center flex flex-col gap-1">
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-300 font-sans">
                  Podsumowanie rozmowy
                </h2>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-sans">
                  Statystyki ostatniej sesji
                </p>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-4 py-3.5 text-center text-xs italic text-zinc-300 w-full leading-relaxed select-none font-sans">
                "{getDynamicFeedback()}"
              </div>

              <div className="grid grid-cols-2 gap-3.5 w-full">
                <div className="bg-zinc-950/80 border border-zinc-800/85 rounded-xl p-3 flex flex-col gap-1 items-center justify-center">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold font-sans">Czas trwania</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">
                    {formatDuration()}
                  </span>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800/85 rounded-xl p-3 flex flex-col gap-1 items-center justify-center">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold font-sans">Tempo pisania</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">
                    {calculateWPM()} <span className="text-[8px] text-zinc-500 lowercase tracking-normal font-sans">sł/min</span>
                  </span>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800/85 rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold font-sans">Wysłane (Ty)</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">
                    {getTotalSent()}
                  </span>
                  <span className="text-[8px] text-zinc-500 leading-tight font-sans">
                    {sessionStats.sentTextCount} txt • {sessionStats.sentAudioCount} głos • {sessionStats.sentImageCount} zdj
                  </span>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800/85 rounded-xl p-3 flex flex-col gap-1 items-center justify-center text-center">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold font-sans">Odebrane (Obcy)</span>
                  <span className="text-sm font-bold text-zinc-200 font-mono">
                    {getTotalReceived()}
                  </span>
                  <span className="text-[8px] text-zinc-500 leading-tight font-sans">
                    {sessionStats.receivedTextCount} txt • {sessionStats.receivedAudioCount} głos • {sessionStats.receivedImageCount} zdj
                  </span>
                </div>
              </div>

              <div className="relative group w-full shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-xl blur-lg opacity-25 group-hover:opacity-45 transition-all duration-500 scale-95 group-hover:scale-105" />
                <button
                  onClick={() => {
                    setShowSummary(false);
                    joinRoom();
                  }}
                  className="w-full relative overflow-hidden bg-white text-zinc-950 font-extrabold py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer text-xs text-center tracking-wider uppercase hover:scale-[1.01] active:scale-[0.99] block outline-none border border-transparent shadow-md"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-zinc-100 via-white to-zinc-100 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center justify-center gap-1.5 text-zinc-950 font-sans">
                    Rozpocznij nową rozmowę
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        ) : !room ? (
          <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto min-h-0 w-full z-10 relative">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-zinc-200 flex flex-col gap-5 sm:gap-6 relative select-none shadow-2xl backdrop-blur-md font-sans"
            >
              <div className="text-center flex flex-col gap-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-300 font-sans">
                  Profil parowania
                </h2>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-bold font-sans">
                  Skonfiguruj filtry przed rozpoczęciem czatu
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Twoja płeć</label>
                  <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/80 relative">
                    {(["female", "male", "any"] as const).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setMyGender(gender)}
                        className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer outline-none uppercase tracking-wider ${
                          myGender === gender
                            ? "bg-white text-zinc-950 shadow-lg"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                        }`}
                      >
                        {gender === "female" ? "Kobieta" : gender === "male" ? "Mężczyzna" : "Inna"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Szukasz</label>
                  <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/80 relative">
                    {(["female", "male", "any"] as const).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setTargetGender(gender)}
                        className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer outline-none uppercase tracking-wider ${
                          targetGender === gender
                            ? "bg-white text-zinc-950 shadow-lg"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                        }`}
                      >
                        {gender === "female" ? "Kobiety" : gender === "male" ? "Mężczyzny" : "Dowolnej"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex justify-between">
                  <span>Twój wiek</span>
                  <span className="text-[9px] text-zinc-400 normal-case font-normal">(opcjonalny, dopasowanie ±5 lat)</span>
                </label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={myAge}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 99)) {
                      setMyAge(val);
                    }
                  }}
                  placeholder="Dowolny"
                  className="w-full bg-zinc-950/80 border border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none rounded-xl px-4 py-3 text-xs text-zinc-200 transition-all font-semibold outline-none"
                />
              </div>

              <div className="flex flex-col gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/50">
                <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Lokalizacja</div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Województwo</label>
                  <div className="relative flex flex-col justify-center">
                    <select
                      value={myProvince}
                      onChange={(e) => setMyProvince(e.target.value)}
                      className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none cursor-pointer outline-none appearance-none w-full"
                    >
                      <option value="any">Dowolne</option>
                      <option value="dolnoslaskie">Dolnośląskie</option>
                      <option value="kujawsko-pomorskie">Kujawsko-pomorskie</option>
                      <option value="lubelskie">Lubelskie</option>
                      <option value="lubuskie">Lubuskie</option>
                      <option value="lodzkie">Łódzkie</option>
                      <option value="malopolskie">Małopolskie</option>
                      <option value="mazowieckie">Mazowieckie</option>
                      <option value="opolskie">Opolskie</option>
                      <option value="podkarpackie">Podkarpackie</option>
                      <option value="podlaskie">Podlaskie</option>
                      <option value="pomorskie">Pomorskie</option>
                      <option value="slaskie">Śląskie</option>
                      <option value="swietokrzyskie">Świętokrzyskie</option>
                      <option value="warminsko-mazurskie">Warmińsko-mazurskie</option>
                      <option value="wielkopolskie">Wielkopolskie</option>
                      <option value="zachodniopomorskie">Zachodniopomorskie</option>
                    </select>
                    <div className="absolute right-4 pointer-events-none text-zinc-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Miasto</label>
                    <input
                      type="text"
                      value={myCity}
                      onChange={(e) => setMyCity(e.target.value)}
                      placeholder="Dowolne"
                      className="w-full bg-zinc-950/80 border border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none rounded-xl px-4 py-3 text-xs text-zinc-200 transition-all font-semibold outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Promień wyszukiwania</label>
                    <div className="relative flex flex-col justify-center">
                      <select
                        value={myRadius}
                        onChange={(e) => setMyRadius(e.target.value)}
                        disabled={!myCity.trim()}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none cursor-pointer outline-none appearance-none w-full disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <option value="any">Dowolny promień</option>
                        <option value="0">Tylko to miasto</option>
                        <option value="20">do 20 km</option>
                        <option value="50">do 50 km</option>
                        <option value="100">do 100 km</option>
                        <option value="200">do 200 km</option>
                      </select>
                      <div className="absolute right-4 pointer-events-none text-zinc-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group w-full mt-2 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-xl blur-lg opacity-25 group-hover:opacity-45 transition-all duration-500 scale-95 group-hover:scale-105" />
                <button
                  onClick={joinRoom}
                  className="w-full relative overflow-hidden bg-white text-zinc-950 font-extrabold py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer text-xs text-center tracking-wider uppercase hover:scale-[1.01] active:scale-[0.99] block outline-none border border-transparent shadow-md"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-zinc-100 via-white to-zinc-100 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center justify-center gap-2 text-zinc-950 font-sans">
                    Rozpocznij parowanie
                    <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        ) : !isStrangerInRoom ? (
          <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto min-h-0 w-full z-10 relative">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-6 sm:p-8 max-w-md w-full text-zinc-200 flex flex-col items-center gap-6 select-none shadow-2xl backdrop-blur-md font-sans"
            >
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Ripple 1 */}
                <motion.div
                  animate={{
                    scale: [1, 2.2],
                    opacity: [0.35, 0]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                  className="absolute w-12 h-12 rounded-full border border-indigo-500/40 bg-indigo-500/5 pointer-events-none"
                />
                {/* Ripple 2 */}
                <motion.div
                  animate={{
                    scale: [1, 2.2],
                    opacity: [0.35, 0]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 1.25
                  }}
                  className="absolute w-12 h-12 rounded-full border border-cyan-500/40 bg-cyan-500/5 pointer-events-none"
                />
                {/* Core animated matching node */}
                <div className="relative w-12 h-12 flex items-center justify-center border border-zinc-750 rounded-full bg-zinc-950 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 animate-pulse"></div>
                </div>
              </div>

              <div className="text-center flex flex-col gap-1">
                <h2 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-300 uppercase tracking-widest font-sans">
                  Dopasowywanie partnera
                </h2>
                <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider font-sans font-bold">
                  Szukanie pokoju według kryteriów...
                </p>
              </div>

              <div className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-2.5 text-xs text-zinc-300 font-sans">
                <div className="font-extrabold text-zinc-500 uppercase tracking-widest text-[9px] mb-1">Wybrane filtry:</div>
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Płeć (Ty / Szukasz):</span>
                  <span className="font-bold text-zinc-200">
                    {myGender === "female" ? "Kobieta" : myGender === "male" ? "Mężczyzna" : "Nie podano"} /{" "}
                    {targetGender === "female" ? "Kobieta" : targetGender === "male" ? "Mężczyzna" : "Dowolna"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Wiek:</span>
                  <span className="font-bold text-zinc-200">{myAge ? `${myAge} lat` : "Dowolny"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Lokalizacja:</span>
                  <span className="font-bold text-zinc-250 text-right truncate max-w-[200px]" title={myProvince === "any" ? "Dowolne woj." : `${myProvince.charAt(0).toUpperCase() + myProvince.slice(1)}`}>
                    {myProvince === "any" ? "Dowolne" : `${myProvince.charAt(0).toUpperCase() + myProvince.slice(1)}`}
                    {myCity.trim() && ` • ${myCity.trim()}`}
                    {myCity.trim() && myRadius !== "any" && ` (+${myRadius}km)`}
                  </span>
                </div>
              </div>

              <button
                onClick={leaveRoom}
                className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-red-900/40 text-zinc-400 hover:text-red-400 transition-all font-bold py-3 rounded-xl text-xs text-center uppercase tracking-wider outline-none"
              >
                Anuluj parowanie
              </button>
            </motion.div>
          </div>
        ) : (
          <ChatWrapper
            chat={chat}
            socket={socket}
            status={status}
            isStrangerTyping={isStrangerTyping}
            onSendReaction={handleSendReaction}
            onVanishMessage={(messageId) => {
              setChat((prevChat) => prevChat.filter((msg) => msg.id !== messageId));
            }}
            onConsumeViewOnce={(messageId) => {
              setChat((prevChat) => 
                prevChat.map((msg) => 
                  msg.id === messageId ? { ...msg, image: undefined, message: "🔒 Zdjęcie wygasło" } : msg
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
        )}

        {/* Contact Exchange Panel */}
        <AnimatePresence>
          {isStrangerInRoom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-zinc-900/90 border-t border-zinc-800 overflow-hidden shrink-0 font-mono"
            >
              <div className="p-4">
                {exchangeState === 'idle' && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
                    <span className="text-xs text-zinc-400 text-center sm:text-left leading-relaxed uppercase tracking-wider">
                      {partnerWantsToExchange
                        ? "Rozmówca zaproponował wymianę kontaktów. Wymiana nastąpi, gdy obie strony podadzą swoje dane."
                        : "Możesz bezpiecznie wymienić się kontaktem. Dane zostaną ujawnione dopiero, gdy oboje wyrazicie chęć."}
                    </span>
                    <button
                      onClick={() => setExchangeState('input')}
                      className="px-4 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase transition-colors bg-zinc-100 hover:bg-white text-zinc-950 outline-none shrink-0 border border-zinc-200 font-mono"
                    >
                      {partnerWantsToExchange ? "Zaakceptuj i wyślij" : "Wymień się kontaktem"}
                    </button>
                  </div>
                )}

                {exchangeState === 'input' && (
                  <div className="flex flex-col gap-2 font-sans">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <span className="text-xs uppercase tracking-wider font-semibold shrink-0 text-zinc-300 font-mono">Twój kontakt:</span>
                      <input
                        type="text"
                        value={myContact}
                        maxLength={50}
                        placeholder="np. IG: @nazwa, Discord: nick"
                        onChange={(e) => setMyContact(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-300 placeholder-zinc-500 flex-grow outline-none focus:border-zinc-700 transition-all font-mono"
                      />
                      <div className="flex gap-2 shrink-0 font-mono">
                        <button
                          onClick={submitContactShare}
                          disabled={!myContact.trim()}
                          className="bg-zinc-100 hover:bg-white disabled:bg-zinc-950 disabled:text-zinc-700 disabled:border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors border border-zinc-200 outline-none"
                        >
                          Wyślij
                        </button>
                        <button
                          onClick={() => setExchangeState('idle')}
                          className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors outline-none"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-mono">
                      Uwaga: Dane nie są weryfikowane. Rozmówca może podać fałszywy kontakt.
                    </p>
                  </div>
                )}

                {exchangeState === 'waiting' && (
                  <div className="flex items-center justify-between gap-3 font-sans">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse shrink-0"></div>
                      <span className="text-xs text-zinc-400 uppercase tracking-wider leading-relaxed font-mono">
                        Propozycja wysłana. Oczekiwanie na ruch ze strony rozmówcy...
                      </span>
                    </div>
                  </div>
                )}

                {exchangeState === 'exchanged' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg p-3 gap-3">
                    <div className="flex items-center gap-2.5 font-sans">
                      <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">
                        Kontakt wymieniony: <strong className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg ml-1.5 font-mono text-zinc-300 text-xs select-all">{partnerContact}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (partnerContact) {
                          navigator.clipboard.writeText(partnerContact);
                          alert("Skopiowano do schowka!");
                        }
                      }}
                      className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors outline-none font-mono tracking-wider uppercase border border-zinc-200 self-end sm:self-center"
                    >
                      Skopiuj
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Media Preview Panel */}
        <AnimatePresence>
          {(selectedImage || selectedVideo) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900 border-t border-zinc-800 p-3 flex items-center gap-3 relative shrink-0 font-mono"
            >
              <div 
                onClick={() => setPreviewLightboxOpen(true)}
                className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 shadow-md bg-black cursor-zoom-in hover:border-zinc-700 transition-colors group shrink-0"
                title="Powiększ podgląd"
              >
                {selectedImage ? (
                  <img src={selectedImage} alt="Podgląd" className="w-full h-full object-cover select-none" />
                ) : (
                  <video src={selectedVideo!} className="w-full h-full object-cover select-none" muted />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-zinc-300 font-semibold tracking-wider select-none pointer-events-none">
                  PODGLĄD
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(null);
                    setSelectedVideo(null);
                  }}
                  className="absolute top-0 right-0 bg-red-950/80 hover:bg-red-900 text-red-400 border-l border-b border-red-900/40 rounded-bl w-5 h-5 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer select-none z-10"
                  title="Usuń"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-1 justify-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 select-none">
                  {selectedImage ? "Zdjęcie przygotowane" : "Wideo przygotowane"}
                </span>
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none font-sans">
                  <input
                    type="checkbox"
                    checked={viewOnceChecked}
                    onChange={(e) => setViewOnceChecked(e.target.checked)}
                    className="accent-zinc-100 rounded border-zinc-800 bg-zinc-950 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">Wyświetl tylko raz</span>
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
              className="bg-red-950/20 border-t border-red-900/30 text-red-400 text-xs py-2.5 px-4 text-center select-none font-mono uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Blokada antyspamowa. Możesz wysłać kolejną wiadomość za <strong className="text-zinc-100 font-bold text-sm">{blockedTimeLeft}</strong> s.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {room && isStrangerInRoom && (
          <div className="flex shrink-0">
            <NewRoom
            joinRoom={joinRoom}
            leaveRoom={leaveRoom}
            switchRoom={switchRoom}
            setSwitchRoom={setSwitchRoom}
          />

          {recordingMode !== 'none' ? (
            <div className="flex-1 bg-red-950/20 border-l border-r border-red-800/40 flex items-center justify-between px-3 sm:px-4 py-3 sm:py-5 text-white select-none gap-2 sm:gap-4 overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                {/* Dynamically scaling pulsing dot based on mic volume */}
                <span
                  className="w-3 h-3 rounded-full bg-red-500 shrink-0 transition-transform duration-75 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"
                  style={{ transform: `scale(${1 + (volume / 100) * 0.4})` }}
                ></span>

                {/* Timer */}
                <span className="text-sm font-mono font-semibold shrink-0 text-red-200">
                  {Math.floor(recordingTime / 60)}:{recordingTime % 60 < 10 ? "0" : ""}{recordingTime % 60}
                </span>

                {/* Speak volume visualizer - scrolling wave */}
                <div className="flex items-center gap-[3px] h-8 px-2 overflow-hidden select-none bg-zinc-900/30 rounded-lg max-w-[200px] sm:max-w-[240px] w-full justify-center">
                  {recordingWave.map((vol, idx) => {
                    const barHeight = Math.max(3, Math.round((vol / 100) * 28));
                    return (
                      <div
                        key={idx}
                        style={{ height: `${barHeight}px` }}
                        className={`w-[2px] rounded-full transition-all duration-75 ${
                          vol > 0 ? "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" : "bg-red-500/20"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Subtitle instructions */}
                <span className="text-xs font-medium text-red-300/80 truncate hidden md:inline">
                  {recordingMode === 'holding'
                    ? "Zwolnij aby wysłać, zjedź myszką aby anulować"
                    : "Kliknij przycisk Wyślij lub Kosz"
                  }
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="text-red-400 hover:text-red-300 text-lg cursor-pointer p-1 transition-colors shrink-0"
                title="Anuluj nagrywanie"
              >
                <BsTrash />
              </button>
            </div>
          ) : (
            <Input
              room={room}
              setMessage={setMessage}
              message={message}
              sendMessage={sendMessage}
              isStrangerInRoom={isStrangerInRoom && blockedTimeLeft === 0}
            />
          )}

          {/* Photo attachment trigger */}
          {/* Photo attachment trigger */}
          {recordingMode === 'none' && (
            <label
              className={`px-4 sm:px-6 text-xl flex items-center justify-center transition-colors select-none ${
                !isStrangerInRoom || room === null || blockedTimeLeft > 0
                  ? "bg-zinc-950 text-zinc-700 cursor-not-allowed pointer-events-none"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 cursor-pointer"
              }`}
              title="Wyślij zdjęcie"
            >
              <BsImage />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                disabled={!isStrangerInRoom || room === null || blockedTimeLeft > 0}
              />
            </label>
          )}

          {/* Video attachment trigger */}
          {recordingMode === 'none' && (
            <label
              className={`px-4 sm:px-6 text-xl flex items-center justify-center transition-colors select-none border-l border-zinc-700/50 ${
                !isStrangerInRoom || room === null || blockedTimeLeft > 0
                  ? "bg-zinc-950 text-zinc-700 cursor-not-allowed pointer-events-none"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 cursor-pointer"
              }`}
              title="Wyślij wideo"
            >
              <BsCameraVideo />
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={handleVideoSelect}
                disabled={!isStrangerInRoom || room === null || blockedTimeLeft > 0}
              />
            </label>
          )}

          {/* Icebreaker games dropdown trigger */}
          {recordingMode === 'none' && (
            <div className="relative flex items-center justify-center border-l border-zinc-800/85">
              <button
                type="button"
                onClick={() => setGamesMenuOpen(!gamesMenuOpen)}
                disabled={!isStrangerInRoom || room === null || blockedTimeLeft > 0}
                className={`px-4 sm:px-5 h-full text-lg flex items-center justify-center transition-colors cursor-pointer select-none outline-none ${
                  !isStrangerInRoom || room === null || blockedTimeLeft > 0
                    ? "bg-zinc-950/20 text-zinc-700 cursor-not-allowed pointer-events-none"
                    : "bg-zinc-900/20 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                }`}
                title="Gry lodołamacze (Icebreakers)"
              >
                <BsDice5 />
              </button>

              <AnimatePresence>
                {gamesMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute bottom-full right-0 mb-3 bg-zinc-950/95 border border-zinc-800/80 rounded-xl p-4 shadow-2xl flex flex-col gap-3 w-64 sm:w-72 z-40 text-zinc-200 select-none font-sans backdrop-blur-md"
                  >
                    {/* Tabs */}
                    <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => setGamesTab("standard")}
                        className={`flex-1 text-center py-1.5 rounded-md text-[10px] uppercase font-bold transition-all cursor-pointer outline-none ${
                          gamesTab === "standard"
                            ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                            : "text-zinc-450 hover:text-zinc-350"
                        }`}
                      >
                        Standardowe
                      </button>
                      <button
                        type="button"
                        onClick={() => setGamesTab("custom")}
                        className={`flex-1 text-center py-1.5 rounded-md text-[10px] uppercase font-bold transition-all cursor-pointer outline-none ${
                          gamesTab === "custom"
                            ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
                            : "text-zinc-450 hover:text-zinc-300"
                        }`}
                      >
                        Własne
                      </button>
                    </div>

                    {gamesTab === "standard" ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            triggerIcebreaker("this_or_that");
                            setGamesMenuOpen(false);
                          }}
                          className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors cursor-pointer text-left uppercase tracking-wider outline-none"
                        >
                          To czy To
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerIcebreaker("truth_or_dare");
                            setGamesMenuOpen(false);
                          }}
                          className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors cursor-pointer text-left uppercase tracking-wider outline-none"
                        >
                          Prawda czy Wyzwanie
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Game Type Selection */}
                        <div className="flex gap-2 shrink-0 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80">
                          <button
                            type="button"
                            onClick={() => setCustomGameType("this_or_that")}
                            className={`flex-1 py-1.5 rounded-md text-[9px] font-bold tracking-wide uppercase cursor-pointer text-center transition-all outline-none ${
                              customGameType === "this_or_that"
                                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                : "text-zinc-450 hover:text-zinc-300"
                            }`}
                          >
                            To czy To
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomGameType("truth_or_dare")}
                            className={`flex-1 py-1.5 rounded-md text-[9px] font-bold tracking-wide uppercase cursor-pointer text-center transition-all outline-none ${
                              customGameType === "truth_or_dare"
                                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                : "text-zinc-450 hover:text-zinc-300"
                            }`}
                          >
                            Prawda/Wyzwanie
                          </button>
                        </div>

                        {customGameType === "this_or_that" ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={customQ}
                              onChange={(e) => setCustomQ(e.target.value)}
                              placeholder="Pytanie (np. Kawa czy herbata?)"
                              maxLength={80}
                              className="w-full bg-zinc-900/80 border border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none text-xs py-2.5 px-3 rounded-lg text-zinc-200 outline-none transition-all"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customOpt1}
                                onChange={(e) => setCustomOpt1(e.target.value)}
                                placeholder="Opcja A"
                                maxLength={25}
                                className="flex-1 bg-zinc-900/80 border border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none text-xs py-2.5 px-2.5 rounded-lg text-zinc-200 outline-none transition-all"
                              />
                              <input
                                type="text"
                                value={customOpt2}
                                onChange={(e) => setCustomOpt2(e.target.value)}
                                placeholder="Opcja B"
                                maxLength={25}
                                className="flex-1 bg-zinc-900/80 border border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none text-xs py-2.5 px-2.5 rounded-lg text-zinc-200 outline-none transition-all"
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
                              className="w-full mt-1.5 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-colors text-center uppercase tracking-wider outline-none border border-transparent shadow-md"
                            >
                              Wyślij wyzwanie
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {/* Choice selection */}
                            <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80 shrink-0">
                              <button
                                type="button"
                                onClick={() => setCustomTdChoice("truth")}
                                className={`flex-1 py-1 rounded-md text-[9px] font-bold text-center cursor-pointer transition-all outline-none ${
                                  customTdChoice === "truth"
                                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                    : "text-zinc-450 hover:text-zinc-350"
                                }`}
                              >
                                Prawda
                              </button>
                              <button
                                type="button"
                                onClick={() => setCustomTdChoice("dare")}
                                className={`flex-1 py-1 rounded-md text-[9px] font-bold text-center cursor-pointer transition-all outline-none ${
                                  customTdChoice === "dare"
                                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                                    : "text-zinc-450 hover:text-zinc-350"
                                }`}
                              >
                                Wyzwanie
                              </button>
                            </div>
                            <textarea
                              value={customTdText}
                              onChange={(e) => setCustomTdText(e.target.value)}
                              placeholder={
                                customTdChoice === "truth"
                                  ? "Wpisz pytanie do prawdy..."
                                  : "Wpisz zadanie do wyzwania..."
                              }
                              maxLength={150}
                              rows={2}
                              className="w-full bg-zinc-900/80 border border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none text-xs py-2 px-2.5 rounded-lg resize-none text-zinc-200 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!customTdText.trim()) return alert("Wpisz treść wyzwania!");
                                triggerIcebreaker("truth_or_dare", {
                                  choice: customTdChoice,
                                  text: customTdText.trim()
                                });
                                setCustomTdText("");
                                setGamesMenuOpen(false);
                              }}
                              className="w-full mt-1.5 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-colors text-center uppercase tracking-wider outline-none border border-transparent shadow-md"
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

          {/* Microphone button / Record trigger (supporting hold vs click) */}
          {recordingMode === 'none' && (
            <button
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseLeave}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
              disabled={!isStrangerInRoom || room === null || blockedTimeLeft > 0}
              className={`px-4 sm:px-6 text-xl flex items-center justify-center transition-colors cursor-pointer select-none border-l border-zinc-700/50 outline-none ${
                !isStrangerInRoom || room === null || blockedTimeLeft > 0
                  ? "bg-zinc-950 text-zinc-700 cursor-not-allowed pointer-events-none"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100"
              }`}
              title="Nagraj (kliknij lub przytrzymaj)"
            >
              <BsMic />
            </button>
          )}

          <SendButton
            sendMessage={recordingMode !== 'none' ? () => stopRecording(true) : sendMessage}
            isStrangerInRoom={isStrangerInRoom && blockedTimeLeft === 0}
          />
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
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="relative max-w-full max-h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Podgląd zdjęcia"
                    className="max-w-[95vw] max-h-[80vh] object-contain rounded-lg shadow-2xl border border-zinc-700/50 select-none"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <button
                    onClick={() => setPreviewLightboxOpen(false)}
                    className="mt-4 bg-zinc-800/80 hover:bg-zinc-700 text-white font-semibold text-sm px-6 py-2 rounded-full border border-zinc-700/60 transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    ✕ Zamknij
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
                    className="mt-4 bg-zinc-800/80 hover:bg-zinc-700 text-white font-semibold text-sm px-6 py-2 rounded-full border border-zinc-700/60 transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    ✕ Zamknij
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Chat;
