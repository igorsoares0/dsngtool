"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, signOut } from "../lib/auth-client";
import { wipeLocalAccountData } from "../lib/project-sync";
import { openSubscriptionCheckout } from "../lib/paddle-checkout";
import { toast } from "../store/toast-store";
import Toaster from "../components/editor/toaster";
import ThemeSelect from "../components/ui/theme-select";
import { cx } from "../components/ui/cx";
import DesignThumbnail from "../components/design-thumbnail";
import { normalizePages } from "../lib/project-data";
import {
  TemplatesIcon,
  SearchIcon,
  MoreIcon,
  PlusIcon,
  SunIcon,
} from "../components/editor/icons";

interface StorageStatus {
  used: number;
  limit: number;
  remaining: number;
}
interface Me {
  user: { id: string; email: string; name: string };
  pro: boolean;
  storage: StorageStatus;
}
interface ProjectRow {
  id: string;
  name: string;
  // The whole stored document — /api/projects has always returned `data` in
  // full, which is what lets the cards draw a real preview without a second
  // request or a stored image.
  data: {
    format?: { name?: string; label?: string; width?: number; height?: number };
    pages?: unknown;
    elements?: unknown;
    backgroundColor?: string;
    backgroundGradient?: unknown;
  };
  updatedAt: string;
  deletedAt: string | null;
}

type Nav = "projects" | "account";

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** A project's format, as a chip label. Derived from the stored document — the
 *  dashboard adds no data of its own. */
function formatLabel(p: ProjectRow): string {
  const f = p.data.format;
  if (!f) return "Other";
  if (f.label) return f.label;
  if (f.name) return f.name;
  if (f.width && f.height) return `${f.width}×${f.height}`;
  return "Other";
}

/** The document's canvas size, or null when the record predates it. */
function thumbnailFormat(p: ProjectRow) {
  const f = p.data.format;
  if (!f?.width || !f?.height) return null;
  return { label: f.label ?? "Custom", width: f.width, height: f.height };
}

