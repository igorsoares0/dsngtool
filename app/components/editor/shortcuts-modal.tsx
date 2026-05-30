"use client";

import { useEffect } from "react";
import { CloseIcon } from "./icons";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

interface Shortcut {
  keys: string[];
  label: string;
}

interface Group {
  title: string;
  items: Shortcut[];
}

const GROUPS: Group[] = [
  {
    title: "History",
    items: [
      { keys: [mod, "Z"], label: "Undo" },
      { keys: [mod, "Shift", "Z"], label: "Redo" },
      { keys: [mod, "Y"], label: "Redo (alt)" },
    ],
  },
  {
    title: "Selection",
    items: [
      { keys: [mod, "A"], label: "Select all" },
      { keys: [mod, "D"], label: "Duplicate" },
      { keys: ["Delete"], label: "Delete selection" },
    ],
  },
  {
    title: "Clipboard",
    items: [
      { keys: [mod, "C"], label: "Copy" },
      { keys: [mod, "X"], label: "Cut" },
      { keys: [mod, "V"], label: "Paste (works across projects)" },
    ],
  },
  {
    title: "Movement",
    items: [
      { keys: ["←", "→", "↑", "↓"], label: "Nudge 1px" },
      { keys: ["Shift", "←/→/↑/↓"], label: "Nudge 10px" },
    ],
  },
  {
    title: "Help",
    items: [{ keys: ["?"], label: "Show this dialog" }],
  },
];

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="bg-surface-1 border border-border-default rounded-xl shadow-2xl w-[460px] max-h-[80vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-2 rounded transition-all"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] uppercase tracking-wider text-text-ghost mb-2">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-text-secondary">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="px-1.5 py-0.5 bg-surface-3 border border-border-subtle rounded text-[10px] font-mono text-text-primary min-w-[20px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border-subtle text-[10px] text-text-ghost">
          Press <kbd className="px-1 bg-surface-3 border border-border-subtle rounded font-mono">?</kbd> any time to open this dialog
        </div>
      </div>
    </div>
  );
}
