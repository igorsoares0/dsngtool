"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { wipeLocalAccountData } from "../../lib/project-sync";
import { POST_AUTH_PATH } from "../../lib/routes";
import { useEntitlementStore } from "../../store/entitlement-store";
import { SegmentBars, formatBytes, storageLevel } from "../editor/storage-meter";
import ThemeSelect from "../ui/theme-select";
import SectionLabel from "../ui/section-label";
import { btnPrimary } from "../ui/buttons";
import { cx } from "../ui/cx";
import type { AuthMethods, Me } from "./types";

/** Set on the URL when we send someone off to re-authenticate mid-deletion, so
 *  the trip back reopens the confirmation instead of the default tab. */
export const RESUME_DELETE_PARAM = "delete-account";

const SECTIONS = [
  { code: "A", id: "acc-profile", label: "Profile" },
  { code: "B", id: "acc-plan", label: "Plan & usage" },
  { code: "C", id: "acc-danger", label: "Danger zone" },
] as const;

function resetLabel(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `RESETS ${d.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase()}`;
}

function ProfileRow({ k, children, action }: { k: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] sm:grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 min-h-[52px] border-t border-border-default">
      <span className="font-mono text-[10.5px] font-medium text-text-tertiary">{k}</span>
      <span className="text-[14.5px] truncate">{children}</span>
      <span>{action}</span>
    </div>
  );
}

