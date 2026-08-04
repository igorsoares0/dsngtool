"use client";

import { useThemeStore, type ThemePreference } from "../../store/theme-store";
import Segmented from "./segmented";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

/** Light / Dark / System picker. Lives in the account menu and the dashboard. */
export default function ThemeSelect({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <Segmented
      options={OPTIONS}
      value={theme}
      onChange={setTheme}
      size="sm"
      className={className}
    />
  );
}
