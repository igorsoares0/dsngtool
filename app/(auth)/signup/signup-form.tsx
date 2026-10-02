"use client";

import { useState } from "react";
import { signUp } from "../../lib/auth-client";
import { POST_AUTH_PATH } from "../../lib/routes";
import { AuthCard, AuthLink, Field, GoogleButton, LegalLine, Note, SubmitButton } from "../../components/auth/ui";

export default function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Field-level: shown under the password once a too-short value is submitted,
  // and cleared as soon as it is long enough.
  const [pwTooShort, setPwTooShort] = useState(false);
  const [pending, setPending] = useState(false);
  // Email verification is required, so a successful sign-up produces no session
  // — there is nowhere to navigate to. The form hands off to the inbox instead.
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setPwTooShort(true);
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await signUp.email({
      name,
      email,
      password,
      // Where the verification link lands. Verifying signs them in, so this is
      // the first screen of the actual app.
      callbackURL: POST_AUTH_PATH,
    });
    setPending(false);
    if (error) {
      setError(
        error.message?.toLowerCase().includes("exist")
          ? "An account with this email already exists. Try signing in."
          : "Couldn't create your account. Please try again."
      );
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard
        title="Check your inbox."
        footer={<>Wrong address? <AuthLink href="/signup">Start over</AuthLink></>}
      >
        <Note kind="success">
          We sent a confirmation link to {email}. Click it and you&apos;ll be signed in
          automatically.
        </Note>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Nothing in your inbox? Check spam — or just{" "}
          <AuthLink href="/login">try signing in</AuthLink>, and we&apos;ll send a fresh link.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard tabs="signup" title="Make your first post in a minute." footer={<LegalLine />}>
      {googleEnabled && <GoogleButton />}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field
          label="Name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          error={pwTooShort ? "At least 8 characters" : null}
          onChange={(e) => {
            setPassword(e.target.value);
            if (e.target.value.length >= 8) setPwTooShort(false);
          }}
        />
        <Note kind="error">{error}</Note>
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
