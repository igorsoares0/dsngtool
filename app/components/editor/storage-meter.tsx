"use client";

import { useEntitlementStore, type StorageStatus } from "../../store/entitlement-store";
import { cx } from "../ui/cx";

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export type StorageLevel = "ok" | "warn" | "full";

/** Under 80% normal · 80–99% warning · 100% blocked. */
export function storageLevel(storage: StorageStatus): { pct: number; level: StorageLevel } {
  const pct = storage.limit > 0 ? Math.min(100, (storage.used / storage.limit) * 100) : 0;
  const level: StorageLevel = pct >= 100 ? "full" : pct >= 80 ? "warn" : "ok";
  return { pct, level };
}

const LEVEL_BAR: Record<StorageLevel, string> = {
  ok: "bg-text-primary",
  warn: "bg-warning",
  full: "bg-danger",
};
const LEVEL_TEXT: Record<StorageLevel, string> = {
  ok: "text-text-primary",
  warn: "text-warning",
  full: "text-danger",
};

/** A row of discrete bars, `filled` of `count` lit. The VU-meter look shared
 *  by the storage meter and the AI quota. */
export function SegmentBars({
  count,
  filled,
  onClass,
  offClass = "bg-border-default",
  barClassName = "flex-1 h-3",
  className,
}: {
  count: number;
  filled: number;
  onClass: string;
  offClass?: string;
  barClassName?: string;
  className?: string;
}) {
  return (
    <span className={cx("flex gap-[2px]", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cx(barClassName, i < filled ? onClass : offClass)} />
      ))}
    </span>
  );
}

/** The 16 × 5×12px inline meter for the dashboard topbar. */
export function StorageMeterInline({ className }: { className?: string }) {
  const storage = useEntitlementStore((s) => s.storage);
  if (!storage || storage.limit <= 0) return null;
  const { pct, level } = storageLevel(storage);
  return (
    <span
      className={cx("flex items-center gap-2.5", className)}
      title={`${formatBytes(storage.used)} of ${formatBytes(storage.limit)} used`}
    >
      <SegmentBars
        count={16}
        filled={Math.round((pct / 100) * 16)}
        onClass={LEVEL_BAR[level]}
        barClassName="w-[5px] h-3"
      />
      <span className={cx("font-mono text-[11px] font-medium tabular-nums", LEVEL_TEXT[level])}>
        {Math.round(storage.used / (1024 * 1024))}/{formatBytes(storage.limit)}
      </span>
    </span>
  );
}

/**
 * Storage usage as discrete bars plus a mono readout. At 100% it adds the
 * "Storage full" block. Used in the account menu, the uploads panel and the
 * dashboard's plan card.
 */
export default function StorageMeter({
  bars = 16,
  onManage,
}: {
  bars?: number;
  /** Where "Manage files" goes; the button is omitted without it. */
  onManage?: () => void;
}) {
  const storage = useEntitlementStore((s) => s.storage);
  const pro = useEntitlementStore((s) => s.pro);
  const openModal = useEntitlementStore((s) => s.openModal);

  if (!storage || storage.limit <= 0) return null;

  const { pct, level } = storageLevel(storage);
  const left = Math.max(0, storage.limit - storage.used);

  return (
    <div className="flex flex-col gap-1.5">
      <SegmentBars count={bars} filled={Math.round((pct / 100) * bars)} onClass={LEVEL_BAR[level]} />
      <span className={cx("font-mono text-[11px] font-medium tabular-nums", LEVEL_TEXT[level])}>
        {formatBytes(storage.used)} / {formatBytes(storage.limit)}
        {level === "warn" && ` · ${formatBytes(left)} LEFT`}
      </span>
      {level === "full" && (
        <div className="mt-1.5 flex flex-col gap-2.5 p-3.5 border-l-[3px] border-danger bg-danger-tint">
          <span className="text-[15px] font-extrabold font-expanded text-text-primary">Storage full</span>
          <span className="text-[12.5px] leading-[1.45] text-text-secondary">
            New uploads are paused. Delete unused files{pro ? "." : " or move to Pro for 1 GB."}
          </span>
          <div className="flex gap-2">
            {!pro && (
              <button
                type="button"
                onClick={() => openModal("Storage full. Upgrade to 1 GB.")}
                className="bg-accent hover:bg-accent-hover text-accent-fg text-[12px] font-extrabold font-expanded uppercase px-3 py-[7px]"
              >
                Go Pro · $10
              </button>
            )}
            {onManage && (
              <button
                type="button"
                onClick={onManage}
                className="border border-border-default text-[12.5px] font-semibold text-text-primary px-3 py-1.5 hover:bg-surface-3"
              >
                Manage files
              </button>
            )}
          </div>
        </div>
      )}
      {level !== "full" && !pro && (
        <button
          type="button"
          onClick={() =>
            openModal(level === "warn" ? "You're running low on storage. Upgrade to 1 GB." : undefined)
          }
          className="self-start text-[11.5px] font-semibold text-text-secondary hover:text-text-primary underline underline-offset-4 decoration-1"
        >
          Upgrade for 1 GB
        </button>
      )}
    </div>
  );
}
