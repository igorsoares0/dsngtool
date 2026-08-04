import { create } from "zustand";

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
  pro: false,
  storage: null,
  hydrated: false,
  modalOpen: false,
  upsellReason: null,

  openModal: (reason) => set({ modalOpen: true, upsellReason: reason ?? null }),
  closeModal: () => set({ modalOpen: false, upsellReason: null }),

  refresh: async () => {
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
