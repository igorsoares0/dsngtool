import "server-only";
import { prisma } from "./db";

const MB = 1024 * 1024;

// Plan storage ceilings. Free 250MB / paid 1GB — see the monetization plan.
export const STORAGE_LIMITS = {
  free: 250 * MB,
  pro: 1024 * MB,
} as const;

/** Per-file guard so a single huge upload can't blow past the quota in one shot. */
export const MAX_UPLOAD_BYTES = 15 * MB;

// Project JSON lives in Postgres, NOT in R2, so it is not covered by the
// storage quota above. Without its own ceiling the sync endpoint is unmetered
// writable storage for any signed-in account. These two caps are that ceiling.
//
// 512KB is far above a real design: elements carry text, coordinates and style,
// while images are R2 URLs rather than inline data. The largest bundled
// template serializes to a few dozen KB.
export const MAX_PROJECT_BYTES = 512 * 1024;
/** Per-user project count. GET /api/projects returns them all in one response. */
export const MAX_PROJECTS_PER_USER = 200;
/** Long enough for any real title, short enough to keep list responses sane. */
export const MAX_PROJECT_NAME_LENGTH = 200;

// SVG is intentionally excluded: it can carry <script> and, served from our own
// origin, becomes a stored-XSS vector. Re-enable only behind server-side
// sanitization (e.g. DOMPurify) if raster-only uploads prove too limiting.
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/**
 * Identify an image by its leading bytes.
 *
 * `File.type` is whatever the browser was told the file is — it is a hint from
 * the client, not evidence, and nothing stops a caller from labelling arbitrary
 * bytes `image/png`. The allowlist above is only meaningful if the content
 * agrees with the label, so every upload is sniffed and the *sniffed* type is
 * what gets stored and later served.
 *
 * Returns null when the bytes match none of the supported formats.
 */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // PNG: \x89PNG\r\n\x1a\n
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // GIF: "GIF87a" / "GIF89a"
  if (buf.subarray(0, 6).toString("latin1").match(/^GIF8[79]a$/)) return "image/gif";
  // WebP: "RIFF" .... "WEBP"
  if (
    buf.subarray(0, 4).toString("latin1") === "RIFF" &&
    buf.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

// Subscription statuses that grant the paid ceiling. past_due is included so a
// failed renewal (dunning) doesn't instantly revoke access — Paddle keeps
// retrying and only sends `canceled` once it gives up. A scheduled cancellation
// keeps status `active` until the period ends, so it's covered too.
const ENTITLED_STATUSES = ["active", "trialing", "past_due"];

/** Whether the user currently has an entitling subscription. */
export async function isPro(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ENTITLED_STATUSES } },
    select: { id: true },
  });
  return sub !== null;
}

/** The user's storage ceiling, derived from their subscription. */
export async function getStorageLimit(userId: string): Promise<number> {
  return (await isPro(userId)) ? STORAGE_LIMITS.pro : STORAGE_LIMITS.free;
}

/** Total bytes the user currently occupies (sum of their assets). */
export async function getStorageUsed(userId: string): Promise<number> {
  const agg = await prisma.asset.aggregate({
    where: { userId },
    _sum: { bytes: true },
  });
  return agg._sum.bytes ?? 0;
}

export interface StorageStatus {
  used: number;
  limit: number;
  remaining: number;
}

export async function getStorageStatus(userId: string): Promise<StorageStatus> {
  const [used, limit] = await Promise.all([getStorageUsed(userId), getStorageLimit(userId)]);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/** True when `incomingBytes` still fits under the user's ceiling. */
export async function canFit(userId: string, incomingBytes: number): Promise<boolean> {
  const { remaining } = await getStorageStatus(userId);
  return incomingBytes <= remaining;
}
