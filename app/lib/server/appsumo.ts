import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "./license";

/**
 * AppSumo Licensing integration (docs.licensing.appsumo.com).
 *
 * AppSumo owns its license keys (UUIDs). It tells us about them through a
 * webhook, and a buyer redeems one by following an OAuth redirect back to us;
 * we then mint our own signed Modo key bound to theirs.
 */

const TOKEN_URL = "https://appsumo.com/openid/token/";
const LICENSE_URL = "https://appsumo.com/openid/license_key/";

/** The OAuth redirect URL. Must match the Partner Portal value byte for byte. */
export function redirectUri(): string {
  return process.env.APPSUMO_REDIRECT_URI ?? `${appUrl()}/api/appsumo/redeem`;
}

/**
 * Webhook authenticity: hex HMAC-SHA256 of `${timestamp}${rawBody}`, keyed with
 * the partner API key, in X-Appsumo-Signature (timestamp in X-Appsumo-Timestamp).
 */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const apiKey = process.env.APPSUMO_API_KEY;
  if (!apiKey || !timestamp || !signature) return false;
  const expected = createHmac("sha256", apiKey).update(`${timestamp}${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface AppSumoLicense {
  license_key: string;
  status: string;
}

/** Exchange the one-time OAuth code and read the buyer's AppSumo license. */
export async function redeemCode(code: string): Promise<AppSumoLicense> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.APPSUMO_CLIENT_ID,
      client_secret: process.env.APPSUMO_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const token = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !token.access_token) {
    throw new Error(`token exchange failed (${tokenRes.status}): ${token.error ?? "no access_token"}`);
  }

  const licRes = await fetch(
    `${LICENSE_URL}?access_token=${encodeURIComponent(token.access_token)}`,
    { cache: "no-store" }
  );
  const license = (await licRes.json().catch(() => ({}))) as Partial<AppSumoLicense>;
  if (!licRes.ok || !license.license_key) {
    throw new Error(`license lookup failed (${licRes.status})`);
  }
  return { license_key: license.license_key, status: license.status ?? "unknown" };
}
