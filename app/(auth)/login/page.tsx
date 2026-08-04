import { Suspense } from "react";
import { isGoogleEnabled } from "../../lib/server/auth";
import LoginForm from "./login-form";

export const metadata = { title: "Sign in — Modo" };

export default function LoginPage() {
  // LoginForm reads `?redirect=` via useSearchParams, which opts the route into
  // client rendering unless it sits under a boundary (as reset-password does).
  return (
    <Suspense>
      <LoginForm googleEnabled={isGoogleEnabled} />
    </Suspense>
  );
}
