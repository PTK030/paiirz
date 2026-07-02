import { renderHook, act, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import type { Socket } from "socket.io-client";
import { describe, it, expect, vi } from "vitest";

import {
  useChatMessages,
  type UseChatMessagesCallbacks,
} from "../../../hooks/core/useChatMessages";
import { generateKeyPair, deriveSharedKey } from "../../../utils/crypto";
import { createFakeSocket } from "../../fakeSocket";

function makeCallbacks(): UseChatMessagesCallbacks {
  return {
    play: vi.fn(),
    incrementSent: vi.fn(),
    incrementReceived: vi.fn(),
    triggerTitleNotification: vi.fn(),
  };
}

function noKeyRef(): RefObject<CryptoKey | null> {
  return { current: null };
}

async function sharedKeyRefs(): Promise<
  [RefObject<CryptoKey | null>, RefObject<CryptoKey | null>]
> {
  const a = await generateKeyPair();
  const b = await generateKeyPair();
  const sharedA = await deriveSharedKey(a.privateKey, b.publicKey);
  const sharedB = await deriveSharedKey(b.privateKey, a.publicKey);
  return [{ current: sharedA }, { current: sharedB }];
}

describe("useChatMessages", () => {
  it("starts with an empty conversation", () => {
    const { socket } = createFakeSocket();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    expect(result.current.chat).toEqual([]);
  });

  it("appends a plaintext message and plays the send sound when no shared key is set", async () => {
    const { socket } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), callbacks));

    await act(async () => {
      await result.current.sendMessage(null, { room: "room-1", text: "cześć" });
    });

    expect(result.current.chat).toHaveLength(1);
    expect(result.current.chat[0].message).toBe("cześć");
    expect(result.current.chat[0].sid).toBe("me");
    expect(socket.emit).toHaveBeenCalledWith(
      "message",
      expect.objectContaining({ room: "room-1", message: "cześć", e2e: undefined })
    );
    expect(callbacks.play).toHaveBeenCalledWith("send");
    expect(callbacks.incrementSent).toHaveBeenCalledWith({ text: 1, image: 0, words: 1 });
  });

  it("encrypts the outgoing payload when a shared key is available", async () => {
    const [sharedRef] = await sharedKeyRefs();
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendMessage(sharedRef.current, { room: "room-1", text: "tajne" });
    });

    const [, payload] = vi.mocked(socket.emit).mock.calls[0];
    expect((payload as { message: string }).message).not.toBe("tajne");
    expect((payload as { e2e?: { iv: string } }).e2e?.iv).toBeTruthy();
    // The locally-rendered copy is never encrypted - only the wire payload is.
    expect(result.current.chat[0].message).toBe("tajne");
  });

  it("does nothing when the message is empty and has no media", async () => {
    const { socket } = createFakeSocket();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendMessage(null, { room: "room-1" });
    });

    expect(result.current.chat).toEqual([]);
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("ignores an incoming message that echoes our own socket id", async () => {
    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      trigger("message", { id: "1", sid: "me", message: "echo", reactions: {} });
      await Promise.resolve();
    });

    expect(result.current.chat).toEqual([]);
  });

  it("decrypts an incoming encrypted message using the shared key", async () => {
    const [senderRef, receiverRef] = await sharedKeyRefs();
    const { encrypt } = await import("../../../utils/crypto");
    const encrypted = await encrypt(senderRef.current!, "witaj");

    const { socket, trigger } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, receiverRef, callbacks));

    await act(async () => {
      trigger("message", {
        id: "msg-1",
        sid: "stranger",
        message: encrypted.ct,
        reactions: {},
        e2e: { iv: encrypted.iv },
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.chat).toHaveLength(1));
    expect(result.current.chat[0].message).toBe("witaj");
    expect(callbacks.play).toHaveBeenCalledWith("receive");
    expect(callbacks.incrementReceived).toHaveBeenCalledWith({ text: 1, image: 0, audio: 0 });
  });

  it("shows a decryption-failure placeholder when the shared key doesn't match", async () => {
    const [senderRef] = await sharedKeyRefs();
    const [, unrelatedReceiverRef] = await sharedKeyRefs();
    const { encrypt } = await import("../../../utils/crypto");
    const encrypted = await encrypt(senderRef.current!, "sekret");

    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() =>
      useChatMessages(socket, unrelatedReceiverRef, makeCallbacks())
    );

    await act(async () => {
      trigger("message", {
        id: "msg-1",
        sid: "stranger",
        message: encrypted.ct,
        reactions: {},
        e2e: { iv: encrypted.iv },
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.chat).toHaveLength(1));
    expect(result.current.chat[0].message).toBe("[Nie można odszyfrować wiadomości]");
  });

  it("strips an unsafe (non data: URI) image before rendering, as defense in depth", async () => {
    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      trigger("message", {
        id: "msg-1",
        sid: "stranger",
        image: "https://evil.example.com/payload.png",
        reactions: {},
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.chat).toHaveLength(1));
    expect(result.current.chat[0].image).toBeUndefined();
  });

  it("deduplicates a message that arrives twice (e.g. a socket reconnect replay)", async () => {
    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      trigger("message", { id: "dup-1", sid: "stranger", message: "hej", reactions: {} });
      await Promise.resolve();
    });
    await act(async () => {
      trigger("message", { id: "dup-1", sid: "stranger", message: "hej", reactions: {} });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.chat).toHaveLength(1));
  });

  it("sets a reaction on the target message only, leaving others untouched", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([
        { id: "a", sid: "me", message: "a", reactions: {} },
        { id: "b", sid: "me", message: "b", reactions: {} },
      ])
    );

    act(() => result.current.sendReaction("room-1", "a", "👍"));

    expect(result.current.chat.find((m) => m.id === "a")?.reactions).toEqual({ me: "👍" });
    expect(result.current.chat.find((m) => m.id === "b")?.reactions).toEqual({});
    expect(socket.emit).toHaveBeenCalledWith("message_reaction", {
      room: "room-1",
      messageId: "a",
      reaction: "👍",
    });
  });

  it("marks a message as unsent and clears its content", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() => result.current.setChat([{ id: "a", sid: "me", message: "sekret", reactions: {} }]));

    act(() => result.current.unsendMessage("room-1", "a"));

    expect(result.current.chat[0].isUnsent).toBe(true);
    expect(result.current.chat[0].message).toBeUndefined();
    expect(socket.emit).toHaveBeenCalledWith("unsend_message", { room: "room-1", messageId: "a" });
  });

  it("sends a plaintext audio message when no shared key is set", async () => {
    const { socket } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), callbacks));

    await act(async () => {
      await result.current.sendAudioMessage(null, "room-1", "data:audio/webm;base64,abc", true);
    });

    expect(result.current.chat).toHaveLength(1);
    expect(result.current.chat[0].audio).toBe("data:audio/webm;base64,abc");
    expect(result.current.chat[0].vanishing).toBe(true);
    expect(socket.emit).toHaveBeenCalledWith(
      "message",
      expect.objectContaining({
        room: "room-1",
        audio: "data:audio/webm;base64,abc",
        e2e: undefined,
      })
    );
    expect(callbacks.incrementSent).toHaveBeenCalledWith({ audio: 1 });
    expect(callbacks.play).toHaveBeenCalledWith("send");
  });

  it("encrypts an outgoing audio message when a shared key is available", async () => {
    const [sharedRef] = await sharedKeyRefs();
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendAudioMessage(
        sharedRef.current,
        "room-1",
        "data:audio/webm;base64,plaintext",
        false
      );
    });

    const [, payload] = vi.mocked(socket.emit).mock.calls[0];
    expect((payload as { audio: string }).audio).not.toBe("data:audio/webm;base64,plaintext");
    expect((payload as { e2e?: { iv: string } }).e2e?.iv).toBeTruthy();
    // The locally-rendered copy is never encrypted.
    expect(result.current.chat[0].audio).toBe("data:audio/webm;base64,plaintext");
  });

  it("removes a vanished message from the local view", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() => result.current.setChat([{ id: "a", sid: "me", message: "x", reactions: {} }]));

    act(() => result.current.removeVanishedMessage("a"));

    expect(result.current.chat).toEqual([]);
  });

  it("updates the icebreaker payload on the target message only and plays the matching sound", () => {
    const { socket, trigger } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), callbacks));
    act(() =>
      result.current.setChat([
        { id: "a", sid: "system", reactions: {} },
        { id: "b", sid: "system", reactions: {} },
      ])
    );

    const icebreaker = {
      type: "this_or_that" as const,
      question: "Plaża czy góry?",
      votes: {},
      status: "proposed" as const,
    };
    act(() => trigger("icebreaker_updated", { messageId: "a", icebreaker }));

    expect(result.current.chat.find((m) => m.id === "a")?.icebreaker).toEqual(icebreaker);
    expect(result.current.chat.find((m) => m.id === "b")?.icebreaker).toBeUndefined();
    expect(callbacks.play).toHaveBeenCalledWith("invite");
  });

  it("plays the game_start sound once the icebreaker becomes pending", () => {
    const { socket, trigger } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), callbacks));
    act(() => result.current.setChat([{ id: "a", sid: "system", reactions: {} }]));

    act(() =>
      trigger("icebreaker_updated", {
        messageId: "a",
        icebreaker: {
          type: "this_or_that",
          question: "Plaża czy góry?",
          votes: {},
          status: "pending",
        },
      })
    );

    expect(callbacks.play).toHaveBeenCalledWith("game_start");
  });

  it("plays the game_start sound once the icebreaker becomes revealed", () => {
    const { socket, trigger } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), callbacks));
    act(() => result.current.setChat([{ id: "a", sid: "system", reactions: {} }]));

    act(() =>
      trigger("icebreaker_updated", {
        messageId: "a",
        icebreaker: {
          type: "this_or_that",
          question: "Plaża czy góry?",
          votes: { a: "Plaża" },
          status: "revealed",
        },
      })
    );

    expect(callbacks.play).toHaveBeenCalledWith("game_start");
  });

  it("falls back to plaintext audio when encryption throws", async () => {
    const [sharedRef] = await sharedKeyRefs();
    vi.spyOn(crypto.subtle, "encrypt").mockRejectedValueOnce(new Error("boom"));
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendAudioMessage(
        sharedRef.current,
        "room-1",
        "data:audio/webm;base64,plaintext",
        false
      );
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "message",
      expect.objectContaining({ audio: "data:audio/webm;base64,plaintext", e2e: undefined })
    );
  });

  it("removes an existing reaction when the same emoji is sent again as null", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([{ id: "a", sid: "stranger", message: "x", reactions: { me: "👍" } }])
    );

    act(() => result.current.sendReaction("room-1", "a", null));

    expect(result.current.chat[0].reactions).toEqual({});
  });

  it("leaves other messages untouched when unsending one message", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([
        { id: "a", sid: "me", message: "keep me", reactions: {} },
        { id: "b", sid: "me", message: "unsend me", reactions: {} },
      ])
    );

    act(() => result.current.unsendMessage("room-1", "b"));

    expect(result.current.chat.find((m) => m.id === "a")?.message).toBe("keep me");
    expect(result.current.chat.find((m) => m.id === "b")?.isUnsent).toBe(true);
  });

  it("removes a message locally without notifying the peer", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() => result.current.setChat([{ id: "a", sid: "me", message: "x", reactions: {} }]));

    act(() => result.current.removeMessageForMe("a"));

    expect(result.current.chat).toEqual([]);
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("marks view-once media as consumed locally (leaving others untouched) and notifies the server", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([
        { id: "a", sid: "stranger", image: "data:image/png;base64,x", reactions: {} },
        { id: "b", sid: "stranger", image: "data:image/png;base64,y", reactions: {} },
      ])
    );

    act(() => result.current.consumeViewOnce("room-1", "a"));

    expect(result.current.chat.find((m) => m.id === "a")?.image).toBeUndefined();
    expect(result.current.chat.find((m) => m.id === "a")?.message).toContain("wygasło");
    expect(result.current.chat.find((m) => m.id === "b")?.image).toBe("data:image/png;base64,y");
    expect(socket.emit).toHaveBeenCalledWith("view_once_consumed", {
      room: "room-1",
      messageId: "a",
    });
  });

  it("clears the whole conversation", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() => result.current.setChat([{ id: "a", sid: "me", message: "x", reactions: {} }]));

    act(() => result.current.clearChat());

    expect(result.current.chat).toEqual([]);
  });

  it("appends a local system message without emitting anything over the wire", () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    act(() => result.current.addSystemMessage("Rozmówca dołączył"));

    expect(result.current.chat[0]).toMatchObject({ sid: "system", message: "Rozmówca dołączył" });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("applies a reaction to only the targeted message via the message_reaction event", () => {
    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([
        { id: "a", sid: "me", message: "x", reactions: { me: "👍" } },
        { id: "b", sid: "me", message: "y", reactions: {} },
      ])
    );

    act(() => trigger("message_reaction", { messageId: "a", sid: "stranger", reaction: "❤️" }));

    expect(result.current.chat.find((m) => m.id === "a")?.reactions).toEqual({
      me: "👍",
      stranger: "❤️",
    });
    expect(result.current.chat.find((m) => m.id === "b")?.reactions).toEqual({});
  });

  it("clears a remote reaction pushed as null via the message_reaction event", () => {
    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([{ id: "a", sid: "me", message: "x", reactions: { stranger: "❤️" } }])
    );

    act(() => trigger("message_reaction", { messageId: "a", sid: "stranger", reaction: null }));

    expect(result.current.chat[0].reactions).toEqual({});
  });

  it("marks only the targeted message unsent when the remote peer emits message_unsent", () => {
    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([
        { id: "a", sid: "stranger", message: "sekret", reactions: {} },
        { id: "b", sid: "stranger", message: "keep me", reactions: {} },
      ])
    );

    act(() => trigger("message_unsent", { messageId: "a" }));

    expect(result.current.chat.find((m) => m.id === "a")?.isUnsent).toBe(true);
    expect(result.current.chat.find((m) => m.id === "a")?.message).toBeUndefined();
    expect(result.current.chat.find((m) => m.id === "b")?.message).toBe("keep me");
  });

  it("expires view-once media only for the targeted message on view_once_consumed", () => {
    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() =>
      result.current.setChat([
        { id: "a", sid: "me", image: "data:image/png;base64,x", reactions: {} },
        { id: "b", sid: "me", image: "data:image/png;base64,y", reactions: {} },
      ])
    );

    act(() => trigger("view_once_consumed", { messageId: "a" }));

    expect(result.current.chat.find((m) => m.id === "a")?.image).toBeUndefined();
    expect(result.current.chat.find((m) => m.id === "a")?.message).toBe("Zdjęcie wygasło");
    expect(result.current.chat.find((m) => m.id === "b")?.image).toBe("data:image/png;base64,y");
  });

  it("encrypts an outgoing image when a shared key is available", async () => {
    const [sharedRef] = await sharedKeyRefs();
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendMessage(sharedRef.current, {
        room: "room-1",
        image: "data:image/png;base64,plaintext",
      });
    });

    const [, payload] = vi.mocked(socket.emit).mock.calls[0];
    expect((payload as { image: string }).image).not.toBe("data:image/png;base64,plaintext");
    expect((payload as { e2e?: { iv: string } }).e2e?.iv).toBeTruthy();
  });

  it("encrypts an outgoing video when a shared key is available", async () => {
    const [sharedRef] = await sharedKeyRefs();
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendMessage(sharedRef.current, {
        room: "room-1",
        video: "data:video/mp4;base64,plaintext",
      });
    });

    const [, payload] = vi.mocked(socket.emit).mock.calls[0];
    expect((payload as { video: string }).video).not.toBe("data:video/mp4;base64,plaintext");
    expect((payload as { e2e?: { iv: string } }).e2e?.iv).toBeTruthy();
  });

  it("falls back to plaintext text/image/video when encryption throws in sendMessage", async () => {
    const [sharedRef] = await sharedKeyRefs();
    vi.spyOn(crypto.subtle, "encrypt").mockRejectedValueOnce(new Error("boom"));
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendMessage(sharedRef.current, { room: "room-1", text: "jawne" });
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "message",
      expect.objectContaining({ message: "jawne", e2e: undefined })
    );
  });

  it("registers no listeners and does not crash when there is no socket yet", () => {
    expect(() =>
      renderHook(() => useChatMessages(null, noKeyRef(), makeCallbacks()))
    ).not.toThrow();
  });

  it("decrypts an incoming encrypted image and counts it as a received image", async () => {
    const [senderRef, receiverRef] = await sharedKeyRefs();
    const { encryptBinary } = await import("../../../utils/crypto");
    const encImg = await encryptBinary(senderRef.current!, "data:image/png;base64,plain-image");

    const { socket, trigger } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, receiverRef, callbacks));

    await act(async () => {
      trigger("message", {
        id: "msg-1",
        sid: "stranger",
        image: encImg.ct,
        reactions: {},
        e2e: { iv: encImg.iv },
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.chat).toHaveLength(1));
    expect(result.current.chat[0].image).toBe("data:image/png;base64,plain-image");
    expect(callbacks.incrementReceived).toHaveBeenCalledWith({ text: 0, image: 1, audio: 0 });
  });

  it("decrypts an incoming encrypted audio message and counts it as received audio", async () => {
    const [senderRef, receiverRef] = await sharedKeyRefs();
    const { encryptBinary } = await import("../../../utils/crypto");
    const encAudio = await encryptBinary(senderRef.current!, "data:audio/webm;base64,plain-audio");

    const { socket, trigger } = createFakeSocket("me");
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useChatMessages(socket, receiverRef, callbacks));

    await act(async () => {
      trigger("message", {
        id: "msg-1",
        sid: "stranger",
        audio: encAudio.ct,
        reactions: {},
        e2e: { iv: encAudio.iv },
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.chat).toHaveLength(1));
    expect(result.current.chat[0].audio).toBe("data:audio/webm;base64,plain-audio");
    expect(callbacks.incrementReceived).toHaveBeenCalledWith({ text: 0, image: 0, audio: 1 });
  });

  it("decrypts an incoming encrypted video message", async () => {
    const [senderRef, receiverRef] = await sharedKeyRefs();
    const { encryptBinary } = await import("../../../utils/crypto");
    const encVideo = await encryptBinary(senderRef.current!, "data:video/mp4;base64,plain-video");

    const { socket, trigger } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, receiverRef, makeCallbacks()));

    await act(async () => {
      trigger("message", {
        id: "msg-1",
        sid: "stranger",
        video: encVideo.ct,
        reactions: {},
        e2e: { iv: encVideo.iv },
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.chat).toHaveLength(1));
    expect(result.current.chat[0].video).toBe("data:video/mp4;base64,plain-video");
  });

  it("does nothing when sendAudioMessage is called with no connected socket", async () => {
    const { result } = renderHook(() => useChatMessages(null, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendAudioMessage(null, "room-1", "data:audio/webm;base64,x", false);
    });

    expect(result.current.chat).toEqual([]);
  });

  it("does nothing when sendReaction is called with no connected socket", () => {
    const { result } = renderHook(() => useChatMessages(null, noKeyRef(), makeCallbacks()));
    act(() => result.current.setChat([{ id: "a", sid: "me", message: "x", reactions: {} }]));

    act(() => result.current.sendReaction("room-1", "a", "👍"));

    expect(result.current.chat[0].reactions).toEqual({});
  });

  it("does nothing when unsendMessage is called with no connected socket", () => {
    const { result } = renderHook(() => useChatMessages(null, noKeyRef(), makeCallbacks()));
    act(() => result.current.setChat([{ id: "a", sid: "me", message: "x", reactions: {} }]));

    act(() => result.current.unsendMessage("room-1", "a"));

    expect(result.current.chat[0].isUnsent).toBeUndefined();
  });

  /** A socket whose `id` is genuinely `undefined`, as it is before the server assigns one. */
  function socketWithNoId(): Socket {
    return { id: undefined, on: vi.fn(), off: vi.fn(), emit: vi.fn() } as unknown as Socket;
  }

  it("falls back to an empty sid on outgoing messages when socket.id is not yet assigned", async () => {
    const socket = socketWithNoId();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendMessage(null, { room: "room-1", text: "cześć" });
    });

    expect(result.current.chat[0].sid).toBe("");
  });

  it("falls back to an empty sid for outgoing audio when socket.id is not yet assigned", async () => {
    const socket = socketWithNoId();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendAudioMessage(null, "room-1", "data:audio/webm;base64,x", false);
    });

    expect(result.current.chat[0].sid).toBe("");
  });

  it("falls back to an empty sid when reacting and socket.id is not yet assigned", () => {
    const socket = socketWithNoId();
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    act(() => result.current.setChat([{ id: "a", sid: "stranger", message: "x", reactions: {} }]));

    act(() => result.current.sendReaction("room-1", "a", "👍"));

    expect(result.current.chat[0].reactions).toEqual({ "": "👍" });
  });

  it("marks view-once media on a sent image/video message when viewOnce is requested", async () => {
    const { socket } = createFakeSocket("me");
    const { result } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));

    await act(async () => {
      await result.current.sendMessage(null, {
        room: "room-1",
        image: "data:image/png;base64,x",
        viewOnce: true,
      });
    });

    expect(result.current.chat[0].viewOnce).toBe(true);
    expect(socket.emit).toHaveBeenCalledWith(
      "message",
      expect.objectContaining({ viewOnce: true })
    );
  });

  it("unsubscribes all message listeners on unmount", () => {
    const { socket, listeners } = createFakeSocket();
    const { unmount } = renderHook(() => useChatMessages(socket, noKeyRef(), makeCallbacks()));
    expect(listeners.get("message")?.size).toBe(1);

    unmount();

    expect(listeners.get("message")?.size).toBe(0);
    expect(listeners.get("message_reaction")?.size).toBe(0);
    expect(listeners.get("message_unsent")?.size).toBe(0);
    expect(listeners.get("view_once_consumed")?.size).toBe(0);
    expect(listeners.get("icebreaker_updated")?.size).toBe(0);
  });
});
