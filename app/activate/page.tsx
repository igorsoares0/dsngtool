"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLicenseStore } from "../store/license-store";
import ActivationScreen, { URL_ERRORS } from "../components/license/activation-screen";

/**
 * Landing page for one-click activation links (license email, AppSumo
 * redeem). The key travels in the fragment — `/activate#key=MODO-…` — so it
 * never reaches a server log. Once active, continue to the dashboard.
 */
export default function ActivatePage() {
  const router = useRouter();
  const status = useLicenseStore((s) => s.status);
  const hydrate = useLicenseStore((s) => s.hydrate);
  const [intent, setIntent] = useState<{ key: string | null; error: string | null } | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const errorCode = query.get("error");
    // Read once, then scrub the key out of the address bar and history.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntent({ key: hash.get("key"), error: errorCode ? URL_ERRORS[errorCode] ?? null : null });
    window.history.replaceState(null, "", window.location.pathname);
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === "active") router.replace("/dashboard");
  }, [status, router]);

  if (!intent || status === "loading" || status === "active") {
    return <div className="h-full bg-surface-0" />;
  }
  return <ActivationScreen initialKey={intent.key} initialError={intent.error} />;
}
