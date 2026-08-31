import QRCode from "qrcode";

// Base32 decoding table
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32ToBytes(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

function bytesToBase32(bytes: Uint8Array): string {
  let bits = "";
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, "0");
  }
  let base32 = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    base32 += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return base32;
}

/**
 * Generates a clean 16-character Base32 secret for Google Authenticator.
 */
export function generate2FASecret(): string {
  const bytes = new Uint8Array(10);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToBase32(bytes).substring(0, 16);
}

/**
 * Creates the standard otpauth:// URL for Google Authenticator.
 */
export function get2FAOtpauthUrl(email: string, secret: string, issuer = "FSR - Workspace"): string {
  const cleanEmail = email || "usuario@fsrworkspace.com";
  const cleanSecret = secret.replace(/\s+/g, "").toUpperCase();
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(cleanEmail)}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a Data URL image (PNG base64) of the QR Code.
 */
export async function generate2FAQRCode(email: string, secret: string, issuer = "FSR - Workspace"): Promise<string> {
  const otpauthUrl = get2FAOtpauthUrl(email, secret, issuer);
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 250,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
    return dataUrl;
  } catch (err) {
    console.error("Error generating QR code:", err);
    return "";
  }
}

/**
 * Computes single 6-digit TOTP code for a specific time step (RFC 6238)
 */
async function generateTOTPCodeForStep(secret: string, counter: number): Promise<string> {
  const keyBytes = base32ToBytes(secret);
  
  // Counter to 8-byte big endian array
  const counterBytes = new Uint8Array(8);
  let tempCounter = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tempCounter & 0xff;
    tempCounter = Math.floor(tempCounter / 256);
  }

  // HMAC-SHA-1 using Web Crypto API
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: { name: "SHA-1" } },
    false,
    ["sign"]
  );

  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, counterBytes);
  const hmac = new Uint8Array(signature);

  // Dynamic Truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifies a 6-digit TOTP token against a secret with window tolerance (±1 step / 30s).
 */
export async function verify2FAToken(token: string, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const cleanToken = token.replace(/\s+/g, "").trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  // Check current step, -1 step, +1 step for clock drift
  for (let offset = -1; offset <= 1; offset++) {
    try {
      const generated = await generateTOTPCodeForStep(secret, currentCounter + offset);
      if (generated === cleanToken) {
        return true;
      }
    } catch (err) {
      console.error("Error computing TOTP step:", err);
    }
  }

  return false;
}
