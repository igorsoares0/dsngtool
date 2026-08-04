"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "../../lib/auth-client";
import ThemeSelect from "../ui/theme-select";
import StorageMeter from "./storage-meter";

/**
 * Topbar account control. Login is optional (the editor works signed-out), so
 * this shows a "Sign in" link when there's no session and an avatar menu when
 * there is.
 */
export default function AccountMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Avoid a flash of the signed-out state while the session is loading.
  if (isPending) {
    return <div className="w-7 h-7 rounded-full bg-surface-2 animate-pulse" aria-hidden="true" />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary bg-surface-2 border border-border-default hover:bg-surface-4 text-[11.5px] font-medium px-2.5 py-1.5 rounded-md transition-colors duration-150 ease-standard"
      >
        Sign in
      </Link>
    );
  }

  const user = session.user;
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-[27px] h-[27px] rounded-full bg-surface-4 text-text-secondary text-[11px] font-semibold flex items-center justify-center hover:bg-surface-3 transition-colors duration-150 ease-standard overflow-hidden shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-surface-2 border border-border-default rounded-lg min-w-[232px] shadow-pop animate-scale-in z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border-subtle">
            <p className="text-[11.5px] font-medium text-text-primary truncate">
              {user.name || "Your account"}
            </p>
            <p className="text-[11px] text-text-ghost truncate">{user.email}</p>
            {!user.emailVerified && (
              <p className="text-[11px] text-warning mt-1">Email not verified</p>
            )}
          </div>

          {/* Storage lives here now — the redesigned topbar has no room for a
              persistent meter. */}
          <div className="px-3 py-2.5 border-b border-border-subtle">
            <StorageMeter />
          </div>

          <div className="px-3 py-2.5 border-b border-border-subtle flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-text-secondary">Theme</span>
            <ThemeSelect />
          </div>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 text-[11.5px] text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors duration-150 ease-standard flex items-center gap-2"
          >
            <GridIcon />
            Dashboard
          </Link>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.refresh();
            }}
            className="w-full text-left px-3 py-2 text-[11.5px] text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors duration-150 ease-standard flex items-center gap-2 border-t border-border-subtle"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
