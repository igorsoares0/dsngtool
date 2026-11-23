"use client";

import Link from "next/link";
import { cx } from "../ui/cx";
import { useLicenseStore } from "../../store/license-store";
import { usePlanStore } from "../../store/plan-store";
import type { Nav } from "./types";

/** "modo." · Projects | Settings. Full-height cells split by hairlines, like
 *  the editor's topbar. */
export default function DashboardTopbar({ nav, onNav }: { nav: Nav; onNav: (n: Nav) => void }) {
  const free = useLicenseStore((s) => s.status === "none");
  const openUpgrade = usePlanStore((s) => s.openUpgrade);
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
        {(["projects", "settings"] as const).map((n) => (
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

      <span className="hidden sm:flex items-center px-5 border-l border-border-default font-mono text-[10.5px] text-text-tertiary">
        SAVED ON THIS DEVICE
      </span>

      {free && (
        <button
          onClick={() => openUpgrade("generic")}
          className="flex items-center gap-2 px-5 border-l border-border-default font-mono text-[11px] font-medium uppercase text-text-primary hover:bg-surface-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          <span className="hidden sm:inline text-text-tertiary">Free plan ·</span>
          Go lifetime
        </button>
      )}
    </header>
  );
}