export default function AccountView({
  me,
  projectCount,
  resumeDelete,
}: {
  me: Me | null;
  projectCount: number;
  resumeDelete: boolean;
}) {
  const [active, setActive] = useState<string>(resumeDelete ? "acc-danger" : "acc-profile");
  const pro = useEntitlementStore((s) => s.pro);
  const storage = useEntitlementStore((s) => s.storage);
  const ai = useEntitlementStore((s) => s.ai);
  const openUpgrade = useEntitlementStore((s) => s.openModal);

  const providers = me?.auth.providers ?? [];
  const providerName = providers[0] ? providers[0].charAt(0).toUpperCase() + providers[0].slice(1) : null;
  const meter = storage && storage.limit > 0 ? storageLevel(storage) : null;

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      <nav className="hidden md:flex flex-col border-r border-border-default py-[34px]" aria-label="Account sections">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => setActive(s.id)}
            className={cx(
              "flex items-center gap-3 h-10 px-6 text-[13.5px] transition-colors",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
              active === s.id
                ? "font-bold text-text-primary shadow-[inset_3px_0_0_var(--text-primary)]"
                : "font-medium text-text-secondary hover:text-text-primary"
            )}
          >
            <span className="font-mono text-[10.5px] font-medium text-text-tertiary">{s.code}</span>
            {s.label}
          </a>
        ))}
      </nav>

      <div className="px-5 sm:px-12 py-[34px] flex flex-col gap-[30px] max-w-[1100px]">
        <h1 className="text-[56px] sm:text-[72px] leading-[0.82] font-black font-wide tracking-[-0.04em]">Account</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-border-strong pt-6">
          {/* A — Profile */}
          <section id="acc-profile" className="flex flex-col scroll-mt-6">
            <div className="pb-3">
              <SectionLabel code="A">Profile</SectionLabel>
            </div>
            <ProfileRow k="NAME">{me?.user.name || "—"}</ProfileRow>
            <ProfileRow k="EMAIL">{me?.user.email || "—"}</ProfileRow>
            <ProfileRow
              k="PASSWORD"
              action={
                me?.auth.hasPassword ? (
                  <Link
                    href="/forgot-password"
                    className="text-[13px] font-semibold underline decoration-border-default underline-offset-[3px] hover:decoration-text-primary"
                  >
                    Reset
                  </Link>
                ) : undefined
              }
            >
              {me?.auth.hasPassword ? (
                "••••••••"
              ) : (
                <span className="text-text-secondary">Signed in with {providerName ?? "a linked account"}</span>
              )}
            </ProfileRow>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)] items-center gap-3 min-h-[52px] border-y border-border-default">
              <span className="font-mono text-[10.5px] font-medium text-text-tertiary">THEME</span>
              <ThemeSelect className="w-max" />
            </div>
          </section>

          {/* B — Plan & usage */}
          <section id="acc-plan" className="flex flex-col gap-3.5 scroll-mt-6">
            <SectionLabel code="B">Plan &amp; usage</SectionLabel>
            <div className="border border-border-strong bg-surface-1 flex flex-col">
              <div className="flex justify-between items-baseline px-5 py-[18px] border-b border-border-default">
                <span className="text-[28px] font-black" style={{ fontStretch: "120%" }}>
                  {pro ? "Pro" : "Free"}
                </span>
                <span className="font-mono text-[11px] text-text-tertiary">{resetLabel(ai?.resetsAt)}</span>
              </div>
              {storage && meter && (
                <div className="px-5 py-4 flex flex-col gap-2 border-b border-border-default">
                  <div className="flex justify-between">
                    <span className="font-mono text-[10.5px] font-medium text-text-tertiary">STORAGE</span>
                    <span
                      className={cx(
                        "font-mono text-[11px] font-medium tabular-nums",
                        meter.level === "full" ? "text-danger" : meter.level === "warn" ? "text-warning" : "text-text-primary"
                      )}
                    >
                      {formatBytes(storage.used)} / {formatBytes(storage.limit)}
                    </span>
                  </div>
                  <SegmentBars
                    count={20}
                    filled={Math.round((meter.pct / 100) * 20)}
                    onClass={meter.level === "full" ? "bg-danger" : meter.level === "warn" ? "bg-warning" : "bg-text-primary"}
                  />
                </div>
              )}
              {ai && (
                <div className="px-5 py-4 flex flex-col gap-2 border-b border-border-default">
                  <div className="flex justify-between">
                    <span className="font-mono text-[10.5px] font-medium text-text-tertiary">AI BRIEFS</span>
                    <span className={cx("font-mono text-[11px] font-medium tabular-nums", ai.used >= ai.limit && "text-danger")}>
                      {ai.used} / {ai.limit}
                    </span>
                  </div>
                  {ai.limit <= 20 ? (
                    <SegmentBars count={ai.limit} filled={ai.used} onClass="bg-text-tertiary" offClass="bg-ai" />
                  ) : (
                    <SegmentBars
                      count={20}
                      filled={Math.round((ai.used / ai.limit) * 20)}
                      onClass="bg-text-tertiary"
                      offClass="bg-ai"
                    />
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-[13px] leading-[1.45] text-text-secondary">
                  {pro
                    ? "Manage or cancel your subscription from the receipt email Paddle sent you."
                    : "Pro: 1 GB of storage, 100 AI briefs a month and every premium template."}
                </span>
                {!pro && (
                  <button type="button" onClick={() => openUpgrade()} className={cx(btnPrimary, "px-4 py-2.5 text-[13px] shrink-0")}>
                    Go Pro · $10
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* C — Danger zone */}
        <section id="acc-danger" className="scroll-mt-6 flex flex-col gap-3">
          <SectionLabel code="C">Danger zone</SectionLabel>
          <DangerZone
            isPro={pro}
            auth={me?.auth ?? null}
            autoOpen={resumeDelete}
            projectCount={projectCount}
          />
        </section>
      </div>
    </div>
  );
}

const field =
  "h-11 bg-surface-1 border border-border-default px-3 text-[14px] text-text-primary outline-none focus:border-transparent focus:shadow-[inset_0_0_0_1.5px_var(--danger)]";

/** Permanent account deletion. Collapsed until asked for, then gated on
 *  whatever proof this account can actually give: a password when one exists,
 *  a recently established session when it doesn't. */
function DangerZone({
  isPro,
  auth,
  autoOpen,
  projectCount,
}: {
  isPro: boolean;
  auth: AuthMethods | null;
  autoOpen: boolean;
  projectCount: number;
}) {
  const router = useRouter();
  // null = nobody has touched the section yet, so it follows `autoOpen`.
  // Once the user opens or dismisses it, their choice wins.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  // An account created through Google has no `credential` row and therefore no
  // password to confirm with. Asking for one anyway is not a cosmetic problem:
  // a `required` password field that the user cannot possibly fill is a dead
  // end, and deletion becomes unreachable for them.
  const hasPassword = auth?.hasPassword ?? false;
  const provider = auth?.providers[0] ?? null;
  const providerName = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : null;
  const confirmed = confirmation.trim().toUpperCase() === "DELETE";

  // Gated on `me` having answered: opening early would render the passwordless
  // form to someone who does have a password.
  const open = toggled ?? Boolean(autoOpen && auth);

  const close = () => {
    setToggled(false);
    setPassword("");
    setConfirmation("");
    setError(null);
    setStale(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    // Send the password only when there is one — an empty string would just
    // come back INVALID_PASSWORD. Without it better-auth accepts a *fresh*
    // session instead. The retry is insurance against a stale `me`: the
    // server, not this component, decides which proof counts.
    let res = hasPassword ? await authClient.deleteUser({ password }) : await authClient.deleteUser({});
    if (res.error?.code === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
      res = await authClient.deleteUser({});
    }

    if (res.error) {
      setPending(false);
      // Passwordless deletion requires a session younger than better-auth's
      // freshAge (24h by default), so this is the ordinary outcome for anyone
      // who signed in with Google yesterday — not an error worth a dead end.
      if (res.error.code === "SESSION_EXPIRED") {
        setStale(true);
        return;
      }
      setError(
        res.error.code === "INVALID_PASSWORD"
          ? "That password doesn't match."
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
      <div className="flex items-center justify-between gap-5 px-5 py-4 border border-border-default">
        <div className="flex flex-col gap-[3px]">
          <span className="text-[14px] font-bold text-danger">Delete account</span>
          <span className="text-[13px] text-text-secondary">
            Removes {projectCount === 1 ? "your project" : `all ${projectCount} projects`} and uploads. This can&apos;t be undone.
          </span>
        </div>
        <button
          onClick={() => setToggled(true)}
          disabled={!auth}
          className="shrink-0 border border-danger text-danger text-[13px] font-bold px-3.5 py-2 hover:bg-danger-tint disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
        >
          Delete…
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-l-[3px] border-danger bg-danger-tint px-5 py-4 flex flex-col gap-3 max-w-[640px]">
      <p className="text-[15px] font-extrabold text-danger" style={{ fontStretch: "110%" }}>
        Delete your account?
      </p>
      <p className="text-[13px] text-text-secondary leading-relaxed">
        This cannot be undone. Your projects, uploaded images and account are erased immediately
        {isPro ? ", and your subscription is cancelled" : ""}. Export anything you want to keep first.
      </p>

      {stale ? (
        <div className="flex flex-col gap-2.5">
          <p role="alert" className="text-[13px] text-text-secondary leading-relaxed">
            For security this needs a recent sign-in.{" "}
            {providerName
              ? `Confirm with ${providerName} and you'll come straight back here.`
              : "Sign out, sign in again, then delete."}
          </p>
          {provider && (
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                // Full-page redirect out to the provider; the callback lands
                // back on this panel with the confirmation already open.
                await authClient.signIn.social({
                  provider,
                  callbackURL: `${POST_AUTH_PATH}?${RESUME_DELETE_PARAM}=1`,
                });
                setPending(false);
              }}
              className="self-start border border-border-strong bg-surface-1 text-text-primary text-[13px] font-semibold px-3.5 h-10 hover:bg-surface-3 disabled:opacity-60"
            >
              {pending ? "Redirecting…" : `Continue with ${providerName}`}
            </button>
          )}
        </div>
      ) : hasPassword ? (
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10.5px] font-medium uppercase text-text-secondary">Confirm your password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-text-secondary">
            You sign in with {providerName ?? "a linked account"}, so there&apos;s no password to confirm. Type{" "}
            <span className="font-mono font-medium text-text-primary">DELETE</span> instead.
          </span>
          <input
            type="text"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Type DELETE to confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={cx(field, "font-mono uppercase")}
          />
        </label>
      )}

      {error && (
        <p role="alert" className="font-mono text-[10.5px] uppercase text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {!stale && (
          <button
            type="submit"
            disabled={pending || (!hasPassword && !confirmed)}
            className="h-10 px-4 bg-danger text-surface-1 text-[13px] font-extrabold uppercase tracking-[0.02em] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
            style={{ fontStretch: "112%" }}
          >
            {pending ? "Deleting…" : "Delete my account"}
          </button>
        )}
        <button
          type="button"
          onClick={close}
          className="h-10 px-3.5 text-[13px] font-semibold text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
