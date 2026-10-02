import { create } from "zustand";
import type { AiUsage } from "../lib/ai-limits";

export interface StorageStatus {
  used: number;
  limit: number;
  remaining: number;
}

interface EntitlementState {
  /** True when the user has an active paid subscription. */
  pro: boolean;
  storage: StorageStatus | null;
  /** This month's AI generations. Null until /api/me answers. */
  ai: AiUsage | null;
  /** True once /api/me has been read at least once. */
  hydrated: boolean;
  /** Upgrade modal open state + why it was triggered. */
  modalOpen: boolean;
  upsellReason: string | null;
  /** Re-read entitlement + storage from the server. */
  refresh: () => Promise<void>;
  openModal: (reason?: string) => void;
  closeModal: () => void;
  /** Record a generation's result (the route returns the post-claim count). */
  setAiRemaining: (remaining: number, limit: number) => void;
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  pro: false,
  storage: null,
  ai: null,
  hydrated: false,
  modalOpen: false,
  upsellReason: null,

  openModal: (reason) => set({ modalOpen: true, upsellReason: reason ?? null }),
  closeModal: () => set({ modalOpen: false, upsellReason: null }),
  setAiRemaining: (remaining, limit) =>
    set((s) => ({
      ai: {
        used: Math.max(0, limit - remaining),
        limit,
        resetsAt: s.ai?.resetsAt ?? "",
      },
    })),

  refresh: async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) {
        set({ hydrated: true });
        return;
      }
      const data = (await res.json()) as {
        pro?: boolean;
        storage?: StorageStatus;
        ai?: AiUsage;
      };
      set({
        pro: !!data.pro,
        storage: data.storage ?? null,
        ai: data.ai ?? null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));

/** Convenience selector: `useIsPro()`. */
export const useIsPro = () => useEntitlementStore((s) => s.pro);
