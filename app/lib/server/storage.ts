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

// SVG is intentionally excluded: it can carry <script> and, served from our own
// origin, becomes a stored-XSS vector. Re-enable only behind server-side
// sanitization (e.g. DOMPurify) if raster-only uploads prove too limiting.
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

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
