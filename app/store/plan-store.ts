import { create } from "zustand";
import { db } from "../lib/db";
import { useLicenseStore } from "./license-store";
import { TEMPLATES, type Template } from "../data/templates";

/**
 * The free plan. Everyone can use the editor, the AI brief (with their own key),
 * open .modo files and back up their data. A license adds:
 *  - unlimited image exports (the free plan gets FREE_EXPORTS, ever, per device);
 *  - the premium templates;
 *  - saving .modo project files.
 *
 * Like the license itself this is enforced on the device only, so DevTools or a
 * cleared browser gets around it. Accepted: anyone that determined wasn't going
 * to buy, and a server-side meter would break the no-account, offline premise.
 */
export const FREE_EXPORTS = 3;

/** Why the upgrade dialog was opened; picks its headline. */
export type UpgradeReason = "exports" | "template" | "project-file" | "generic";

const USAGE_KEY = "freeExportsUsed";

interface PlanState {
  exportsUsed: number;
  usageLoaded: boolean;
  loadUsage: () => Promise<void>;
  /** Count one image export (one Download click, however many pages). */
  recordExport: () => Promise<void>;

  upgradeReason: UpgradeReason | null;
  openUpgrade: (reason?: UpgradeReason) => void;
  closeUpgrade: () => void;
}

let loading: Promise<void> | null = null;

export const usePlanStore = create<PlanState>((set, get) => ({
  exportsUsed: 0,
  usageLoaded: false,
  loadUsage: () => {
    loading ??= (async () => {
      try {
        const row = await db.settings.get(USAGE_KEY);
        const n = typeof row?.value === "number" ? row.value : 0;
        set({ exportsUsed: n, usageLoaded: true });
      } catch {
        set({ usageLoaded: true });
      }
    })();
    return loading;
  },
  recordExport: async () => {
    await get().loadUsage();
    const next = get().exportsUsed + 1;
    set({ exportsUsed: next });
    try {
      await db.settings.put({ key: USAGE_KEY, value: next });
    } catch {
      // IndexedDB unavailable: the count holds for this session only.
    }
  },

  upgradeReason: null,
  openUpgrade: (reason = "generic") => set({ upgradeReason: reason }),
  closeUpgrade: () => set({ upgradeReason: null }),
}));

/** True once a valid license is active on this device. */
export function useIsLicensed(): boolean {
  return useLicenseStore((s) => s.status === "active");
}

/** Non-hook read, for event handlers. Waits for the license cache. */
export async function isLicensed(): Promise<boolean> {
  await useLicenseStore.getState().hydrate();
  return useLicenseStore.getState().status === "active";
}

export function isTemplateLocked(t: Template, licensed: boolean): boolean {
  return !licensed && !!t.premium;
}

/** The templates this device may use — what the AI brief picks from. */
export function availableTemplates(licensed: boolean): Template[] {
  return licensed ? TEMPLATES : TEMPLATES.filter((t) => !t.premium);
}
