import { z } from "zod";

import { messageSchema, icebreakerDataSchema } from "./message.schema";

/**
 * @description Runtime (Zod) schemas for every socket.io event payload the
 * client receives. Every event received from `socket.io` originates outside
 * our trust boundary (the other peer, or a malicious client impersonating
 * one) and MUST be validated here (via `withValidation`) before the app acts
 * on it.
 */

export const roomJoinedSchema = z.object({
  room: z.string(),
  sid: z.string(),
});

export const e2eKeyExchangeSchema = z.object({
  sender_sid: z.string(),
  publicKey: z.string(),
});

export const typingSchema = z.object({
  sid: z.string(),
  typing: z.boolean(),
});

export const messageReactionSchema = z.object({
  messageId: z.string(),
  sid: z.string(),
  reaction: z.string().nullable(),
});

export const rateLimitSchema = z.object({
  message: z.string(),
  duration: z.number(),
});

export const vanishToggledSchema = z.object({
  sid: z.string(),
  active: z.boolean(),
});

export const screenshotSchema = z.object({
  viewOnce: z.boolean().optional(),
});

export const icebreakerUpdatedSchema = z.object({
  messageId: z.string(),
  icebreaker: icebreakerDataSchema,
});

export const privateRoomCreatedSchema = z.object({
  room: z.string(),
  code: z.string(),
});

export const privateRoomErrorSchema = z.object({
  message: z.string(),
});

export const tabHiddenSchema = z.object({
  hidden: z.boolean(),
});

export const contactExchangedSchema = z.object({
  contact: z.string(),
});

export const userCountSchema = z.object({
  count: z.number(),
});

export const webRtcSignalSchema = z.object({
  sender_sid: z.string(),
  signal: z.object({
    type: z.string(),
    callType: z.enum(["voice", "video"]).optional(),
    sdp: z.custom<RTCSessionDescriptionInit>().optional(),
    candidate: z.custom<RTCIceCandidateInit>().optional(),
    /** Present for mic-mute and video-mute signals. */
    muted: z.boolean().optional(),
  }),
});

export const messageUnsentSchema = z.object({
  messageId: z.string(),
});

export const viewOnceConsumedSchema = z.object({
  messageId: z.string(),
});

export const roomIdSchema = z.string();

export const roomLeftReasonSchema = z.string().optional();

export { messageSchema };
