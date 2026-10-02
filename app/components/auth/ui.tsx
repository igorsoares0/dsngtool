"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { signIn } from "../../lib/auth-client";
import { POST_AUTH_PATH } from "../../lib/routes";
import { btnPrimary } from "../ui/buttons";
import { cx } from "../ui/cx";

/** Create account | Log in, as text tabs over a hairline. */
function AuthTabs({ active }: { active: "signup" | "login" }) {
  const tab = (key: "signup" | "login", href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cx(
        "py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
        active === key
          ? "font-bold text-text-primary shadow-[inset_0_-2px_0_var(--text-primary)]"
          : "text-text-tertiary hover:text-text-primary"
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav className="grid grid-cols-2 border-b border-border-default text-[14px]" aria-label="Account">
      {tab("signup", "/signup", "Create account")}
      {tab("login", "/login", "Log in")}
    </nav>
  );
}

export function AuthCard({
  title,
  subtitle,
  tabs,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  /** Shows the Create account | Log in tabs, with this one active. */
  tabs?: "signup" | "login";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col gap-[26px]">
      {tabs && <AuthTabs active={tabs} />}
      <div className="flex flex-col gap-2.5">
        <h1 className="text-[36px] sm:text-[44px] leading-[0.92] font-black tracking-[-0.03em] text-text-primary" style={{ fontStretch: "122%" }}>
          {title}
        </h1>
        {subtitle && <p className="text-[14px] text-text-secondary leading-relaxed">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
      {footer && <p className="text-[12.5px] text-text-tertiary leading-relaxed">{footer}</p>}
    </div>
  );
}

/**
 * Mono label over a 44px field. Focus is a 1.5px selection ring; `error`
 * swaps it for a danger ring with an inline mono hint. Password fields get a
 * SHOW / HIDE toggle.
 */
export function Field({
  label,
  error,
  type,
  ...props
}: { label: string; error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="flex flex-col gap-[5px]">
      <label htmlFor={id} className="font-mono text-[10.5px] font-medium uppercase text-text-secondary">
        {label}
      </label>
      <div
        className={cx(
          "h-11 flex items-center bg-surface-0 transition-shadow",
          error
            ? "shadow-[inset_0_0_0_1.5px_var(--danger)]"
            : "shadow-[inset_0_0_0_1px_var(--border-default)] focus-within:bg-surface-1 focus-within:shadow-[inset_0_0_0_1.5px_var(--selection)]"
        )}
      >
        <input
          id={id}
          type={isPassword && shown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...props}
          className="flex-1 min-w-0 h-full px-3 bg-transparent text-[14px] text-text-primary placeholder:text-text-ghost outline-none"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Hide password" : "Show password"}
            className="px-3 h-full font-mono text-[11px] text-text-tertiary hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
          >
            {shown ? "HIDE" : "SHOW"}
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-err`} className="font-mono text-[10.5px] uppercase text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="submit" disabled={pending} className={cx(btnPrimary, "h-12 mt-3 text-[14px]")}>
      {pending ? "Just a sec…" : children}
    </button>
  );
}

export function Note({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  if (!children) return null;
  const tone =
    kind === "error"
      ? "text-text-primary bg-danger-tint border-danger"
      : "text-text-primary bg-surface-3 border-success";
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`text-[13px] leading-[1.45] border-l-[3px] px-3 py-2.5 ${tone}`}
    >
      {children}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-text-primary underline underline-offset-[3px] decoration-border-default hover:decoration-text-primary transition-colors"
    >
      {children}
    </Link>
  );
}

/** By continuing you agree… — the legal pages live on the marketing site. */
export function LegalLine() {
  return (
    <>
      By continuing you agree to the <AuthLink href="https://getmodo.pro/terms">Terms</AuthLink> and{" "}
      <AuthLink href="https://getmodo.pro/privacy">Privacy Policy</AuthLink>.
    </>
  );
}

export function GoogleButton({ callbackURL = POST_AUTH_PATH }: { callbackURL?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          // Full-page redirect to Google; no need to reset pending on success.
          await signIn.social({ provider: "google", callbackURL });
          setPending(false);
        }}
        className="h-[46px] flex items-center justify-center gap-2.5 border border-border-default text-text-primary text-[14px] font-semibold hover:border-text-primary hover:bg-surface-3 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
      >
        <GoogleIcon />
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 font-mono text-[10.5px] text-text-tertiary">
        <div className="h-px flex-1 bg-border-default" />
        OR WITH EMAIL
        <div className="h-px flex-1 bg-border-default" />
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
