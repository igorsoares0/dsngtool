"use client";

import Link from "next/link";
import { signIn } from "../../lib/auth-client";
import { useState } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-surface-2 border border-border-default rounded-lg shadow-modal p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[16px] font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="text-[11.5px] text-text-secondary leading-relaxed">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <p className="text-center text-[11.5px] text-text-ghost mt-4">{footer}</p>}
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-medium text-text-secondary">{label}</span>
      <input
        {...props}
        className="bg-surface-3 border border-border-default rounded-md px-3 py-2 text-[13px] text-text-primary placeholder:text-text-ghost outline-none focus:border-[1.5px] focus:border-accent focus:bg-surface-2 transition-colors duration-150 ease-standard"
      />
    </label>
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
    <button
      type="submit"
      disabled={pending}
      className="bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-fg text-[13px] font-semibold py-2.5 rounded-md transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {pending ? "Just a sec…" : children}
    </button>
  );
}

export function Note({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  if (!children) return null;
  const tone =
    kind === "error"
      ? "text-danger bg-danger-tint border-danger/25"
      : "text-success bg-success/10 border-success/25";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`text-[11.5px] border rounded-md px-3 py-2 ${tone}`}>
      {children}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-text-secondary hover:text-accent transition-colors duration-150 ease-standard">
      {children}
    </Link>
  );
}

export function GoogleButton({ callbackURL = "/" }: { callbackURL?: string }) {
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
        className="flex items-center justify-center gap-2 bg-surface-3 hover:bg-surface-4 border border-border-default text-text-primary text-[13px] font-medium py-2.5 rounded-md transition-colors duration-150 ease-standard disabled:opacity-60"
      >
        <GoogleIcon />
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 text-[11.5px] text-text-ghost">
        <div className="h-px flex-1 bg-border-subtle" />
        or
        <div className="h-px flex-1 bg-border-subtle" />
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
