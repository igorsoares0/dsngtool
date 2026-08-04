"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "../../lib/auth-client";
import { POST_AUTH_PATH } from "../../lib/routes";
import { AuthCard, AuthLink, Field, GoogleButton, Note, SubmitButton } from "../../components/auth/ui";

/** Only allow same-app relative paths as redirect targets (no open redirect). */
function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return POST_AUTH_PATH;
}

export default function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const redirectTo = safeRedirect(useSearchParams().get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unverified, setUnverified] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signIn.email({ email, password, callbackURL: redirectTo });
    setPending(false);
    if (error) {
      // The unverified case is the one exception to the vague message below:
      // the credentials were correct, so saying "email or password doesn't
      // match" would send the user off resetting a password that works fine.
      // Nothing is leaked by being specific — they just proved the password.
      // better-auth has already re-sent the link by this point (sendOnSignIn).
      if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) {
        setUnverified(true);
        return;
      }
      // Deliberately vague: don't reveal whether the address exists.
      setError("Email or password doesn't match. Try again.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  if (unverified) {
    return (
      <AuthCard
        title="Confirm your email"
        footer={<>Wrong address? <AuthLink href="/signup">Create an account</AuthLink></>}
      >
        <Note kind="success">
          Your account isn&apos;t confirmed yet. We just sent a fresh link to {email} — click it
          and you&apos;ll be signed in.
        </Note>
        <button
          type="button"
          onClick={() => setUnverified(false)}
          className="text-[11.5px] text-text-secondary hover:text-text-primary transition-colors duration-150 ease-standard"
        >
          Back to sign in
        </button>
      </AuthCard>
    );
  }

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
