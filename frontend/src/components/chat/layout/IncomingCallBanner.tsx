import { motion, AnimatePresence } from "framer-motion";
import { BsCameraVideo, BsTelephone, BsTelephoneX } from "react-icons/bs";

import type { CallState, CallType } from "../../../hooks/media/useWebRTC";

export interface IncomingCallBannerProps {
  /** Current WebRTC call state - the banner only renders when this is "incoming". */
  callState: CallState;
  /** Whether the incoming call is a voice or video call. */
  incomingCallType: CallType | null;
  /** Reject the incoming call. */
  onDecline: () => void;
  /** Accept the incoming call. */
  onAccept: () => void;
}

/**
 * @description Floating banner shown at the top of the chat screen when the
 * other peer initiates a voice/video call. Purely presentational - all call
 * state and signaling logic lives in `useWebRTC`.
 *
 * @example
 * <IncomingCallBanner
 *   callState={callState}
 *   incomingCallType={incomingCallType}
 *   onDecline={declineCall}
 *   onAccept={acceptCall}
 * />
 */
export function IncomingCallBanner({
  callState,
  incomingCallType,
  onDecline,
  onAccept,
}: IncomingCallBannerProps) {
  return (
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
                onClick={onDecline}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold cursor-pointer"
              >
                <BsTelephoneX size={14} />
                <span className="hidden sm:inline">Odrzuć</span>
              </button>
              <button
                onClick={onAccept}
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
  );
}
