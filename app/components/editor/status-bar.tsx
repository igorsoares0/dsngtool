"use client";

import { useEffect } from "react";
import { useEditorStore } from "../../store/editor-store";
import { useSettingsStore } from "../../store/settings-store";
import { cx } from "../ui/cx";

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("flex items-center px-3.5", className)}>{children}</span>;
}

/** The 26px mono readout along the bottom of the editor. */
export default function StatusBar({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const pageCount = useEditorStore((s) => s.pages.length);
  const pageIndex = useEditorStore((s) =>
    Math.max(0, s.pages.findIndex((p) => p.id === s.activePageId))
  );
  const layerCount = useEditorStore((s) => s.elements.length);
  const selectedCount = useEditorStore((s) => s.selectedIds.length);
  const aiKey = useSettingsStore((s) => s.aiKey);
  const aiKeyLoaded = useSettingsStore((s) => s.aiKeyLoaded);
  const loadAiKey = useSettingsStore((s) => s.loadAiKey);
  const openSettings = useSettingsStore((s) => s.openSettings);
  useEffect(() => {
    void loadAiKey();
  }, [loadAiKey]);

  const saved = lastSavedAt
    ? `SAVED ${new Date(lastSavedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
    : "NOT SAVED YET";

  return (
    <footer className="hidden lg:flex h-[26px] shrink-0 items-stretch bg-surface-1 border-t border-border-default font-mono text-[10.5px] text-text-tertiary whitespace-nowrap">
      <Cell className="border-r border-border-default">
        {saved}&nbsp;· ON THIS DEVICE
      </Cell>
      <Cell className="border-r border-border-default">
        PAGE {pageIndex + 1}/{pageCount}
      </Cell>
      <Cell className="border-r border-border-default">
        {layerCount} {layerCount === 1 ? "LAYER" : "LAYERS"}
        {selectedCount > 0 && ` · ${selectedCount} SELECTED`}
      </Cell>
      <span className="flex-1" />
      {aiKeyLoaded && (
        <button
          type="button"
          onClick={() => openSettings("ai")}
          className="flex items-center gap-1.5 px-3.5 border-l border-border-default hover:text-text-primary hover:bg-surface-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          AI
          <span className={cx("w-[5px] h-2.5", aiKey ? "bg-ai" : "bg-text-tertiary")} aria-hidden />
          {aiKey ? "YOUR KEY" : "ADD KEY"}
        </button>
      )}
      <button
        type="button"
        onClick={onOpenShortcuts}
        className="flex items-center px-3.5 border-l border-border-default hover:text-text-primary hover:bg-surface-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
      >
        ? SHORTCUTS
      </button>
    </footer>
  );
}
