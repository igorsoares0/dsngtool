"use client";

import { useEffect } from "react";
import { IS_DESKTOP } from "../lib/platform";

// Registers the service worker once on the client. Kept as a tiny client
// component so the root layout can stay a server component.
export default function SwRegister() {
  useEffect(() => {
    // The desktop build ships its assets inside the bundle and serves them off
    // a custom protocol, so an app-shell cache buys nothing and would only add
    // a second, staler copy that outlives an update.
    if (IS_DESKTOP) return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration can fail on unsupported/insecure contexts — ignore.
    });
  }, []);

  return null;
}
