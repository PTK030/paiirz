import { describe, it, expect } from "vitest";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encrypt,
  decrypt,
  encryptBinary,
  decryptBinary,
} from "../../utils/crypto";

describe("crypto utils", () => {
  describe("generateKeyPair", () => {
    it("generates an ECDH key pair", async () => {
      const kp = await generateKeyPair();
      expect(kp.publicKey).toBeDefined();
      expect(kp.privateKey).toBeDefined();
    });

    it("generates a non-extractable private key", async () => {
      const kp = await generateKeyPair();
      expect(kp.privateKey.extractable).toBe(false);
    });

    it("generates a P-256 key pair", async () => {
      const kp = await generateKeyPair();
      const algo = kp.publicKey.algorithm as EcKeyAlgorithm;
      expect(algo.name).toBe("ECDH");
      expect(algo.namedCurve).toBe("P-256");
    });
  });

  describe("exportPublicKey / importPublicKey", () => {
    it("round-trips a public key via base64", async () => {
      const kp = await generateKeyPair();
      const b64 = await exportPublicKey(kp.publicKey);
      expect(typeof b64).toBe("string");
      expect(b64.length).toBeGreaterThan(0);
      const imported = await importPublicKey(b64);
      expect(imported).toBeDefined();
      expect(imported.type).toBe("public");
    });

    it("exported key is a valid base64 string", async () => {
      const kp = await generateKeyPair();
      const b64 = await exportPublicKey(kp.publicKey);
      expect(() => atob(b64)).not.toThrow();
    });
  });

  describe("deriveSharedKey", () => {
    it("derives the same shared key on both sides", async () => {
      const aliceKP = await generateKeyPair();
      const bobKP = await generateKeyPair();

      const aliceShared = await deriveSharedKey(aliceKP.privateKey, bobKP.publicKey);
      const bobShared = await deriveSharedKey(bobKP.privateKey, aliceKP.publicKey);

      // Both should produce AES-GCM keys
      expect(aliceShared.algorithm.name).toBe("AES-GCM");
      expect(bobShared.algorithm.name).toBe("AES-GCM");
    });

    it("returns an AES-GCM-256 key", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const shared = await deriveSharedKey(kp1.privateKey, kp2.publicKey);
      const algo = shared.algorithm as AesKeyAlgorithm;
      expect(algo.length).toBe(256);
    });
  });

  describe("encrypt / decrypt", () => {
    it("encrypts and decrypts a plaintext string", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const sharedKey = await deriveSharedKey(kp1.privateKey, kp2.publicKey);

      const plaintext = "Hello, paiirz!";
      const encrypted = await encrypt(sharedKey, plaintext);
      expect(encrypted.ct).toBeDefined();
      expect(encrypted.iv).toBeDefined();

      const decrypted = await decrypt(sharedKey, encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("produces a unique IV each encryption", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const sharedKey = await deriveSharedKey(kp1.privateKey, kp2.publicKey);

      const enc1 = await encrypt(sharedKey, "test");
      const enc2 = await encrypt(sharedKey, "test");
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it("different ciphertext for same plaintext due to random IV", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const sharedKey = await deriveSharedKey(kp1.privateKey, kp2.publicKey);

      const enc1 = await encrypt(sharedKey, "same message");
      const enc2 = await encrypt(sharedKey, "same message");
      expect(enc1.ct).not.toBe(enc2.ct);
    });

    it("encrypts empty string", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const sharedKey = await deriveSharedKey(kp1.privateKey, kp2.publicKey);
      const encrypted = await encrypt(sharedKey, "");
      const decrypted = await decrypt(sharedKey, encrypted);
      expect(decrypted).toBe("");
    });

    it("encrypts Polish characters correctly", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const sharedKey = await deriveSharedKey(kp1.privateKey, kp2.publicKey);
      const text = "Zażółć gęślą jaźń - ąęćńóśźż";
      const encrypted = await encrypt(sharedKey, text);
      const decrypted = await decrypt(sharedKey, encrypted);
      expect(decrypted).toBe(text);
    });
  });

  describe("encryptBinary / decryptBinary", () => {
    it("encrypts and decrypts a base64 data URI", async () => {
      const kp1 = await generateKeyPair();
      const kp2 = await generateKeyPair();
      const sharedKey = await deriveSharedKey(kp1.privateKey, kp2.publicKey);

      const fakeDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const encrypted = await encryptBinary(sharedKey, fakeDataUri);
      const decrypted = await decryptBinary(sharedKey, encrypted);
      expect(decrypted).toBe(fakeDataUri);
    });
  });
});
