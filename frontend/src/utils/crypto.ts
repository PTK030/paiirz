/**
 * E2EE Crypto Utility - paiirz
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

// ─── HKDF Parameters ─────────────────────────────────────────────────────────
// Changing these values will break compatibility with existing sessions.

const HKDF_SALT = "paiirz-e2ee-salt-v1";
const HKDF_INFO = "paiirz-chat-key";

// ─── Key Generation ──────────────────────────────────────────────────────────

/**
 * @description Generates an ECDH key pair using the P-256 (secp256r1) curve.
 * The private key is non-extractable - it cannot be serialised or leaked.
 * @returns a fresh `{ publicKey, privateKey }` pair.
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
 * @description Exports the PUBLIC key to a base64-encoded raw byte string.
 * This is the only value transmitted to the server (and then to the peer).
 * @param publicKey - the local ECDH public key.
 * @returns a base64-encoded raw key string, safe to send over the wire.
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return arrayBufferToBase64(raw);
}

/**
 * @description Imports a peer's base64-encoded public key back into a
 * `CryptoKey` object usable for shared-secret derivation.
 * @param base64 - the peer's exported public key.
 * @returns the reconstructed ECDH public `CryptoKey`.
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey("raw", raw, { name: "ECDH", namedCurve: "P-256" }, false, []);
}

// ─── Shared Secret Derivation ─────────────────────────────────────────────────

/**
 * @description Derives a shared AES-GCM-256 key from our private key and the
 * peer's public key. Uses HKDF to stretch the raw ECDH output into a proper
 * AES key. Both peers independently derive the SAME shared key without ever
 * transmitting it.
 * @param myPrivateKey - our local ECDH private key.
 * @param theirPublicKey - the peer's imported ECDH public key.
 * @returns a non-extractable AES-GCM-256 `CryptoKey` shared by both peers.
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
  const keyMaterial = await crypto.subtle.importKey("raw", rawBits, { name: "HKDF" }, false, [
    "deriveKey",
  ]);

  // Step 3: derive the final AES-GCM-256 key with a fixed app-specific salt and info
  const encoder = new TextEncoder();
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(HKDF_SALT),
      info: encoder.encode(HKDF_INFO),
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
  /** Base64-encoded 12-byte random IV (nonce) - unique per message */
  iv: string;
}

/**
 * @description Encrypts a plaintext string using AES-GCM-256. A fresh random
 * 12-byte IV is generated for every single message.
 * @param sharedKey - the AES-GCM-256 key derived by `deriveSharedKey`.
 * @param plaintext - the message text to encrypt.
 * @returns the ciphertext and IV, both base64-encoded.
 */
export async function encrypt(sharedKey: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, encoded);
  return {
    ct: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * @description Decrypts an AES-GCM-256 ciphertext. The authentication tag is
 * automatically verified - any tampering throws an error.
 * @param sharedKey - the AES-GCM-256 key derived by `deriveSharedKey`.
 * @param payload - the `{ ct, iv }` pair produced by `encrypt`.
 * @returns the original plaintext string.
 */
export async function decrypt(sharedKey: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const iv = base64ToArrayBuffer(payload.iv);
  const ct = base64ToArrayBuffer(payload.ct);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, ct);
  return new TextDecoder().decode(plainBuffer);
}

// ─── Convenience: encrypt/decrypt base64 binary data (images, audio, video) ──

/**
 * @description Encrypts a base64 data URI (image / audio / video). The
 * base64 string is treated as plaintext and encrypted directly.
 * @param sharedKey - the AES-GCM-256 key derived by `deriveSharedKey`.
 * @param base64DataUri - the media payload encoded as a `data:` URI.
 * @returns the ciphertext and IV, both base64-encoded.
 */
export async function encryptBinary(
  sharedKey: CryptoKey,
  base64DataUri: string
): Promise<EncryptedPayload> {
  return encrypt(sharedKey, base64DataUri);
}

/**
 * @description Decrypts an encrypted binary payload back to a base64 data URI.
 * @param sharedKey - the AES-GCM-256 key derived by `deriveSharedKey`.
 * @param payload - the `{ ct, iv }` pair produced by `encryptBinary`.
 * @returns the original base64 `data:` URI.
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
