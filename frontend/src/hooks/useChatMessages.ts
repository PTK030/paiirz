import { useState, useRef, useEffect, useCallback } from "react";
import type React from "react";
import type { Socket } from "socket.io-client";

import type { Message, IcebreakerData } from "../types/message";
import {
  messageSchema,
  messageReactionSchema,
  messageUnsentSchema,
  viewOnceConsumedSchema,
  icebreakerUpdatedSchema,
} from "../types/socket.schema";
import { encrypt, encryptBinary, decrypt, decryptBinary } from "../utils/crypto";
import { isSafeMediaDataUrl } from "../utils/mediaUrl";
import { withValidation } from "../utils/socketValidation";
import type { SoundType } from "../utils/sound";

export interface UseChatMessagesCallbacks {
  play: (sound: SoundType) => void;
  incrementSent: (opts: { text?: number; image?: number; audio?: number; words?: number }) => void;
  incrementReceived: (opts: { text?: number; image?: number; audio?: number }) => void;
  triggerTitleNotification: () => void;
}

/** Payload for a text/image/video message being sent to the current room. */
export interface OutgoingMessage {
  room: string;
  text?: string;
  image?: string | null;
  video?: string | null;
  viewOnce?: boolean;
  vanishing?: boolean;
}

export interface UseChatMessagesReturn {
  chat: Message[];
  setChat: React.Dispatch<React.SetStateAction<Message[]>>;
  /** Empties the conversation (call when entering a new room). */
  clearChat: () => void;
  /** Appends a locally-generated system message (not sent over the wire). */
  addSystemMessage: (text: string) => void;
  /** Encrypts (if possible) and sends a text/image/video message. */
  sendMessage: (sharedKey: CryptoKey | null, input: OutgoingMessage) => Promise<void>;
  /** Encrypts (if possible) and sends a voice recording. */
  sendAudioMessage: (
    sharedKey: CryptoKey | null,
    room: string,
    audioDataUrl: string,
    vanishing: boolean
  ) => Promise<void>;
  /** Sets or clears the current user's reaction on a message. */
  sendReaction: (room: string, messageId: string, reaction: string | null) => void;
  /** Retracts a previously sent message for both parties. */
  unsendMessage: (room: string, messageId: string) => void;
  /** Removes a message from the local view only (does not notify the peer). */
  removeMessageForMe: (messageId: string) => void;
  /** Removes a vanished message from the local view (vanish-mode timeout). */
  removeVanishedMessage: (messageId: string) => void;
  /** Marks a view-once media message as consumed, locally and on the server. */
  consumeViewOnce: (room: string, messageId: string) => void;
}

/**
 * @description Owns the chat message list and everything that mutates it:
 * incoming/outgoing messages, reactions, unsend, view-once consumption, and
 * icebreaker updates. Encrypts outgoing payloads end-to-end when a shared
 * key is available and decrypts/validates incoming ones (rejecting any
 * media that isn't a well-formed `data:` URI of the expected type).
 *
 * @param socket - active socket.io client (or null while connecting)
 * @param sharedKeyRef - stable ref to the current E2EE shared key (from `useE2EE`)
 * @param callbacks - side effects for sound/notification/session-stats concerns
 * @returns The chat message list and all actions that mutate it.
 */
