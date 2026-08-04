"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editor-store";
import { toastDeleted } from "../../store/toast-store";
import { serializeElements } from "../../lib/clipboard";

export interface ContextMenuRequest {
  x: number;
  y: number;
  targetId: string | null;
}

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

type MenuEntry =
  | { type: "sep" }
  | {
      type: "item";
      label: string;
      onClick: () => void;
      kbd?: string;
      disabled?: boolean;
      danger?: boolean;
    };

export default function ContextMenu({
  req,
  containerWidth,
  containerHeight,
  onClose,
}: {
  req: ContextMenuRequest;
  containerWidth: number;
  containerHeight: number;
  onClose: () => void;
}) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.elements);
  const clipboard = useEditorStore((s) => s.clipboard);
  const copySelection = useEditorStore((s) => s.copySelection);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const duplicateSelectedElements = useEditorStore((s) => s.duplicateSelectedElements);
  const removeSelectedElements = useEditorStore((s) => s.removeSelectedElements);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateMultipleElements = useEditorStore((s) => s.updateMultipleElements);
  const moveElement = useEditorStore((s) => s.moveElement);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const selectAll = useEditorStore((s) => s.selectAll);

  const menuRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (menuRef.current) {
      setSize({
        width: menuRef.current.offsetWidth,
        height: menuRef.current.offsetHeight,
      });
    }
  }, []);

  // Close on outside interaction / escape / scroll.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("wheel", onClose, { passive: true });
    window.addEventListener("blur", onClose);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("wheel", onClose);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const selectedEls = elements.filter((e) => selectedIds.includes(e.id));
  const isSingle = selectedEls.length === 1;
  const single = isSingle ? selectedEls[0] : null;
  const allLocked = selectedEls.length > 0 && selectedEls.every((e) => e.locked);
  const hasClipboard = !!clipboard && clipboard.length > 0;

  const handleCopy = () => {
    copySelection();
    try {
      void navigator.clipboard?.writeText(serializeElements(selectedEls));
    } catch {
      // best-effort OS clipboard sync
    }
  };

  const toggleLock = () => {
    if (isSingle && single) {
      updateElement(single.id, { locked: !single.locked });
      return;
    }
    const updates = new Map<string, { locked: boolean }>();
    for (const id of selectedIds) updates.set(id, { locked: !allLocked });
    updateMultipleElements(updates);
  };

  const onElement = req.targetId !== null && selectedEls.length > 0;

  const entries: MenuEntry[] = onElement
    ? [
        { type: "item", label: "Copy", kbd: `${mod} C`, onClick: handleCopy },
        {
          type: "item",
          label: "Cut",
          kbd: `${mod} X`,
          onClick: () => {
            handleCopy();
            removeSelectedElements();
          },
        },
        {
          type: "item",
          label: "Duplicate",
          kbd: `${mod} D`,
          onClick: duplicateSelectedElements,
        },
        {
          type: "item",
          label: "Paste",
          kbd: `${mod} V`,
          onClick: pasteClipboard,
          disabled: !hasClipboard,
        },
        { type: "sep" },
        ...(isSingle && single
          ? ([
              { type: "item", label: "Bring to front", onClick: () => bringToFront(single.id) },
              { type: "item", label: "Bring forward", onClick: () => moveElement(single.id, "up") },
              { type: "item", label: "Send backward", onClick: () => moveElement(single.id, "down") },
              { type: "item", label: "Send to back", onClick: () => sendToBack(single.id) },
              { type: "sep" },
            ] as MenuEntry[])
          : []),
        {
          type: "item",
          label: allLocked ? "Unlock" : "Lock",
          onClick: toggleLock,
        },
        ...(isSingle && single
          ? ([
              {
                type: "item",
                label: single.hidden ? "Show" : "Hide",
                onClick: () => updateElement(single.id, { hidden: !single.hidden }),
              },
            ] as MenuEntry[])
          : []),
        { type: "sep" },
        {
          type: "item",
          label: "Delete",
          kbd: "Del",
          danger: true,
          onClick: () => {
            const count = selectedIds.length;
            removeSelectedElements();
            toastDeleted(count);
          },
        },
      ]
    : [
        {
          type: "item",
          label: "Paste",
          kbd: `${mod} V`,
          onClick: pasteClipboard,
          disabled: !hasClipboard,
        },
        {
          type: "item",
          label: "Select all",
          kbd: `${mod} A`,
          onClick: selectAll,
          disabled: elements.length === 0,
        },
      ];

  const margin = 8;
  const left = Math.min(req.x, Math.max(margin, containerWidth - size.width - margin));
  const top = Math.min(req.y, Math.max(margin, containerHeight - size.height - margin));

  return (
    <div
      ref={menuRef}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      className="absolute z-[110] min-w-[180px] bg-surface-2 border border-border-default rounded-lg shadow-pop py-1 animate-scale-in origin-top-left"
      style={{ left, top }}
    >
      {entries.map((entry, i) =>
        entry.type === "sep" ? (
          <div key={`sep-${i}`} className="h-px bg-border-subtle my-1" />
        ) : (
          <button
            key={entry.label}
            role="menuitem"
            disabled={entry.disabled}
            onClick={() => !entry.disabled && run(entry.onClick)}
            className={`w-full flex items-center justify-between gap-6 px-3 py-1.5 text-xs transition-colors ${
              entry.disabled
                ? "text-text-ghost cursor-not-allowed"
                : entry.danger
                ? "text-danger hover:bg-danger-tint"
                : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
            }`}
          >
            <span>{entry.label}</span>
            {entry.kbd && (
              <span className="text-[11.5px] text-text-ghost tabular-nums">{entry.kbd}</span>
            )}
          </button>
        )
      )}
    </div>
  );
}
