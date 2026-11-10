"use client";

import { useEffect } from "react";
import { useLicenseStore } from "../../store/license-store";
import { toast } from "../../store/toast-store";
import ActivationScreen from "./activation-screen";

/**
 * Renders its children only on a device with a valid license; otherwise the
 * activation screen. The check is local (signature) and so works offline. A
 * best-effort refund check runs at most daily, and again when the device comes
 * back online.
 *
 * This is a client-side gate and can be bypassed with DevTools — an accepted
 * trade for a lifetime-deal app that has to work with no server.
 */
export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const status = useLicenseStore((s) => s.status);
  const hydrate = useLicenseStore((s) => s.hydrate);
  const checkStatus = useLicenseStore((s) => s.checkStatus);

  useEffect(() => {
    void hydrate().then(() => checkStatus());
    const onOnline = () => void checkStatus();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [hydrate, checkStatus]);

  // Losing the license mid-session (refund caught by the daily check).
  useEffect(
    () =>
      useLicenseStore.subscribe((s, prev) => {
        if (prev.status === "active" && s.status === "none") {
          toast.error("This license is no longer active on this device.", 8000);
        }
      }),
    []
  );

  if (status === "loading") return <div className="h-full bg-surface-0" />;
  if (status === "none") return <ActivationScreen />;
  return <>{children}</>;
}
