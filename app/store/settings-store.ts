import { create } from "zustand";
import { db } from "../lib/db";

const AI_KEY = "anthropicKey";

interface SettingsState {
  /** The user's Anthropic API key (BYOK). Null when unset. */
  aiKey: string | null;
  aiKeyLoaded: boolean;
  loadAiKey: () => Promise<void>;
  setAiKey: (key: string | null) => Promise<void>;

  /** Settings dialog, opened from the editor and the dashboard. */
  open: boolean;
  /** Which section to scroll to when opened (e.g. "ai" from the AI bar). */
  focus: "ai" | "license" | "data" | null;
  openSettings: (focus?: SettingsState["focus"]) => void;
  closeSettings: () => void;
}

let loading: Promise<void> | null = null;

/**
 * Device-level preferences. The AI key lives in IndexedDB on this device only;
 * it is sent to api.anthropic.com and nowhere else.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  aiKey: null,
  aiKeyLoaded: false,
  loadAiKey: () => {
    loading ??= (async () => {
      try {
        const row = await db.settings.get(AI_KEY);
        set({ aiKey: typeof row?.value === "string" ? row.value : null, aiKeyLoaded: true });
      } catch {
        set({ aiKeyLoaded: true });
      }
    })();
    return loading;
  },
  setAiKey: async (key) => {
    const clean = key?.trim() || null;
    try {
      if (clean) await db.settings.put({ key: AI_KEY, value: clean });
      else await db.settings.delete(AI_KEY);
    } catch {
      // IndexedDB unavailable: keep it for this session only.
    }
    set({ aiKey: clean, aiKeyLoaded: true });
  },

  open: false,
  focus: null,
  openSettings: (focus = null) => set({ open: true, focus }),
  closeSettings: () => set({ open: false, focus: null }),
}));
