import type { Message, IcebreakerData } from "./message";

export interface RoomJoinedPayload {
  room: string;
  sid: string;
}

export interface E2eKeyExchangePayload {
  sender_sid: string;
  publicKey: string;
}

export interface TypingPayload {
  sid: string;
  typing: boolean;
}

export interface MessageReactionPayload {
  messageId: string;
  sid: string;
  reaction: string | null;
}

export interface RateLimitPayload {
  message: string;
  duration: number;
}

export interface VanishToggledPayload {
  sid: string;
  active: boolean;
}

export interface ScreenshotPayload {
  viewOnce?: boolean;
}

export interface IcebreakerUpdatedPayload {
  messageId: string;
  icebreaker: IcebreakerData;
}

export interface PrivateRoomCreatedPayload {
  room: string;
  code: string;
}

export interface PrivateRoomErrorPayload {
  message: string;
}

export interface TabHiddenPayload {
  hidden: boolean;
}

export interface ContactExchangedPayload {
  contact: string;
}

export interface UserCountPayload {
  count: number;
}

export interface WebRtcSignalPayload {
  sender_sid: string;
  signal: {
    type: string;
    callType?: "voice" | "video";
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
}

export interface MessageUnsent {
  messageId: string;
}

export interface ViewOnceConsumed {
  messageId: string;
}

// Re-export for convenience
export type { Message };
