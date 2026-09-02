import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Read synchronously by the pre-paint script in `app/layout.tsx`. It has to be
 *  localStorage and not the Dexie `settings` table (`app/lib/project-repo.ts`): Dexie is
 *  await-based, so reading the preference there would always paint the wrong
 *  theme first and flash. */
export const THEME_STORAGE_KEY = "modo-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

/** Applies the theme to the document. Kept out of React so `setTheme` takes
 *  effect on the same tick as the click. */
function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

interface ThemeState {
  /** What the user picked. */
  theme: ThemePreference;
  /** What is actually applied — `theme` with "system" resolved. */
  resolved: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  /** Re-resolves without changing the preference. Used when the OS theme
   *  changes while the preference is "system". */
  syncFromSystem: () => void;
  /** Adopts the persisted preference on mount. */
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // SSR renders the light default; the pre-paint script has already set the
  // real class on <html> before hydration, so nothing flashes.
  theme: "system",
  resolved: "light",

  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Private mode / storage disabled — the theme still applies for this session.
    }
    applyTheme(resolved);
    set({ theme, resolved });
  },

  syncFromSystem: () => {
    if (get().theme !== "system") return;
    const resolved = resolveTheme("system");
    applyTheme(resolved);
    set({ resolved });
  },

  hydrate: () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // ignore
    }
    const theme: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ theme, resolved });
  },
}));

/** Convenience selector: `useResolvedTheme()`. */
export const useResolvedTheme = () => useThemeStore((s) => s.resolved);
