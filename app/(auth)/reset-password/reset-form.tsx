"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { AuthCard, AuthLink, Field, Note, SubmitButton } from "../../components/auth/ui";

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  // The email link redirects here as /reset-password?token=...
  const token = params.get("token");
  const invalidLink = params.get("error") === "INVALID_TOKEN";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      setError("This link is invalid or has expired. Request a new one.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  };

  if (invalidLink || (!token && !done)) {
    return (
      <AuthCard title="Link expired" footer={<AuthLink href="/forgot-password">Request a new link</AuthLink>}>
        <Note kind="error">This reset link is invalid or has expired.</Note>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" footer={<AuthLink href="/login">Back to sign in</AuthLink>}>
      {done ? (
        <Note kind="success">Password updated — taking you to sign in…</Note>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            label="Confirm password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Note kind="error">{error}</Note>
          <SubmitButton pending={pending}>Update password</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
