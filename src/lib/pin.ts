/**
 * PIN hashing with WebCrypto (PBKDF2-SHA256). Only a salted hash is stored —
 * never the PIN itself. This is an app lock against casual access to an
 * unlocked device; it does not encrypt the data stored in the browser.
 */
const ITERATIONS = 150_000;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function generateSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPin(pin: string, saltB64: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(saltB64) as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/** Constant-time-ish comparison of two equal-purpose base64 strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);
