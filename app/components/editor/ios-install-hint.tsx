"use client";

import { useEffect, useState } from "react";
import { useInstallPrompt } from "../../hooks/use-install-prompt";
import { CloseIcon } from "./icons";

const DISMISS_KEY = "modo-ios-hint-dismissed";

// iOS Safari can't be prompted to install programmatically, so we show a small
// dismissible hint pointing users to the Share → Add to Home Screen flow.
export default function IosInstallHint() {
  const { showIOSHint } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!showIOSHint || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,380px)] animate-fade-in">
      <div className="flex items-start gap-3 bg-surface-2 border border-border-default rounded-xl px-4 py-3 shadow-pop">
        <div className="shrink-0 mt-0.5 text-accent">
          {/* iOS share glyph */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4" />
            <polyline points="8 8 12 4 16 8" />
            <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
          </svg>
        </div>
        <div className="flex-1 text-xs text-text-secondary leading-relaxed">
          <span className="text-text-primary font-medium">Install Modo</span> — tap{" "}
          <span className="text-accent">Share</span> then{" "}
          <span className="text-accent">Add to Home Screen</span>.
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install hint"
          className="shrink-0 -mr-1 p-1 text-text-tertiary hover:text-text-secondary rounded-md hover:bg-surface-3 transition-colors"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
