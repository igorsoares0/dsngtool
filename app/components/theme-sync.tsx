"use client";

import { useEffect } from "react";
import { useThemeStore } from "../store/theme-store";

// Keeps the theme store in step with the document and the OS. The `.dark` class
// is already correct before hydration (see the pre-paint script in layout.tsx);
// this only adopts the stored preference into React state and follows the OS
// while the preference is "system".
export default function ThemeSync() {
  const hydrate = useThemeStore((s) => s.hydrate);
  const syncFromSystem = useThemeStore((s) => s.syncFromSystem);

  useEffect(() => {
    hydrate();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => syncFromSystem();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hydrate, syncFromSystem]);

  return null;
}
