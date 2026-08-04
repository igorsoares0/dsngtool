"use client";

import Modal from "../ui/modal";

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
  return (
    <Modal
      open
      onClose={onClose}
      title="Keyboard shortcuts"
      width="max-w-[460px]"
      footer={
        <span className="text-[11.5px] text-text-ghost">
          Press{" "}
          <kbd className="px-1 bg-surface-3 border border-border-subtle rounded-sm font-mono">
            ?
          </kbd>{" "}
          any time to open this dialog
        </span>
      }
    >
      <div className="space-y-5">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-ghost mb-2">
              {group.title}
            </h3>
            <div className="space-y-1.5">
              {group.items.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-4 text-[11.5px]">
                  <span className="text-text-secondary">{s.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 bg-surface-3 border border-border-subtle rounded-sm text-[11px] font-mono tabular-nums text-text-primary min-w-[20px] text-center"
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
    </Modal>
  );
}
