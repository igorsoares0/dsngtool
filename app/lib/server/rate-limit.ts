import "server-only";

/**
 * Per-client request throttle for the anonymous license routes.
 *
 * Deliberately in-memory: the app runs as a single persistent Node process on
 * Coolify, so a shared store would buy nothing but a Postgres round-trip on
 * every request. If this ever runs multi-instance, swap the Map for Redis —
 * the call sites don't change.
 *
 * Fixed window rather than a token bucket: the point is to bound how fast one
 * account can write, not to shape traffic. A burst at a window boundary can
 * reach 2x the limit, which is fine for these ceilings.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Entries are only evicted lazily (on the next hit for the same key), so a
// steady stream of distinct users would grow the map forever. Sweep it when it
// gets big rather than on a timer, which would keep the process awake.
const MAX_TRACKED = 10_000;

function sweep(now: number) {
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when `ok` is false. */
  retryAfter: number;
}

/**
 * Count one request against `key`. `limit` requests are allowed per
 * `windowSeconds`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  if (windows.size > MAX_TRACKED) sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfter: 0 };
  }

  existing.count++;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** 429 with Retry-After, the response every caller wants on a miss. */
export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: "rate_limited", retryAfter: result.retryAfter },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

/**
 * Best-effort client address for anonymous routes. Coolify's proxy (Traefik)
 * appends the real peer to X-Forwarded-For; the left-most entry is the
 * original client. Spoofable, but these limits only blunt scraping.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Ceilings per client IP. The license routes are anonymous, so these only stop
 * a script from walking license ids or transaction ids; real clients call them
 * a handful of times a day.
 */
export const LIMITS = {
  /** GET /api/license/status — the app checks at most once a day. */
  licenseStatus: { limit: 30, window: 60 },
  /** GET /api/license/by-transaction — polled for ~30s after a checkout. */
  licenseByTransaction: { limit: 40, window: 60 },
} as const;
