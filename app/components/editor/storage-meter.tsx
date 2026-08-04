"use client";

import { useEntitlementStore } from "../../store/entitlement-store";

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Storage-usage bar. Lives in the account dropdown; opens the upgrade modal
 *  when the user is running low (or clicks it on the free plan). */
export default function StorageMeter() {
  const storage = useEntitlementStore((s) => s.storage);
  const pro = useEntitlementStore((s) => s.pro);
  const openModal = useEntitlementStore((s) => s.openModal);

  if (!storage || storage.limit <= 0) return null;

  const pct = Math.min(100, Math.round((storage.used / storage.limit) * 100));
  const nearFull = pct >= 80;
  const barColor = pct >= 95 ? "bg-danger" : nearFull ? "bg-warning" : "bg-accent";

  return (
    <button
      onClick={() =>
        !pro &&
        openModal(
          nearFull
            ? "You're running low on storage. Upgrade to 1GB."
            : undefined
        )
      }
      title={`${formatBytes(storage.used)} of ${formatBytes(storage.limit)} used`}
      className="w-full flex flex-col gap-1.5 text-left group"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-text-secondary font-mono tabular-nums">
          {formatBytes(storage.used)} / {formatBytes(storage.limit)}
        </span>
        {!pro && (
          <span className="text-[11px] font-medium text-accent group-hover:text-accent-hover">
            Upgrade
          </span>
        )}
      </div>
      <div className="w-full h-1 rounded-full bg-surface-4 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}
