"use client";

import Link from "next/link";
import { useEntitlementStore } from "../../store/entitlement-store";
import AccountMenu from "../editor/account-menu";
import { StorageMeterInline } from "../editor/storage-meter";
import { cx } from "../ui/cx";
import type { Nav } from "./types";

/** "modo." · Projects | Account · storage · Try Pro · avatar. Full-height
 *  cells split by hairlines, like the editor's topbar. */
export default function DashboardTopbar({ nav, onNav }: { nav: Nav; onNav: (n: Nav) => void }) {
  const pro = useEntitlementStore((s) => s.pro);
  const openUpgrade = useEntitlementStore((s) => s.openModal);
  const storage = useEntitlementStore((s) => s.storage);

  return (
    <header className="h-12 shrink-0 flex items-stretch bg-surface-1 border-b border-border-default whitespace-nowrap">
      <Link
        href="/"
        aria-label="Open the editor"
        className="flex items-center px-[22px] border-r border-border-default text-[17px] font-black font-wide tracking-[-0.02em] hover:bg-surface-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
      >
        modo<span className="text-accent">.</span>
      </Link>

      <nav className="flex items-stretch" aria-label="Dashboard">
        {(["projects", "account"] as const).map((n) => (
          <button
            key={n}
            onClick={() => onNav(n)}
            aria-current={nav === n ? "page" : undefined}
            className={cx(
              "flex items-center px-5 text-[13px] capitalize transition-colors",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
              nav === n
                ? "font-bold text-text-primary shadow-[inset_0_-2px_0_var(--text-primary)]"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {n}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {storage && (
        <button
          type="button"
          onClick={() => onNav("account")}
          className="hidden md:flex items-center gap-3 px-5 border-l border-border-default hover:bg-surface-3"
          aria-label="Storage — see plan and usage"
        >
          <span className="font-mono text-[10.5px] text-text-tertiary">STORAGE</span>
          <StorageMeterInline />
        </button>
      )}

      {!pro && (
        <button
          type="button"
          onClick={() => openUpgrade()}
          className="hidden sm:flex items-center gap-2 px-5 border-l border-border-default text-[13px] font-semibold hover:bg-surface-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          Try Pro
          <span className="font-mono text-[10.5px] font-medium border border-text-primary px-1 py-px">$10</span>
        </button>
      )}

      <div className="w-12 flex items-center justify-center border-l border-border-default shrink-0">
        <AccountMenu />
      </div>
    </header>
  );
}
