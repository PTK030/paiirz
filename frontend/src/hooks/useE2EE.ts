import { useState, useRef, useCallback, useEffect } from "react";
import type { Socket } from "socket.io-client";
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

export interface UseE2EEReturn {
  /** True once both peers have derived the same shared key. */
  e2eReady: boolean;
  /** The shared AES-GCM key - null until key exchange completes. */
  sharedKey: CryptoKey | null;
  /** Stable ref mirror of sharedKey - safe to read inside async closures. */
  sharedKeyRef: React.RefObject<CryptoKey | null>;
  /** Reset all E2EE state (call when leaving a room). */
  resetE2EE: () => void;
  /** Start a new key exchange for the given room. */
  initiateKeyExchange: (roomId: string) => Promise<void>;
  /** Encrypt a plaintext string. Returns null when sharedKey is not ready. */
  encryptText: (plaintext: string) => Promise<{ ct: string; iv: string } | null>;
  /** Encrypt a binary (base64) payload. Returns null when sharedKey is not ready. */
  encryptBin: (b64: string) => Promise<EncryptedPayload | null>;
  /** Decrypt a text payload using the current shared key. */
  decryptText: (payload: EncryptedPayload) => Promise<string>;
  /** Decrypt a binary payload using the current shared key. */
  decryptBin: (payload: EncryptedPayload) => Promise<string>;
}

/**
 * Manages ECDH P-256 key exchange over the given socket.
 * Both peers independently derive the same AES-GCM-256 shared key.
 *
 * @param socket  - active socket.io client (or null while connecting)
 * @param room    - current room ID (or null when not in a room)
 * @param onReady - optional callback fired with the status message when key exchange completes
 */
export function useE2EE(
  socket: Socket | null,
  room: string | null,
  onReady?: (statusMessage: string) => void
): UseE2EEReturn {
  const [e2eReady, setE2eReady] = useState(false);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);

  // Stable refs - safe to read inside async closures without stale capture
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Keep sharedKeyRef in sync with state
  useEffect(() => {
    sharedKeyRef.current = sharedKey;
  }, [sharedKey]);

  // Keep currentRoomRef in sync
  useEffect(() => {
    currentRoomRef.current = room;
  }, [room]);

  const resetE2EE = useCallback(() => {
    setE2eReady(false);
    setSharedKey(null);
    sharedKeyRef.current = null;
    keyPairRef.current = null;
  }, []);

  const initiateKeyExchange = useCallback(
    async (roomId: string) => {
      if (!socket) return;
      try {
        const keyPair = await generateKeyPair();
        keyPairRef.current = keyPair;
        const pubKeyB64 = await exportPublicKey(keyPair.publicKey);
        socket.emit("e2e_key_exchange", { room: roomId, publicKey: pubKeyB64 });
      } catch (err) {
        console.error("[E2EE] Key generation failed:", err);
      }
    },
    [socket]
  );

  // ── Socket handler: receive peer's public key ─────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleKeyExchange = async ({
      publicKey,
    }: {
      sender_sid: string;
      publicKey: string;
    }) => {
      try {
        let myKeyPair = keyPairRef.current;

        if (!myKeyPair) {
          // We haven't generated our key yet - generate now and reply
          myKeyPair = await generateKeyPair();
          keyPairRef.current = myKeyPair;
          const pubB64 = await exportPublicKey(myKeyPair.publicKey);
          const room = currentRoomRef.current;
          if (room && socket) {
            socket.emit("e2e_key_exchange", { room, publicKey: pubB64 });
          }
        }

        const theirPub = await importPublicKey(publicKey);
        const derived = await deriveSharedKey(myKeyPair.privateKey, theirPub);
        setSharedKey(derived);
        sharedKeyRef.current = derived;
        setE2eReady(true);
        onReady?.("Rozmawiasz z rozmówcą");
      } catch (err) {
        console.error("[E2EE] Key exchange failed:", err);
      }
    };

    socket.on("e2e_key_exchange", handleKeyExchange);
    return () => {
      socket.off("e2e_key_exchange", handleKeyExchange);
    };
  }, [socket, onReady]);

  // ── Encrypt / decrypt helpers ─────────────────────────────────────────────

  const encryptText = useCallback(
    async (plaintext: string): Promise<EncryptedPayload | null> => {
      const key = sharedKeyRef.current;
      if (!key) return null;
      return encrypt(key, plaintext);
    },
    []
  );

  const encryptBin = useCallback(
    async (b64: string): Promise<EncryptedPayload | null> => {
      const key = sharedKeyRef.current;
      if (!key) return null;
      return encryptBinary(key, b64);
    },
    []
  );

  const decryptText = useCallback(
    async (payload: EncryptedPayload): Promise<string> => {
      const key = sharedKeyRef.current;
      if (!key) return "[Brak klucza E2EE]";
      return decrypt(key, payload);
    },
    []
  );

  const decryptBin = useCallback(
    async (payload: EncryptedPayload): Promise<string> => {
      const key = sharedKeyRef.current;
      if (!key) return "";
      return decryptBinary(key, payload);
    },
    []
  );

  return {
    e2eReady,
    sharedKey,
    sharedKeyRef,
    resetE2EE,
    initiateKeyExchange,
    encryptText,
    encryptBin,
    decryptText,
    decryptBin,
  };
}
