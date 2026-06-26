/**
 * E2EE Crypto Utility — paiirz
 *
 * Implements End-to-End Encryption using:
 *   - ECDH (Elliptic Curve Diffie-Hellman) on P-256 for key agreement
 *   - HKDF for deterministic shared secret derivation
 *   - AES-GCM (256-bit) for authenticated symmetric encryption
 *
 * The server never has access to:
 *   - The private key (generated in-browser, never leaves the device)
 *   - The derived shared secret
 *   - Any plaintext message, image, audio or video
 *
 * The server is a BLIND RELAY for public keys and ciphertexts.
 */

// ─── Key Generation ──────────────────────────────────────────────────────────

/**
 * Generate an ECDH key pair using the P-256 (secp256r1) curve.
 * The private key is non-extractable — it cannot be serialised or leaked.
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false, // private key is NON-extractable
    ["deriveKey", "deriveBits"]
  );
}

// ─── Key Export / Import ─────────────────────────────────────────────────────

/**
 * Export the PUBLIC key to a base64-encoded raw byte string.
 * This is the only value transmitted to the server (and then to the peer).
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return arrayBufferToBase64(raw);
}

/**
 * Import a peer's base64-encoded public key back into a CryptoKey object.
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

// ─── Shared Secret Derivation ─────────────────────────────────────────────────

/**
 * Derive a shared AES-GCM-256 key from our private key and the peer's public key.
 * Uses HKDF to stretch the raw ECDH output into a proper AES key.
 *
 * Both peers independently derive the SAME shared key without ever transmitting it.
 */
export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  // Step 1: derive 256 bits of raw key material via ECDH
  const rawBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    256
  );

  // Step 2: import raw bits as HKDF key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    rawBits,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  // Step 3: derive the final AES-GCM-256 key with a fixed app-specific salt and info
  const encoder = new TextEncoder();
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("paiirz-e2ee-salt-v1"),
      info: encoder.encode("paiirz-chat-key"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

export interface EncryptedPayload {
  /** Base64-encoded AES-GCM ciphertext (includes 16-byte auth tag) */
  ct: string;
  /** Base64-encoded 12-byte random IV (nonce) — unique per message */
  iv: string;
}

/**
 * Encrypt a plaintext string using AES-GCM-256.
 * A fresh random 12-byte IV is generated for every single message.
 */
export async function encrypt(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encoded
  );
  return {
    ct: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt an AES-GCM-256 ciphertext.
 * The authentication tag is automatically verified — any tampering throws an error.
 */
export async function decrypt(
  sharedKey: CryptoKey,
  payload: EncryptedPayload
): Promise<string> {
  const iv = base64ToArrayBuffer(payload.iv);
  const ct = base64ToArrayBuffer(payload.ct);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    ct
  );
  return new TextDecoder().decode(plainBuffer);
}

// ─── Convenience: encrypt/decrypt base64 binary data (images, audio, video) ──

/**
 * Encrypt a base64 data URI (image / audio / video).
 * The base64 string is treated as plaintext and encrypted directly.
 */
export async function encryptBinary(
  sharedKey: CryptoKey,
  base64DataUri: string
): Promise<EncryptedPayload> {
  return encrypt(sharedKey, base64DataUri);
}

/**
 * Decrypt an encrypted binary payload back to a base64 data URI.
 */
export async function decryptBinary(
  sharedKey: CryptoKey,
  payload: EncryptedPayload
): Promise<string> {
  return decrypt(sharedKey, payload);
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
