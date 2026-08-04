"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "../../lib/auth-client";
import { POST_AUTH_PATH } from "../../lib/routes";
import { AuthCard, AuthLink, Field, GoogleButton, Note, SubmitButton } from "../../components/auth/ui";

export default function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await signUp.email({ name, email, password });
    setPending(false);
    if (error) {
      setError(
        error.message?.toLowerCase().includes("exist")
          ? "An account with this email already exists. Try signing in."
          : "Couldn't create your account. Please try again."
      );
      return;
    }
    router.push(POST_AUTH_PATH);
    router.refresh();
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Keep your projects, license and AI credits with you on any device."
      footer={<>Already have an account? <AuthLink href="/login">Sign in</AuthLink></>}
    >
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
          onChange={(e) => setPassword(e.target.value)}
        />
        <Note kind="error">{error}</Note>
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
