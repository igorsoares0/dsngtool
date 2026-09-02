import { create } from "zustand";
import { IS_DESKTOP } from "../lib/platform";

export interface StorageStatus {
  used: number;
  limit: number;
  remaining: number;
}

interface EntitlementState {
  /** True when the user has an active paid subscription. */
  pro: boolean;
  storage: StorageStatus | null;
  /** True once /api/me has been read at least once. */
  hydrated: boolean;
  /** Upgrade modal open state + why it was triggered. */
  modalOpen: boolean;
  upsellReason: string | null;
  /** Re-read entitlement + storage from the server. */
  refresh: () => Promise<void>;
  openModal: (reason?: string) => void;
  closeModal: () => void;
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  // The desktop build has no subscription and no metered storage — projects and
  // images live on the user's own disk — so everything the paid tier unlocks is
  // simply on, and `hydrated` starts true because there is nothing to wait for.
  pro: IS_DESKTOP,
  storage: null,
  hydrated: IS_DESKTOP,
  modalOpen: false,
  upsellReason: null,

  openModal: (reason) => set({ modalOpen: true, upsellReason: reason ?? null }),
  closeModal: () => set({ modalOpen: false, upsellReason: null }),

  refresh: async () => {
    if (IS_DESKTOP) return;
    try {
      const res = await fetch("/api/me");
      if (!res.ok) {
        set({ hydrated: true });
        return;
      }
      const data = (await res.json()) as { pro?: boolean; storage?: StorageStatus };
      set({ pro: !!data.pro, storage: data.storage ?? null, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));

/** Convenience selector: `useIsPro()`. */
export const useIsPro = () => useEntitlementStore((s) => s.pro);
