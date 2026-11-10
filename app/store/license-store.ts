import { create } from "zustand";
import { db } from "../lib/db";
import { verifyLicenseKey, normalizeKey, type LicenseSource } from "../lib/license/format";

/** What is kept on the device once a key has been accepted. */
export interface StoredLicense {
  key: string;
  id: string;
  source: LicenseSource;
  activatedAt: number;
  /** Last successful server status check (epoch ms), null if never reached. */
  checkedAt: number | null;
}

export type ActivateResult = "ok" | "invalid" | "revoked";

interface LicenseState {
  /** "loading" until the device cache has been read. */
  status: "loading" | "none" | "active";
  license: StoredLicense | null;
  /** Read and re-verify the cached license. Safe to call more than once. */
  hydrate: () => Promise<void>;
  /** Verify a pasted key on the device and, when reachable, with the server. */
  activate: (rawKey: string) => Promise<ActivateResult>;
  /** Best-effort refund check, at most once per CHECK_EVERY. */
  checkStatus: (opts?: { force?: boolean }) => Promise<void>;
  /** Forget the license on this device. Designs are untouched. */
  deactivate: () => Promise<void>;
}

const SETTINGS_KEY = "license";
const CHECK_EVERY = 24 * 60 * 60 * 1000;

/**
 * Ask the server whether a license was revoked. Null means "couldn't tell"
 * (offline, server down, rate limited) — callers must fail open on it.
 */
async function fetchStatus(id: string): Promise<"active" | "revoked" | null> {
  try {
    const res = await fetch(`/api/license/status?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string };
    return data.status === "revoked" ? "revoked" : data.status === "active" ? "active" : null;
  } catch {
    return null;
  }
}

async function persist(license: StoredLicense | null): Promise<void> {
  try {
    if (license) await db.settings.put({ key: SETTINGS_KEY, value: license });
    else await db.settings.delete(SETTINGS_KEY);
  } catch {
    // IndexedDB unavailable: the license holds for this session only.
  }
}

let hydrating: Promise<void> | null = null;

export const useLicenseStore = create<LicenseState>((set, get) => ({
  status: "loading",
  license: null,

  hydrate: () => {
    hydrating ??= (async () => {
      let cached: StoredLicense | null = null;
      try {
        cached = ((await db.settings.get(SETTINGS_KEY))?.value as StoredLicense) ?? null;
      } catch {
        // IndexedDB unavailable (private mode in some browsers): no cache.
      }
      // Re-verify rather than trusting the cache: it is just a row anyone can
      // write from DevTools, and a rotated-out signing key should stop working.
      const payload = cached ? await verifyLicenseKey(cached.key) : null;
      if (cached && payload) {
        set({ status: "active", license: { ...cached, id: payload.id, source: payload.src } });
      } else {
        if (cached) await persist(null);
        set({ status: "none", license: null });
      }
    })();
    return hydrating;
  },

  activate: async (rawKey) => {
    const key = normalizeKey(rawKey);
    const payload = await verifyLicenseKey(key);
    if (!payload) return "invalid";

    // Catch an already-refunded key up front when we can; offline, accept it.
    const remote = await fetchStatus(payload.id);
    if (remote === "revoked") return "revoked";

    const license: StoredLicense = {
      key,
      id: payload.id,
      source: payload.src,
      activatedAt: Date.now(),
      checkedAt: remote ? Date.now() : null,
    };
    await persist(license);
    set({ status: "active", license });
    return "ok";
  },

  checkStatus: async ({ force = false } = {}) => {
    const license = get().license;
    if (!license) return;
    if (!force && license.checkedAt && Date.now() - license.checkedAt < CHECK_EVERY) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const remote = await fetchStatus(license.id);
    if (remote === "revoked") {
      await get().deactivate();
    } else if (remote === "active") {
      const next = { ...license, checkedAt: Date.now() };
      await persist(next);
      set({ license: next });
    }
    // null: couldn't reach the server — keep working, try again next time.
  },

  deactivate: async () => {
    await persist(null);
    set({ status: "none", license: null });
  },
}));

/** "MODO-04AB…X9Z2" — enough to recognise a key without displaying it. */
export function maskKey(key: string): string {
  return key.length > 16 ? `${key.slice(0, 9)}…${key.slice(-4)}` : key;
}
