/**
 * Client-side cryptography for the password vault ("Contraseñas").
 *
 * Security model (zero-knowledge / end-to-end encrypted):
 * - A random 256-bit "master encryption key" (MEK) encrypts every vault item.
 * - The MEK itself is never stored anywhere in raw form. Instead it is "wrapped"
 *   (encrypted) twice: once with a key derived from the user's master password,
 *   once with a key derived from their 12-word recovery phrase. Both wrapped
 *   copies are stored server-side — but neither the master password, the
 *   recovery phrase, nor the unwrapped MEK ever leaves this device.
 * - Key derivation uses PBKDF2-SHA256 with a high iteration count and a random
 *   per-wrap salt, so even a stolen database gives an attacker nothing better
 *   than an offline brute-force against a strong KDF.
 * - All encryption uses AES-256-GCM (authenticated encryption): tampering with
 *   stored ciphertext is detected, not silently decrypted into garbage.
 *
 * Nothing in this file ever calls fetch/Firestore — it only turns secrets into
 * bytes and back. Persistence lives in vaultService.ts.
 */

import { RECOVERY_WORDLIST } from "./vaultWordlist";
import type { EncryptedBlob, WrappedKey } from "../types";

const PBKDF2_ITERATIONS = 310_000; // OWASP-recommended floor for PBKDF2-SHA256 (2023+)
const AES_KEY_LENGTH_BITS = 256;
const GCM_IV_BYTES = 12;

// ---------- base64 / byte helpers ----------

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// ---------- key derivation ----------

async function pbkdf2DeriveBits(
  secret: string,
  salt: Uint8Array,
  iterations: number,
  bitLength: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    bitLength
  );
  return new Uint8Array(bits);
}

async function importAesGcmKey(raw: Uint8Array, extractable = false): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, extractable, [
    "encrypt",
    "decrypt",
  ]);
}

/** Normalizes a secret (recovery phrase or password) so trivial formatting differences don't matter. */
export function normalizeSecret(secret: string): string {
  return secret.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------- master encryption key (MEK) ----------

/** Generates a fresh random 256-bit master encryption key. Keep this in memory only. */
export function generateMEK(): Uint8Array {
  return randomBytes(AES_KEY_LENGTH_BITS / 8);
}

async function encryptRawBytes(keyRaw: Uint8Array, plaintext: Uint8Array): Promise<EncryptedBlob> {
  const key = await importAesGcmKey(keyRaw);
  const iv = randomBytes(GCM_IV_BYTES);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(ciphertext)) };
}

async function decryptRawBytes(keyRaw: Uint8Array, blob: EncryptedBlob): Promise<Uint8Array | null> {
  try {
    const key = await importAesGcmKey(keyRaw);
    const iv = base64ToBytes(blob.iv);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(blob.data));
    return new Uint8Array(plaintext);
  } catch {
    return null; // wrong key or tampered ciphertext — GCM auth tag mismatch
  }
}

/** Wraps (encrypts) the MEK using a key derived from a password or recovery phrase. */
export async function wrapMEK(mek: Uint8Array, secret: string): Promise<WrappedKey> {
  const salt = randomBytes(16);
  const kek = await pbkdf2DeriveBits(secret, salt, PBKDF2_ITERATIONS, AES_KEY_LENGTH_BITS);
  const { iv, data } = await encryptRawBytes(kek, mek);
  return { salt: bytesToBase64(salt), iterations: PBKDF2_ITERATIONS, iv, data };
}

/** Attempts to recover the MEK from a wrapped key + the secret that (maybe) unlocks it. Returns null on wrong secret. */
export async function unwrapMEK(wrapped: WrappedKey, secret: string): Promise<Uint8Array | null> {
  const salt = base64ToBytes(wrapped.salt);
  const kek = await pbkdf2DeriveBits(secret, salt, wrapped.iterations, AES_KEY_LENGTH_BITS);
  return decryptRawBytes(kek, wrapped);
}

// ---------- item encryption ----------

/** Encrypts an arbitrary JSON-serializable value under the MEK. */
export async function encryptJSON(mek: Uint8Array, value: unknown): Promise<EncryptedBlob> {
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  return encryptRawBytes(mek, plaintext);
}

/** Decrypts a blob previously produced by encryptJSON. Returns null if the MEK is wrong or data was tampered with. */
export async function decryptJSON<T>(mek: Uint8Array, blob: EncryptedBlob): Promise<T | null> {
  const bytes = await decryptRawBytes(mek, blob);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

// ---------- recovery phrase ----------

/** Generates a fresh 12-word recovery phrase from the standard BIP-39 English wordlist (~132 bits of entropy). */
export function generateRecoveryPhrase(wordCount = 12): string {
  const words: string[] = [];
  // 2048 = 2^11, so 11 random bits per word map onto the list with zero modulo bias.
  const randomIndices = new Uint16Array(wordCount);
  crypto.getRandomValues(randomIndices);
  for (let i = 0; i < wordCount; i++) {
    words.push(RECOVERY_WORDLIST[randomIndices[i] % RECOVERY_WORDLIST.length]);
  }
  return words.join(" ");
}

// ---------- password generator & strength ----------

const PW_LOWER = "abcdefghijklmnopqrstuvwxyz";
const PW_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PW_DIGITS = "0123456789";
const PW_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

export interface PasswordGeneratorOptions {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
}

export function generateStrongPassword(opts: PasswordGeneratorOptions): string {
  const pools = [
    opts.useLower && PW_LOWER,
    opts.useUpper && PW_UPPER,
    opts.useDigits && PW_DIGITS,
    opts.useSymbols && PW_SYMBOLS,
  ].filter(Boolean) as string[];
  const alphabet = pools.join("") || PW_LOWER + PW_DIGITS;
  const length = Math.max(8, Math.min(64, opts.length || 20));

  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

export function estimatePasswordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "Vacía" };
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/[0-9]/.test(pw)) variety++;
  if (/[^a-zA-Z0-9]/.test(pw)) variety++;

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (pw.length >= 8 && variety >= 2) score = 1;
  if (pw.length >= 10 && variety >= 3) score = 2;
  if (pw.length >= 14 && variety >= 3) score = 3;
  if (pw.length >= 16 && variety >= 4) score = 4;

  const labels = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];
  return { score, label: labels[score] };
}
