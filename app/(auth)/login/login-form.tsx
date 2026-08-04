"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "../../lib/auth-client";
import { AuthCard, AuthLink, Field, GoogleButton, Note, SubmitButton } from "../../components/auth/ui";

/** Only allow same-app relative paths as redirect targets (no open redirect). */
function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export default function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const redirectTo = safeRedirect(useSearchParams().get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signIn.email({ email, password });
    setPending(false);
    if (error) {
      // Deliberately vague: don't reveal whether the address exists.
      setError("Email or password doesn't match. Try again.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to sync your license and AI credits across devices."
      footer={<>No account yet? <AuthLink href="/signup">Create one</AuthLink></>}
    >
      {googleEnabled && <GoogleButton callbackURL={redirectTo} />}
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
        <Field
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Note kind="error">{error}</Note>
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
      <p className="text-[11.5px] text-center">
        <AuthLink href="/forgot-password">Forgot your password?</AuthLink>
      </p>
    </AuthCard>
  );
}
