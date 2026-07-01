import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";

import { webRtcSignalSchema } from "../types/socket.schema";
import { withValidation } from "../utils/socketValidation";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CallState = "idle" | "calling" | "incoming" | "connected";
export type CallType = "voice" | "video";

/** Return type of {@link useWebRTC} - call state, media streams, and call actions. */
export interface UseWebRTCReturn {
  callState: CallState;
  callType: CallType | null;
  incomingCallType: CallType | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMicMuted: boolean;
  isVideoMuted: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  startCall: (type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => Promise<void>;
}

// ─── ICE Servers ─────────────────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ─── Video Constraints (720p) ────────────────────────────────────────────────

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24 },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * @description Manages a single peer-to-peer voice/video call over an
 * existing chat room, using the socket connection purely as a signaling
 * channel (offer/answer/ICE candidates relayed via `webrtc_signal`). Owns the
 * `RTCPeerConnection` lifecycle, local/remote `MediaStream`s, and mic/camera
 * toggle state; renders nothing itself, but exposes refs for the caller's
 * `<video>` elements.
 * @param socket - Active socket.io connection, or `null` before it connects.
 * @param room - Current room id the call signals are scoped to, or `null`.
 * @returns Call state/media streams and the actions to start/accept/decline/end a call.
 */
export function useWebRTC(socket: Socket | null, room: string | null): UseWebRTCReturn {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [incomingCallType, setIncomingCallType] = useState<CallType | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const isInitiatorRef = useRef(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const sendSignal = useCallback(
    (signal: object) => {
      if (socket && room) {
        socket.emit("webrtc_signal", { room, signal });
      }
    },
    [socket, room]
  );

  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
  };

  const closePeer = () => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  /** @description Stops local media tracks, closes the peer connection, and resets all call state to idle. */
  const endCall = useCallback(() => {
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    closePeer();
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setCallType(null);
    setIncomingCallType(null);
    setIsMicMuted(false);
    setIsVideoMuted(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const createPeerConnection = useCallback(
    (onRemoteStream: (stream: MediaStream) => void): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ type: "ice-candidate", candidate: event.candidate });
        }
      };

      const remoteMediaStream = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteMediaStream.addTrack(track);
        });
        onRemoteStream(remoteMediaStream);
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "closed"
        ) {
          endCall();
        }
      };

      return pc;
    },
    [sendSignal, endCall]
  );

  const getLocalMedia = async (type: CallType): Promise<MediaStream> => {
    let devices: MediaDeviceInfo[] = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch (e) {
      console.warn("Could not enumerate devices:", e);
    }

    const hasMic = devices.some((d) => d.kind === "audioinput");
    const hasCam = devices.some((d) => d.kind === "videoinput");

    if (!hasMic && (devices.length > 0 || navigator.mediaDevices)) {
      throw new Error("Brak podłączonego mikrofonu. Podłącz mikrofon, aby móc rozmawiać.");
    }

    if (type === "video" && !hasCam && (devices.length > 0 || navigator.mediaDevices)) {
      throw new Error("Brak podłączonej kamery. Podłącz kamerę lub wybierz połączenie głosowe.");
    }

    const constraints: MediaStreamConstraints =
      type === "voice" ? { audio: true, video: false } : { audio: true, video: VIDEO_CONSTRAINTS };
    return navigator.mediaDevices.getUserMedia(constraints);
  };

  const addLocalTracks = (pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  };

  // ── Public actions ──────────────────────────────────────────────────────────

  /** @description Requests the local media device, then signals a call request to the peer. */
  const startCall = useCallback(
    async (type: CallType) => {
      if (!socket || !room) return;
      try {
        const stream = await getLocalMedia(type);
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCallType(type);
        setIsVideoMuted(type === "voice");
        isInitiatorRef.current = true;
        setCallState("calling");
        sendSignal({ type: "call-request", callType: type });
      } catch (err: unknown) {
        console.error("WebRTC startCall error:", err);
        const detail = err instanceof Error ? err.message : String(err);
        alert(`Brak dostępu do urządzeń multimedialnych. Szczegóły: ${detail}`);
      }
    },
    [socket, room, sendSignal]
  );

  /** @description Accepts an incoming call: grabs local media, creates the peer connection, and signals acceptance. */
  const acceptCall = useCallback(async () => {
    if (!incomingCallType) return;
    const type = incomingCallType;
    try {
      const stream = await getLocalMedia(type);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallType(type);
      setIsVideoMuted(type === "voice");
      setCallState("connected");

      const pc = createPeerConnection((remoteMedia) => {
        setRemoteStream(remoteMedia);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteMedia;
      });
      pcRef.current = pc;
      addLocalTracks(pc, stream);
      sendSignal({ type: "call-accept" });
    } catch (err: unknown) {
      console.error("WebRTC acceptCall error:", err);
      const detail = err instanceof Error ? err.message : String(err);
      alert(`Brak dostępu do urządzeń multimedialnych. Szczegóły: ${detail}`);
      declineCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCallType, createPeerConnection, sendSignal]);

  /** @description Signals a decline to the peer and tears down any local call state. */
  const declineCall = useCallback(() => {
    sendSignal({ type: "call-decline" });
    endCall();
  }, [sendSignal, endCall]);

  /** @description Mutes/unmutes the local microphone track in place (no renegotiation needed). */
  const toggleMic = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
    }
  }, []);

  /**
   * @description Toggles the local camera on/off. Turning off simply stops
   * and removes the video track; turning back on re-acquires a fresh video
   * track and renegotiates the peer connection with a new offer, since
   * WebRTC senders can't resume a stopped track in place.
   */
  const toggleCamera = useCallback(async () => {
    const pc = pcRef.current;
    const currentStream = localStreamRef.current;

    if (!isVideoMuted) {
      // Turn camera OFF
      const videoTrack = currentStream?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        currentStream?.removeTrack(videoTrack);
        const sender = pc?.getSenders().find((s) => s.track === videoTrack);
        if (sender && pc) pc.removeTrack(sender);
      }
      setIsVideoMuted(true);
    } else {
      // Turn camera ON
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        currentStream?.addTrack(videoTrack);
        if (pc) {
          pc.addTrack(videoTrack, currentStream ?? videoStream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: "offer", sdp: pc.localDescription });
        }
        setIsVideoMuted(false);
        if (localVideoRef.current && currentStream) {
          localVideoRef.current.srcObject = currentStream;
        }
        setLocalStream(() => (currentStream ? new MediaStream(currentStream.getTracks()) : null));
      } catch {
        alert("Nie mozna uruchomić kamery. Sprawdz uprawnienia przegladarki.");
      }
    }
  }, [isVideoMuted, sendSignal]);

  // ── Socket signal handler ───────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({
      signal,
    }: {
      sender_sid: string;
      signal: {
        type: string;
        callType?: CallType;
        sdp?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      };
    }) => {
      const { type } = signal;

      if (type === "call-request") {
        setIncomingCallType(signal.callType ?? "voice");
        setCallState("incoming");
        return;
      }

      if (type === "call-decline" || type === "call-hangup") {
        endCall();
        return;
      }

      if (type === "call-accept") {
        if (!isInitiatorRef.current) return;
        setCallState("connected");

        const pc = createPeerConnection((remoteMedia) => {
          setRemoteStream(remoteMedia);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteMedia;
        });
        pcRef.current = pc;
        const stream = localStreamRef.current;
        if (stream) addLocalTracks(pc, stream);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: "offer", sdp: pc.localDescription });
        return;
      }

      if (type === "offer" && signal.sdp) {
        let pc = pcRef.current;
        if (!pc) {
          pc = createPeerConnection((remoteMedia) => {
            setRemoteStream(remoteMedia);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteMedia;
          });
          pcRef.current = pc;
          const stream = localStreamRef.current;
          if (stream) addLocalTracks(pc, stream);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: "answer", sdp: pc.localDescription });
        return;
      }

      if (type === "answer" && signal.sdp && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        return;
      }

      if (type === "ice-candidate" && signal.candidate && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {
          // Ignore stale candidates
        }
      }
    };

    const validatedHandler = withValidation(webRtcSignalSchema, handleSignal);
    socket.on("webrtc_signal", validatedHandler);
    return () => {
      socket.off("webrtc_signal", validatedHandler);
    };
  }, [socket, createPeerConnection, sendSignal, endCall]);

  // ── Sync local stream to video element ──────────────────────────────────────

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return {
    callState,
    callType,
    incomingCallType,
    localStream,
    remoteStream,
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
  };
}
