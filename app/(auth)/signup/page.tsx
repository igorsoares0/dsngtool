import { isGoogleEnabled } from "../../lib/server/auth";
import SignupForm from "./signup-form";

export const metadata = { title: "Create account — Modo" };

export default function SignupPage() {
  return <SignupForm googleEnabled={isGoogleEnabled} />;
}