function pageCount(p: ProjectRow): number {
  return normalizePages(p.data).length;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [nav, setNav] = useState<Nav>("projects");
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("All");
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [meRes, projRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/projects"),
      ]);
      if (meRes.status === 401) {
        router.push("/login?redirect=/dashboard");
        return;
      }
      const meData = (await meRes.json()) as Me;
      const projData = (await projRes.json()) as { projects: ProjectRow[] };
      setMe(meData);
      setProjects(
        (projData.projects ?? [])
          .filter((p) => !p.deletedAt)
          .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      );
    } catch {
      toast.error("Couldn't load your dashboard. Try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuFor]);

  const del = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
    } catch {
      toast.error("Couldn't delete project");
      load();
    }
  };

  const subscribe = async () => {
    if (!me) return;
    setSubscribing(true);
    try {
      await openSubscriptionCheckout({ userId: me.user.id, email: me.user.email });
      toast.info("Finishing up your subscription…");
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch("/api/me");
        const data = (await res.json()) as Me;
        if (data.pro) {
          setMe(data);
          toast.success("You're on Pro — 1GB unlocked 🎉");
          break;
        }
      }
    } catch (e) {
      const msg = (e as Error)?.message;
      if (msg && msg !== "closed") toast.error("Checkout couldn't start. Try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const initial = (me?.user.name || me?.user.email || "?").trim().charAt(0).toUpperCase();
  const pct = me ? Math.min(100, Math.round((me.storage.used / me.storage.limit) * 100)) : 0;
  const barColor = pct >= 80 ? "bg-danger" : "bg-accent";

  const formats = useMemo(
    () => ["All", ...Array.from(new Set(projects.map(formatLabel)))],
    [projects]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (formatFilter === "All" || formatLabel(p) === formatFilter) &&
        (q === "" || p.name.toLowerCase().includes(q))
    );
  }, [projects, query, formatFilter]);

  // `body { overflow: hidden }` is global for the editor's sake, so this page
  // has to own its own scroll container.
  return (
    <div className="h-full flex overflow-hidden bg-surface-0 text-text-primary">
      {/* ---------- Side nav ---------- */}
      <nav className="hidden md:flex w-[212px] shrink-0 bg-surface-1 border-r border-border-subtle flex-col justify-between p-3">
        <div className="flex flex-col gap-1">
          <Link href="/" className="flex items-center gap-2.5 px-2 py-2 mb-2">
            <span className="w-[26px] h-[26px] rounded-md bg-accent text-accent-fg text-[12px] font-semibold flex items-center justify-center">
              M
            </span>
            <span className="text-[15px] font-semibold">Modo</span>
          </Link>

          <NavItem
            active={nav === "projects"}
            onClick={() => setNav("projects")}
            icon={<TemplatesIcon className="w-4 h-4" />}
          >
            Projects
          </NavItem>
          <NavItem
            active={nav === "account"}
            onClick={() => setNav("account")}
            icon={<SunIcon className="w-4 h-4" />}
          >
            Account
          </NavItem>
        </div>

        {me && (
          <div className="bg-accent-tint rounded-lg p-3 flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold text-accent-tint-fg">
              {me.pro ? "Pro plan" : "Free plan"}
            </span>
            <span className="text-[11.5px] text-accent-tint-fg/80 leading-relaxed">
              {me.pro
                ? "1 GB of storage and every premium template."
                : `${formatBytes(me.storage.remaining)} of storage left.`}
            </span>
            {!me.pro && (
              <button
                onClick={subscribe}
                disabled={subscribing}
                className="bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-fg text-[11.5px] font-semibold py-2 rounded-md transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {subscribing ? "Opening checkout…" : "See Pro"}
              </button>
            )}
          </div>
        )}
      </nav>

      {/* ---------- Content ---------- */}
      <main className="flex-1 min-w-0 overflow-y-auto p-5 sm:px-[22px] flex flex-col gap-4">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold leading-tight">
              {nav === "projects" ? "Your projects" : "Account"}
            </h1>
            <p className="text-[11.5px] text-text-tertiary mt-0.5">
              {nav === "projects"
                ? `${projects.length} design${projects.length !== 1 ? "s" : ""}`
                : me?.user.email}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {nav === "projects" && (
              <>
                <div className="relative hidden sm:block">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-ghost pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    aria-label="Search projects"
                    className="w-[200px] bg-surface-2 border border-border-default rounded-md pl-8 pr-2.5 py-[7px] text-[11.5px] placeholder:text-text-ghost outline-none focus:border-accent transition-colors duration-150 ease-standard"
                  />
                </div>
                <Link
                  href="/?new=1"
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-[11.5px] font-semibold px-3 py-2 rounded-md transition-colors duration-150 ease-standard"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  New design
                </Link>
              </>
            )}
            <span className="w-[27px] h-[27px] rounded-full bg-surface-4 text-text-secondary text-[11px] font-semibold flex items-center justify-center shrink-0">
              {initial}
            </span>
          </div>
        </header>

        {nav === "account" ? (
          <AccountPanel me={me} onSignOut={async () => { await signOut(); router.push("/"); }} />
        ) : (
          <>
            {/* Metric cards. Only two: AI-generation and device counts have no
                source on /api/me, and inventing them would be a lie. */}
            <div className="grid gap-3 sm:grid-cols-2 max-w-[720px]">
              <MetricCard label="Storage">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[17px] font-mono tabular-nums text-text-primary">
                    {me ? formatBytes(me.storage.used) : "—"}
                  </span>
                  <span className="text-[11.5px] text-text-tertiary">
                    of {me ? formatBytes(me.storage.limit) : "—"}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-4 overflow-hidden mt-2.5">
                  <div className={cx("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
                </div>
              </MetricCard>

              <MetricCard label="Plan">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[17px] font-semibold text-text-primary">
                    {me?.pro ? "Pro" : "Free"}
                  </span>
                  {!me?.pro && (
                    <button
                      onClick={subscribe}
                      disabled={subscribing}
                      className="bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-fg text-[11.5px] font-semibold px-3 py-1.5 rounded-md transition-colors duration-150 ease-standard"
                    >
                      {subscribing ? "Opening…" : "Upgrade — $10/mo"}
                    </button>
                  )}
                </div>
                <p className="text-[11.5px] text-text-tertiary mt-2">
                  {me?.pro
                    ? "Manage or cancel from your Paddle receipt email."
                    : "250 MB storage · 5 AI generations a month."}
                </p>
              </MetricCard>
            </div>

            {/* Filters */}
            {projects.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap gap-1.5">
                  {formats.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormatFilter(f)}
                      aria-pressed={formatFilter === f}
                      className={cx(
                        "text-[11.5px] px-2.5 py-1 rounded-full transition-colors duration-150 ease-standard",
                        formatFilter === f
                          ? "bg-text-primary text-surface-2 font-medium"
                          : "bg-surface-4 text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <span className="text-[11.5px] text-text-tertiary">Sorted by recent</span>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <p className="text-[11.5px] text-text-ghost py-12 text-center">Loading…</p>
            ) : (
              <div className="grid gap-[14px] grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {visible.map((p) => (
                  <div key={p.id} className="group relative flex flex-col gap-2">
                    <Link
                      href={`/?project=${p.id}`}
                      aria-label={`Open ${p.name}`}
                      className="relative block aspect-square rounded-lg bg-surface-2 border border-border-subtle shadow-raise overflow-hidden transition-all group-hover:outline-2 group-hover:outline-accent group-hover:outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    >
                      {thumbnailFormat(p) ? (
                        <DesignThumbnail
                          pages={normalizePages(p.data)}
                          format={thumbnailFormat(p)!}
                          className="w-full h-full"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono tabular-nums text-text-ghost">
                          {p.data.format?.width ?? "?"} × {p.data.format?.height ?? "?"}
                        </span>
                      )}
                      {pageCount(p) > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-full bg-surface-1/90 text-text-secondary border border-border-subtle">
                          {pageCount(p)} pages
                        </span>
                      )}
                    </Link>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFor(menuFor === p.id ? null : p.id);
                      }}
                      aria-label={`Options for ${p.name}`}
                      className="absolute top-1.5 right-1.5 w-[22px] h-[22px] rounded-[7px] bg-surface-2 border border-border-default text-text-secondary hover:text-text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 shadow-raise transition-opacity"
                    >
                      <MoreIcon className="w-3.5 h-3.5" />
                    </button>

                    {menuFor === p.id && (
                      <div className="absolute top-8 right-1.5 z-20 bg-surface-2 border border-border-default rounded-md shadow-pop py-1 min-w-[120px] animate-scale-in">
                        <Link
                          href={`/?project=${p.id}`}
                          className="block px-3 py-1.5 text-[11.5px] text-text-secondary hover:text-text-primary hover:bg-surface-4"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => del(p.id)}
                          className="w-full text-left px-3 py-1.5 text-[11.5px] text-danger hover:bg-danger-tint"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium truncate">{p.name}</p>
                      <p className="text-[10.5px] text-text-ghost">
                        {relativeDate(p.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Blank slot — always last, always available. */}
                <Link
                  href="/?new=1"
                  className="aspect-square rounded-lg border border-dashed border-border-default flex flex-col items-center justify-center gap-1.5 text-text-ghost hover:border-accent hover:text-accent transition-colors duration-150 ease-standard"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-[11.5px]">Blank</span>
                </Link>
              </div>
            )}

            {!loading && projects.length > 0 && visible.length === 0 && (
              <p className="text-[11.5px] text-text-ghost py-8 text-center">
                No projects match your filters.
              </p>
            )}
          </>
        )}
      </main>

      {/* The dashboard fires toasts too — before this, every one of them was
          dropped because <Toaster /> only existed inside the editor. */}
      <Toaster />
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-2.5 px-[10px] py-2 rounded-[9px] text-[12px] text-left transition-colors duration-150 ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? "bg-surface-2 text-text-primary font-medium shadow-raise [&_svg]:text-accent"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-4"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-ghost block mb-2">
        {label}
      </span>
      {children}
    </div>
  );
}

function AccountPanel({ me, onSignOut }: { me: Me | null; onSignOut: () => void }) {
  return (
    <div className="max-w-[520px] flex flex-col gap-3">
      <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 flex flex-col gap-3">
        <Row label="Name" value={me?.user.name || "—"} />
        <Row label="Email" value={me?.user.email || "—"} />
        <Row label="Plan" value={me?.pro ? "Pro" : "Free"} />
      </div>

      <div className="bg-surface-1 border border-border-subtle rounded-lg p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[12.5px] font-semibold">Appearance</p>
          <p className="text-[11.5px] text-text-tertiary mt-0.5">
            Auto follows your system setting.
          </p>
        </div>
        <ThemeSelect />
      </div>

      <button
        onClick={onSignOut}
        className="self-start text-[11.5px] font-medium text-danger hover:bg-danger-tint px-3 py-2 rounded-md transition-colors duration-150 ease-standard"
      >
        Sign out
      </button>

      <DangerZone isPro={Boolean(me?.pro)} />
    </div>
  );
}

/** Permanent account deletion. Collapsed until asked for, then password-gated. */
function DangerZone({ isPro }: { isPro: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    let res = await authClient.deleteUser({ password });
    // Accounts created through Google have no credential row, so the password
    // branch can't apply. better-auth then falls back to requiring a *fresh*
    // session, which a retry without the password opts into.
    if (res.error?.code === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
      res = await authClient.deleteUser({});
    }

    if (res.error) {
      setPending(false);
      setError(
        res.error.code === "INVALID_PASSWORD"
          ? "That password doesn't match."
          : res.error.code === "SESSION_EXPIRED"
            ? "For security, sign in again before deleting your account."
            : "Couldn't delete your account. Please try again."
      );
      return;
    }

    // The server is done; this browser still holds the whole account in
    // IndexedDB. Clearing it is not tidiness — see wipeLocalAccountData.
    await wipeLocalAccountData();
    router.push("/login");
  };

  if (!open) {
    return (
      <div className="border border-danger/25 rounded-lg p-4 flex items-center justify-between gap-4 mt-3">
        <div>
          <p className="text-[12.5px] font-semibold text-danger">Delete account</p>
          <p className="text-[11.5px] text-text-tertiary mt-0.5">
            Permanently erases your designs, uploads and account.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 text-[11.5px] font-medium text-danger border border-danger/30 hover:bg-danger-tint px-3 py-2 rounded-md transition-colors duration-150 ease-standard"
        >
          Delete…
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-danger/40 bg-danger-tint/40 rounded-lg p-4 flex flex-col gap-3 mt-3"
    >
      <p className="text-[12.5px] font-semibold text-danger">Delete your account?</p>
      <p className="text-[11.5px] text-text-secondary leading-relaxed">
        This cannot be undone. Your projects, uploaded images and account are erased
        immediately{isPro ? ", and your subscription is cancelled" : ""}. Export anything you
        want to keep first.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11.5px] font-medium text-text-secondary">
          Confirm your password
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-surface-3 border border-border-default rounded-md px-3 py-2 text-[13px] text-text-primary outline-none focus:border-[1.5px] focus:border-danger transition-colors duration-150 ease-standard"
        />
      </label>
      {error && (
        <p role="alert" className="text-[11.5px] text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-danger disabled:opacity-60 text-white text-[12px] font-semibold px-3 py-2 rounded-md transition-colors duration-150 ease-standard"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError(null);
          }}
          className="text-[11.5px] text-text-secondary hover:text-text-primary px-3 py-2 transition-colors duration-150 ease-standard"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11.5px] text-text-tertiary">{label}</span>
      <span className="text-[12.5px] truncate">{value}</span>
    </div>
  );
}
