import { waitFor } from "@testing-library/dom";
import { renderHook, act } from "@testing-library/react";
import type { Socket } from "socket.io-client";
import { describe, it, expect, vi } from "vitest";

import { useContactExchange } from "../../../hooks/ui/useContactExchange";
import { generateKeyPair, deriveSharedKey } from "../../../utils/crypto";

function mockSocket(): Socket {
  return { emit: vi.fn() } as unknown as Socket;
}

async function makeSharedKeyPair(): Promise<[CryptoKey, CryptoKey]> {
  const a = await generateKeyPair();
  const b = await generateKeyPair();
  const sharedA = await deriveSharedKey(a.privateKey, b.publicKey);
  const sharedB = await deriveSharedKey(b.privateKey, a.publicKey);
  return [sharedA, sharedB];
}

describe("useContactExchange", () => {
  it("starts idle with no contacts", () => {
    const { result } = renderHook(() => useContactExchange());
    expect(result.current.exchangeState).toBe("idle");
    expect(result.current.myContact).toBe("");
    expect(result.current.partnerContact).toBeNull();
  });

  it("emits share_contact in plaintext when no shared key is available", async () => {
    const { result } = renderHook(() => useContactExchange());
    act(() => result.current.setMyContact("@mój_kontakt"));

    const socket = mockSocket();
    await act(async () => {
      await result.current.submitContactShare(socket, "room-1", null);
    });

    expect(socket.emit).toHaveBeenCalledWith("share_contact", {
      room: "room-1",
      contact: "@mój_kontakt",
    });
    expect(result.current.exchangeState).toBe("waiting");
  });

  it("encrypts the contact payload when a shared key is available", async () => {
    const [sharedKey] = await makeSharedKeyPair();
    const { result } = renderHook(() => useContactExchange());
    act(() => result.current.setMyContact("@sekret"));

    const socket = mockSocket();
    await act(async () => {
      await result.current.submitContactShare(socket, "room-2", sharedKey);
    });

    const [, payload] = vi.mocked(socket.emit).mock.calls[0];
    expect((payload as { contact: string }).contact).not.toBe("@sekret");
    expect(() => JSON.parse((payload as { contact: string }).contact)).not.toThrow();
  });

  it("falls back to plaintext when encryption throws while sharing a contact", async () => {
    const [sharedKey] = await makeSharedKeyPair();
    vi.spyOn(crypto.subtle, "encrypt").mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useContactExchange());
    act(() => result.current.setMyContact("@jawny"));

    const socket = mockSocket();
    await act(async () => {
      await result.current.submitContactShare(socket, "room-1", sharedKey);
    });

    expect(socket.emit).toHaveBeenCalledWith("share_contact", {
      room: "room-1",
      contact: "@jawny",
    });
  });

  it("decrypts a received contact when the shared key matches", async () => {
    const [sharedA, sharedB] = await makeSharedKeyPair();
    const sender = renderHook(() => useContactExchange());
    act(() => sender.result.current.setMyContact("@nadawca"));
    const socket = mockSocket();
    await act(async () => {
      await sender.result.current.submitContactShare(socket, "room-3", sharedA);
    });
    const [, sentPayload] = vi.mocked(socket.emit).mock.calls[0];

    const receiver = renderHook(() => useContactExchange());
    await act(async () => {
      await receiver.result.current.handleContactReceived(
        (sentPayload as { contact: string }).contact,
        sharedB
      );
    });

    await waitFor(() => expect(receiver.result.current.partnerContact).toBe("@nadawca"));
    expect(receiver.result.current.exchangeState).toBe("exchanged");
  });

  it("falls back to raw plaintext if decryption fails (e.g. malformed payload)", async () => {
    const [sharedKey] = await makeSharedKeyPair();
    const { result } = renderHook(() => useContactExchange());

    await act(async () => {
      await result.current.handleContactReceived("not-valid-json", sharedKey);
    });

    expect(result.current.partnerContact).toBe("not-valid-json");
    expect(result.current.exchangeState).toBe("exchanged");
  });

  it("treats the payload as plaintext when there is no shared key", async () => {
    const { result } = renderHook(() => useContactExchange());
    await act(async () => {
      await result.current.handleContactReceived("@plaintext-kontakt", null);
    });
    expect(result.current.partnerContact).toBe("@plaintext-kontakt");
  });

  it("resetExchangeState clears state back to idle", async () => {
    const { result } = renderHook(() => useContactExchange());
    act(() => result.current.setMyContact("@x"));
    act(() => result.current.setPartnerWantsToExchange(true));
    await act(async () => {
      await result.current.handleContactReceived("@y", null);
    });

    act(() => result.current.resetExchangeState());

    expect(result.current.exchangeState).toBe("idle");
    expect(result.current.myContact).toBe("");
    expect(result.current.partnerContact).toBeNull();
    expect(result.current.partnerWantsToExchange).toBe(false);
  });
});
