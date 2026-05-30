"use client";

import { useEffect, useState } from "react";

// The browser fires `beforeinstallprompt` when the PWA is installable but the
// event isn't in the standard DOM lib, so we model the bits we use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already running as an installed app — nothing to prompt.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes this non-standard flag when launched from home screen.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
    }

    // iOS/iPadOS Safari never fires `beforeinstallprompt`, so installation is
    // manual via the Share sheet — we detect it to show a hint instead.
    const ua = window.navigator.userAgent;
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as desktop Safari but has touch points.
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event can only be used once; drop it regardless of outcome.
    setDeferred(null);
    return outcome;
  };

  // Only show the button when the browser says it's installable and we're not
  // already inside the installed app.
  return {
    canInstall: !!deferred && !installed,
    promptInstall,
    // iOS can't be prompted programmatically — surfaces a manual hint instead.
    showIOSHint: isIOS && !installed,
  };
}
