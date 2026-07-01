import { useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type { EncryptedPayload } from "../utils/crypto";
import { encrypt, decrypt } from "../utils/crypto";

export type ExchangeState = "idle" | "input" | "waiting" | "exchanged";

export interface UseContactExchangeReturn {
  exchangeState: ExchangeState;
  setExchangeState: (s: ExchangeState) => void;
  myContact: string;
  setMyContact: (v: string) => void;
  partnerContact: string | null;
  partnerWantsToExchange: boolean;
  setPartnerWantsToExchange: (v: boolean) => void;
  /** Send our contact to the partner (E2EE if sharedKey is available). */
  submitContactShare: (
    socket: Socket,
    room: string,
    sharedKey: CryptoKey | null
  ) => Promise<void>;
  /** Handle an incoming contact_exchanged event. */
  handleContactReceived: (
    encryptedContact: string,
    sharedKey: CryptoKey | null
  ) => Promise<void>;
  /** Reset to idle state (call when leaving a room). */
  resetExchangeState: () => void;
}

/**
 * Manages the contact exchange state machine.
 * Contacts are transmitted as E2EE ciphertext when a shared key is available.
 */
export function useContactExchange(): UseContactExchangeReturn {
  const [exchangeState, setExchangeState] = useState<ExchangeState>("idle");
  const [myContact, setMyContact] = useState("");
  const [partnerContact, setPartnerContact] = useState<string | null>(null);
  const [partnerWantsToExchange, setPartnerWantsToExchange] = useState(false);

  const resetExchangeState = useCallback(() => {
    setExchangeState("idle");
    setMyContact("");
    setPartnerContact(null);
    setPartnerWantsToExchange(false);
  }, []);

  const submitContactShare = useCallback(
    async (socket: Socket, room: string, sharedKey: CryptoKey | null) => {
      let contactPayload: string = myContact;

      if (sharedKey) {
        try {
          const encrypted: EncryptedPayload = await encrypt(sharedKey, myContact);
          contactPayload = JSON.stringify(encrypted);
        } catch {
          // Fall back to plaintext if encryption fails
        }
      }

      socket.emit("share_contact", { room, contact: contactPayload });
      setExchangeState("waiting");
    },
    [myContact]
  );

  const handleContactReceived = useCallback(
    async (encryptedContact: string, sharedKey: CryptoKey | null) => {
      try {
        if (sharedKey) {
          const payload: EncryptedPayload = JSON.parse(encryptedContact);
          const plaintext = await decrypt(sharedKey, payload);
          setPartnerContact(plaintext);
        } else {
          setPartnerContact(encryptedContact);
        }
      } catch {
        setPartnerContact(encryptedContact);
      }
      setExchangeState("exchanged");
    },
    []
  );

  return {
    exchangeState,
    setExchangeState,
    myContact,
    setMyContact,
    partnerContact,
    partnerWantsToExchange,
    setPartnerWantsToExchange,
    submitContactShare,
    handleContactReceived,
    resetExchangeState,
  };
}
