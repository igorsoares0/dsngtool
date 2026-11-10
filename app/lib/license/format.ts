/**
 * License keys: an Ed25519 signature over a tiny payload, verified on the
 * device. No server round-trip is needed to accept a key, so the app keeps
 * working offline forever after activation.
 *
 * Wire format: `MODO-` + Crockford base32 of `payload || signature`.
 *
 *   payload (12 bytes) = version (1) | source (1) | license id (10)
 *   signature (64 bytes) = Ed25519 over the payload
 *
 * The license id is the primary key of the server's `License` row. It is not a
 * secret (the signature is what makes a key genuine); the server only uses it
 * to answer "has this key been refunded?".
 *
 * Kept free of path aliases and non-erasable TypeScript so the Node scripts in
 * /scripts can import it directly.
 */
import * as ed from "@noble/ed25519";

export type LicenseSource = "paddle" | "appsumo" | "manual";

export interface LicensePayload {
  v: 1;
  src: LicenseSource;
  /** 16-char Crockford base32 (10 random bytes). */
  id: string;
}

/**
 * Public keys whose signatures the app accepts. A list so the signing key can
 * be rotated: add the new key first, ship, then start signing with it — keys
 * already issued under the old one keep working.
 */
export const LICENSE_PUBLIC_KEYS: readonly string[] = [
  "324c771496c8f4cd4b372962ac22c9d060ce45a53aff5b40ba5ee39f5cb7da25",
];

export const KEY_PREFIX = "MODO-";
const VERSION = 1;
const ID_BYTES = 10;
const PAYLOAD_BYTES = 2 + ID_BYTES;
const SIG_BYTES = 64;

const SOURCES: readonly LicenseSource[] = ["paddle", "appsumo", "manual"];

/* ---------------------------------------------------------------------------
   Crockford base32 — case-insensitive and free of I/L/O/U, so a key survives
   being read aloud, retyped, or mangled by an email client's line wrapping.
--------------------------------------------------------------------------- */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function base32Encode(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array | null {
  const clean = text
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch);
    if (v === -1) return null;
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(clean)) throw new Error("invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/* ---------------------------------------------------------------------------
   Payload
--------------------------------------------------------------------------- */

/** A fresh license id: 10 random bytes, as 16 base32 chars. */
export function newLicenseId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

export function isLicenseId(id: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(id);
}

export function encodePayload(p: LicensePayload): Uint8Array {
  const id = base32Decode(p.id);
  if (!id || id.length !== ID_BYTES) throw new Error("invalid license id");
  const out = new Uint8Array(PAYLOAD_BYTES);
  out[0] = VERSION;
  out[1] = SOURCES.indexOf(p.src);
  out.set(id, 2);
  return out;
}

function decodePayload(bytes: Uint8Array): LicensePayload | null {
  if (bytes.length !== PAYLOAD_BYTES || bytes[0] !== VERSION) return null;
  const src = SOURCES[bytes[1]];
  if (!src) return null;
  return { v: 1, src, id: base32Encode(bytes.slice(2)) };
}

/* ---------------------------------------------------------------------------
   Keys
--------------------------------------------------------------------------- */

/** Strip everything a user might paste around a key: spaces, line breaks, dashes. */
export function normalizeKey(input: string): string {
  const compact = input.replace(/[\s-]/g, "").toUpperCase();
  const body = compact.startsWith("MODO") ? compact.slice(4) : compact;
  return KEY_PREFIX + body;
}

/** Sign a payload. Server/scripts only — needs the private key. */
export async function signLicense(p: LicensePayload, privateKeyHex: string): Promise<string> {
  const payload = encodePayload(p);
  const sig = await ed.signAsync(payload, hexToBytes(privateKeyHex));
  const all = new Uint8Array(PAYLOAD_BYTES + SIG_BYTES);
  all.set(payload, 0);
  all.set(sig, PAYLOAD_BYTES);
  return KEY_PREFIX + base32Encode(all);
}

/**
 * Verify a key against the trusted public keys. Returns the payload when the
 * signature checks out, otherwise null. Never throws.
 */
export async function verifyLicenseKey(
  input: string,
  publicKeys: readonly string[] = LICENSE_PUBLIC_KEYS
): Promise<LicensePayload | null> {
  try {
    const key = normalizeKey(input);
    const all = base32Decode(key.slice(KEY_PREFIX.length));
    if (!all || all.length !== PAYLOAD_BYTES + SIG_BYTES) return null;
    const payloadBytes = all.slice(0, PAYLOAD_BYTES);
    const sig = all.slice(PAYLOAD_BYTES);
    const payload = decodePayload(payloadBytes);
    if (!payload) return null;
    for (const pk of publicKeys) {
      if (await ed.verifyAsync(sig, payloadBytes, hexToBytes(pk))) return payload;
    }
    return null;
  } catch {
    return null;
  }
}