export function useChatMessages(
  socket: Socket | null,
  sharedKeyRef: React.RefObject<CryptoKey | null>,
  callbacks: UseChatMessagesCallbacks
): UseChatMessagesReturn {
  const [chat, setChat] = useState<Message[]>([]);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const clearChat = useCallback(() => setChat([]), []);

  const addSystemMessage = useCallback((text: string) => {
    setChat((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sid: "system", message: text, reactions: {} },
    ]);
  }, []);

  // ── Socket event handlers ─────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onMessage = async (data: Message) => {
      if (data.sid === socket.id) return;

      const decrypted = { ...data };
      const sharedKey = sharedKeyRef.current;
      if (sharedKey && data.e2e) {
        const { iv } = data.e2e;
        try {
          if (data.message) decrypted.message = await decrypt(sharedKey, { ct: data.message, iv });
          if (data.image) decrypted.image = await decryptBinary(sharedKey, { ct: data.image, iv });
          if (data.audio) decrypted.audio = await decryptBinary(sharedKey, { ct: data.audio, iv });
          if (data.video) decrypted.video = await decryptBinary(sharedKey, { ct: data.video, iv });
        } catch (err) {
          console.error("[E2EE] Decryption failed:", err);
          decrypted.message = "[Nie można odszyfrować wiadomości]";
        }
      }

      // Defense in depth: only ever render media that is a well-formed
      // `data:` URI of the expected type - never trust the wire directly.
      if (!isSafeMediaDataUrl(decrypted.image, "image")) decrypted.image = undefined;
      if (!isSafeMediaDataUrl(decrypted.video, "video")) decrypted.video = undefined;
      if (!isSafeMediaDataUrl(decrypted.audio, "audio")) decrypted.audio = undefined;

      setChat((prev) => {
        if (prev.some((m) => m.id === decrypted.id)) return prev;
        callbacksRef.current.play("receive");
        callbacksRef.current.triggerTitleNotification();
        callbacksRef.current.incrementReceived({
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
        })
      );
    };

    const onMessageUnsent = ({ messageId }: { messageId: string }) => {
      setChat((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, message: undefined, image: undefined, audio: undefined, isUnsent: true }
            : m
        )
      );
    };

    const onViewOnceConsumed = ({ messageId }: { messageId: string }) => {
      setChat((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, image: undefined, message: "Zdjęcie wygasło" } : m
        )
      );
    };

    const onIcebreakerUpdated = ({
      messageId,
      icebreaker,
    }: {
      messageId: string;
      icebreaker: IcebreakerData;
    }) => {
      if (icebreaker?.status === "proposed") callbacksRef.current.play("invite");
      else if (icebreaker?.status === "pending" || icebreaker?.status === "revealed")
        callbacksRef.current.play("game_start");
      setChat((prev) => prev.map((m) => (m.id === messageId ? { ...m, icebreaker } : m)));
    };

    const validatedOnMessage = withValidation(messageSchema, onMessage);
    const validatedOnMessageReaction = withValidation(messageReactionSchema, onMessageReaction);
    const validatedOnMessageUnsent = withValidation(messageUnsentSchema, onMessageUnsent);
    const validatedOnViewOnceConsumed = withValidation(viewOnceConsumedSchema, onViewOnceConsumed);
    const validatedOnIcebreakerUpdated = withValidation(
      icebreakerUpdatedSchema,
      onIcebreakerUpdated
    );

    socket.on("message", validatedOnMessage);
    socket.on("message_reaction", validatedOnMessageReaction);
    socket.on("message_unsent", validatedOnMessageUnsent);
    socket.on("view_once_consumed", validatedOnViewOnceConsumed);
    socket.on("icebreaker_updated", validatedOnIcebreakerUpdated);

    return () => {
      socket.off("message", validatedOnMessage);
      socket.off("message_reaction", validatedOnMessageReaction);
      socket.off("message_unsent", validatedOnMessageUnsent);
      socket.off("view_once_consumed", validatedOnViewOnceConsumed);
      socket.off("icebreaker_updated", validatedOnIcebreakerUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // ── Outgoing actions ───────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (sharedKey: CryptoKey | null, input: OutgoingMessage) => {
      if (!socket || (!input.text && !input.image && !input.video)) return;

      const msgId = crypto.randomUUID();
      let encMsg: string | undefined = input.text || undefined;
      let encImg: string | undefined = input.image || undefined;
      let encVid: string | undefined = input.video || undefined;
      let e2eMeta: { iv: string } | undefined;

      if (sharedKey) {
        try {
          if (input.text) {
            const p = await encrypt(sharedKey, input.text);
            encMsg = p.ct;
            e2eMeta = { iv: p.iv };
          }
          if (input.image) {
            const p = await encryptBinary(sharedKey, input.image);
            encImg = p.ct;
            if (!input.text) e2eMeta = { iv: p.iv };
          }
          if (input.video) {
            const p = await encryptBinary(sharedKey, input.video);
            encVid = p.ct;
            if (!input.text && !input.image) e2eMeta = { iv: p.iv };
          }
        } catch (err) {
          console.error("[E2EE] Encryption failed:", err);
        }
      }

      const newMsg: Message = {
        id: msgId,
        sid: socket.id ?? "",
        message: input.text || undefined,
        image: input.image || undefined,
        video: input.video || undefined,
        reactions: {},
        vanishing: input.vanishing || undefined,
        viewOnce: (input.image || input.video) && input.viewOnce ? true : undefined,
      };

      setChat((prev) => [...prev, newMsg]);
      socket.emit("message", {
        room: input.room,
        id: msgId,
        message: encMsg,
        image: encImg,
        video: encVid,
        vanishing: input.vanishing || undefined,
        viewOnce: (input.image || input.video) && input.viewOnce ? true : undefined,
        e2e: e2eMeta,
      });

      const words = input.text ? input.text.trim().split(/\s+/).filter(Boolean).length : 0;
      callbacksRef.current.incrementSent({
        text: input.text ? 1 : 0,
        image: input.image || input.video ? 1 : 0,
        words,
      });
      callbacksRef.current.play("send");
    },
    [socket]
  );

  const sendAudioMessage = useCallback(
    async (sharedKey: CryptoKey | null, room: string, audioDataUrl: string, vanishing: boolean) => {
      if (!socket) return;

      const msgId = crypto.randomUUID();
      let audioPayload = audioDataUrl;
      let e2eMeta: { iv: string } | undefined;

      if (sharedKey) {
        try {
          const p = await encryptBinary(sharedKey, audioDataUrl);
          audioPayload = p.ct;
          e2eMeta = { iv: p.iv };
        } catch (err) {
          console.error("[E2EE] Audio encryption failed:", err);
        }
      }

      const newMsg: Message = {
        id: msgId,
        sid: socket.id ?? "",
        audio: audioDataUrl,
        reactions: {},
        vanishing: vanishing || undefined,
      };

      setChat((prev) => [...prev, newMsg]);
      socket.emit("message", {
        room,
        id: msgId,
        audio: audioPayload,
        vanishing: vanishing || undefined,
        e2e: e2eMeta,
      });
      callbacksRef.current.incrementSent({ audio: 1 });
      callbacksRef.current.play("send");
    },
    [socket]
  );

  const sendReaction = useCallback(
    (room: string, messageId: string, reaction: string | null) => {
      if (!socket) return;
      setChat((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...m.reactions };
          const sid = socket.id ?? "";
          if (reaction) reactions[sid] = reaction;
          else delete reactions[sid];
          return { ...m, reactions };
        })
      );
      socket.emit("message_reaction", { room, messageId, reaction });
    },
    [socket]
  );

  const unsendMessage = useCallback(
    (room: string, messageId: string) => {
      if (!socket) return;
      socket.emit("unsend_message", { room, messageId });
      setChat((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, message: undefined, image: undefined, audio: undefined, isUnsent: true }
            : m
        )
      );
    },
    [socket]
  );

  const removeMessageForMe = useCallback((messageId: string) => {
    setChat((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const removeVanishedMessage = useCallback((messageId: string) => {
    setChat((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const consumeViewOnce = useCallback(
    (room: string, messageId: string) => {
      setChat((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, image: undefined, message: "🔒 Zdjęcie wygasło" } : m
        )
      );
      if (socket) socket.emit("view_once_consumed", { room, messageId });
    },
    [socket]
  );

  return {
    chat,
    setChat,
    clearChat,
    addSystemMessage,
    sendMessage,
    sendAudioMessage,
    sendReaction,
    unsendMessage,
    removeMessageForMe,
    removeVanishedMessage,
    consumeViewOnce,
  };
}
