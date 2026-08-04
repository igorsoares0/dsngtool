import { Suspense } from "react";
import ResetPasswordForm from "./reset-form";

export const metadata = { title: "Set a new password — Modo" };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
