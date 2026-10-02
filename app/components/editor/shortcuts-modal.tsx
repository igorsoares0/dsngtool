"use client";

import Modal from "../ui/modal";
import SectionLabel from "../ui/section-label";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";

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
    title: "Create",
    items: [
      { keys: [mod, "K"], label: "Brief the AI" },
      { keys: ["T"], label: "Add a heading" },
      { keys: ["Shift", "T"], label: "Add a subheading" },
      { keys: [alt, "T"], label: "Add body text" },
      { keys: [mod, "E"], label: "Export" },
    ],
  },
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
      { keys: [mod, "L"], label: "Lock / unlock" },
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
    items: [
      { keys: ["/"], label: "Search the open panel" },
      { keys: ["?"], label: "Show this dialog" },
    ],
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
        <span className="font-mono text-[10.5px] uppercase text-text-tertiary">
          Press <kbd className="px-1 border border-border-default text-text-primary">?</kbd> any time to open this
        </span>
      }
    >
      <div className="space-y-5">
        {GROUPS.map((group, gi) => (
          <div key={group.title}>
            <div className="mb-2">
              <SectionLabel code={String.fromCharCode(65 + gi)}>{group.title}</SectionLabel>
            </div>
            <div className="border-t border-border-default">
              {group.items.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-4 h-8 border-b border-border-default text-[12.5px]">
                  <span className="text-text-secondary">{s.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 border border-border-default font-mono text-[10.5px] font-medium tabular-nums text-text-primary min-w-[20px] text-center"
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
