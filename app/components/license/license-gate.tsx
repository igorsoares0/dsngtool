"use client";

import { useEffect } from "react";
import { useLicenseStore } from "../../store/license-store";
import { usePlanStore } from "../../store/plan-store";
import UpgradeModal from "./upgrade-modal";

/**
 * Loads the license and the free plan's usage for the page it wraps, and hosts
 * the upgrade dialog. It no longer blocks anything: without a license the app
 * runs on the free plan (see app/store/plan-store.ts), and each locked feature
 * opens the dialog itself.
 *
 * The license check is local (signature) and so works offline. A best-effort
 * refund check runs at most daily, and again when the device comes back online.
 * All of this is client-side and can be bypassed with DevTools — an accepted
 * trade for a lifetime-deal app that has to work with no server.
 */
export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const hydrate = useLicenseStore((s) => s.hydrate);
  const checkStatus = useLicenseStore((s) => s.checkStatus);
  const loadUsage = usePlanStore((s) => s.loadUsage);

  useEffect(() => {
    void hydrate().then(() => checkStatus());
    void loadUsage();
    const onOnline = () => void checkStatus();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [hydrate, checkStatus, loadUsage]);

  return (
    <>
      {children}
      <UpgradeModal />
    </>
  );
}
