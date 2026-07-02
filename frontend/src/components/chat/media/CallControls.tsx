import { motion, AnimatePresence } from "framer-motion";
import { type RefObject } from "react";
import {
  BsMic,
  BsMicMute,
  BsCameraVideo,
  BsCameraVideoOff,
  BsTelephone,
  BsTelephoneX,
} from "react-icons/bs";

import type { CallState, CallType } from "../../../hooks/media/useWebRTC";

export interface CallControlsProps {
  callState: CallState;
  callType: CallType | null;
  isMicMuted: boolean;
  isVideoMuted: boolean;
  /** True when the remote peer has muted their microphone. */
  isRemoteMicMuted: boolean;
  /** True when the remote peer has turned off their camera. */
  isRemoteVideoMuted: boolean;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  /** Cancel an outgoing call while it's still ringing (state === "calling"). */
  onCancelOutgoingCall: () => void;
}

/**
 * @description Active call panel: ringing state ("calling") with a cancel
 * button, or the connected state with remote/local video feeds and the
 * mic/camera/hangup controls. Renders nothing outside of "calling" and
 * "connected" - the parent is expected to gate visibility via `AnimatePresence`.
 *
 * All call state and media stream management lives in `useWebRTC` - this
 * component only renders what it's given.
 */
export function CallControls({
  callState,
  callType,
  isMicMuted,
  isVideoMuted,
  isRemoteMicMuted,
  isRemoteVideoMuted,
  localVideoRef,
  remoteVideoRef,
  onToggleMic,
  onToggleCamera,
  onEndCall,
  onCancelOutgoingCall,
}: CallControlsProps) {
  const showAvatars = isVideoMuted && isRemoteVideoMuted;

  return (
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
                    <BsCameraVideo className="text-indigo-400" size={22} />
                  ) : (
                    <BsTelephone className="text-indigo-400" size={22} />
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">Dzwonienie…</p>
                <p className="text-xs text-zinc-500 mt-1">Oczekiwanie na odpowiedź rozmówcy</p>
              </div>
              <button
                onClick={onCancelOutgoingCall}
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
                  className={`w-full h-full object-cover ${showAvatars ? "hidden" : ""}`}
                  style={{
                    minHeight: "220px",
                    maxHeight: "340px",
                    background: "#09090b",
                  }}
                />
                {showAvatars && (
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
                          className={`w-16 h-16 rounded-full border flex items-center justify-center ${
                            isRemoteMicMuted
                              ? "bg-gradient-to-br from-red-500/20 to-zinc-800/30 border-red-500/40"
                              : "bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border-cyan-500/40"
                          }`}
                        >
                          {isRemoteMicMuted ? (
                            <BsMicMute className="text-red-400" size={22} />
                          ) : (
                            <BsMic className="text-cyan-400" size={22} />
                          )}
                        </motion.div>
                        <span className="text-[11px] text-zinc-500">Rozmówca</span>
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
                  onClick={onToggleMic}
                  title={isMicMuted ? "Włącz mikrofon" : "Wycisz mikrofon"}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isMicMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-zinc-800/80 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700"}`}
                >
                  {isMicMuted ? <BsMicMute size={18} /> : <BsMic size={18} />}
                </button>
                <button
                  onClick={onToggleCamera}
                  title={isVideoMuted ? "Włącz kamerę" : "Wyłącz kamerę"}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isVideoMuted ? "bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700" : "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"}`}
                >
                  {isVideoMuted ? <BsCameraVideoOff size={18} /> : <BsCameraVideo size={18} />}
                </button>
                <button
                  onClick={onEndCall}
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
  );
}
