"use client";

import { useEditorStore, type SyncState } from "../../store/editor-store";
import { useEntitlementStore } from "../../store/entitlement-store";
import { cx } from "../ui/cx";

const SYNC_LABEL: Record<SyncState, string> = {
  idle: "",
  syncing: "SYNCING",
  synced: "SYNCED",
  offline: "OFFLINE · WILL RETRY",
};

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("flex items-center px-3.5", className)}>{children}</span>;
}

/** The 26px mono readout along the bottom of the editor. */
export default function StatusBar({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const syncState = useEditorStore((s) => s.syncState);
  const pageCount = useEditorStore((s) => s.pages.length);
  const pageIndex = useEditorStore((s) =>
    Math.max(0, s.pages.findIndex((p) => p.id === s.activePageId))
  );
  const layerCount = useEditorStore((s) => s.elements.length);
  const selectedCount = useEditorStore((s) => s.selectedIds.length);
  const ai = useEntitlementStore((s) => s.ai);

  const saved = lastSavedAt
    ? `SAVED ${new Date(lastSavedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
    : "NOT SAVED YET";
  const sync = SYNC_LABEL[syncState];
  const left = ai ? Math.max(0, ai.limit - ai.used) : null;
  // One pip per brief on the free plan; Pro's 100 would be noise, so it shows
  // the count only.
  const pips = ai && ai.limit <= 10 ? ai.limit : 0;

  return (
    <footer className="hidden lg:flex h-[26px] shrink-0 items-stretch bg-surface-1 border-t border-border-default font-mono text-[10.5px] text-text-tertiary whitespace-nowrap">
      <Cell className="border-r border-border-default">
        {saved}
        {sync && (
          <span className={cx(syncState === "offline" && "text-warning")}>&nbsp;· {sync}</span>
        )}
      </Cell>
      <Cell className="border-r border-border-default">
        PAGE {pageIndex + 1}/{pageCount}
      </Cell>
      <Cell className="border-r border-border-default">
        {layerCount} {layerCount === 1 ? "LAYER" : "LAYERS"}
        {selectedCount > 0 && ` · ${selectedCount} SELECTED`}
      </Cell>
      <span className="flex-1" />
      {ai && left !== null && (
        <Cell className="gap-1.5 border-l border-border-default">
          AI
          {pips > 0 && (
            <span className="flex gap-[2px]" aria-hidden>
              {Array.from({ length: pips }, (_, i) => (
                <span
                  key={i}
                  className={cx("w-[5px] h-2.5", i < ai.used ? "bg-text-tertiary" : "bg-ai")}
                />
              ))}
            </span>
          )}
          <span className={cx(left === 0 && "text-danger")}>{left} LEFT</span>
        </Cell>
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
