"use client";

import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import { AuthCard, AuthLink, Field, Note, SubmitButton } from "../../components/auth/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (error) {
      setError("Something went wrong. Please try again.");
      return;
    }
    // Always show success — never reveal whether an account exists.
    setSent(true);
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link."}
      footer={<AuthLink href="/login">Back to sign in</AuthLink>}
    >
      {sent ? (
        <Note kind="success">
          If an account exists for {email}, a reset link is on its way. Check your inbox.
        </Note>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Note kind="error">{error}</Note>
          <SubmitButton pending={pending}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
