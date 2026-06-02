import { create } from "zustand";
import { db } from "../lib/db";

export type LicenseTier = "free" | "pro";

export interface LicenseData {
  key: string;
  tier: LicenseTier;
  email: string | null;
  validatedAt: number; // epoch ms of last successful online validation
}

interface LicenseState {
  tier: LicenseTier;
  key: string | null;
  email: string | null;
  validatedAt: number | null;
  /** True once we've loaded any cached license from IndexedDB. */
  hydrated: boolean;
  /** Whether the upgrade/license modal is open, and why it was triggered. */
  modalOpen: boolean;
  upsellReason: string | null;
  setLicense: (data: LicenseData) => void;
  setHydrated: (license: LicenseData | null) => void;
  clear: () => void;
  openModal: (reason?: string) => void;
  closeModal: () => void;
}

const SETTINGS_KEY = "license";

export const useLicenseStore = create<LicenseState>((set) => ({
  tier: "free",
  key: null,
  email: null,
  validatedAt: null,
  hydrated: false,
  modalOpen: false,
  upsellReason: null,

  openModal: (reason) => set({ modalOpen: true, upsellReason: reason ?? null }),
  closeModal: () => set({ modalOpen: false, upsellReason: null }),

  setLicense: (data) => {
    set({
      tier: data.tier,
      key: data.key,
      email: data.email,
      validatedAt: data.validatedAt,
    });
    db.settings.put({ key: SETTINGS_KEY, value: data }).catch(() => {});
  },

  setHydrated: (license) => {
    if (license) {
      set({
        tier: license.tier,
        key: license.key,
        email: license.email,
        validatedAt: license.validatedAt,
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  clear: () => {
    set({ tier: "free", key: null, email: null, validatedAt: null });
    db.settings.delete(SETTINGS_KEY).catch(() => {});
  },
}));

/** Read the cached license straight from IndexedDB (used on boot). */
export async function loadCachedLicense(): Promise<LicenseData | null> {
  try {
    const row = await db.settings.get(SETTINGS_KEY);
    return (row?.value as LicenseData) ?? null;
  } catch {
    return null;
  }
}

/** Convenience selector for components: `useIsPro()`. */
export const useIsPro = () => useLicenseStore((s) => s.tier === "pro");
