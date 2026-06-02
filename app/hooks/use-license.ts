"use client";

import { useEffect } from "react";
import { db } from "../lib/db";
import {
  useLicenseStore,
  loadCachedLicense,
  type LicenseData,
} from "../store/license-store";

const REVALIDATE_AFTER = 24 * 60 * 60 * 1000; // 24h

/** Stable per-browser id used for the soft activation limit. */
export async function getDeviceId(): Promise<string> {
  try {
    const row = await db.settings.get("deviceId");
    if (row?.value) return row.value as string;
    const id =
      (globalThis.crypto?.randomUUID?.() ?? `dev_${Date.now()}_${Math.random()}`);
    await db.settings.put({ key: "deviceId", value: id });
    return id;
  } catch {
    return "unknown";
  }
}

interface ValidateResponse {
  valid: boolean;
  tier?: "free" | "pro";
  email?: string | null;
  reason?: string;
}

/** Validate a key against the server. Returns the response (or null on network error). */
export async function validateLicense(
  key: string,
  deviceId: string
): Promise<ValidateResponse | null> {
  try {
    const res = await fetch("/api/license/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, deviceId }),
    });
    return (await res.json()) as ValidateResponse;
  } catch {
    return null; // offline / network error
  }
}

/**
 * On boot: hydrate the cached license from IndexedDB, then (if online and the
 * cache is stale) revalidate. A refunded/deactivated key downgrades to free.
 * Offline we trust the cache so the app stays usable.
 */
export function useLicense() {
  const setHydrated = useLicenseStore((s) => s.setHydrated);
  const setLicense = useLicenseStore((s) => s.setLicense);
  const clear = useLicenseStore((s) => s.clear);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await loadCachedLicense();
      if (cancelled) return;
      setHydrated(cached);

      if (!cached?.key) return;
      const stale = Date.now() - cached.validatedAt > REVALIDATE_AFTER;
      if (!stale || !navigator.onLine) return;

      const deviceId = await getDeviceId();
      const result = await validateLicense(cached.key, deviceId);
      if (cancelled || !result) return; // network error -> keep cache

      if (result.valid) {
        const next: LicenseData = {
          key: cached.key,
          tier: result.tier ?? "pro",
          email: result.email ?? cached.email,
          validatedAt: Date.now(),
        };
        setLicense(next);
      } else if (result.reason === "refunded" || result.reason === "deactivated") {
        clear();
      }
      // Other reasons (e.g. transient not_found) leave the cache untouched.
    })();

    return () => {
      cancelled = true;
    };
  }, [setHydrated, setLicense, clear]);
}
